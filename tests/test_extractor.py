"""Module 2 gate: extraction (live Gemini calls, cached in .llm_cache/, so they also run with LLM_OFFLINE=1) and merge
(hand-built bound assertions, no LLM)."""
from datetime import UTC, datetime
from pathlib import Path

import pytest

from adapters import load_email, load_teams
from contracts.models import (AppliesTo, Assertion, Candidate, Case, Evidence, Topology, Trigger)
from extractor import extract
from extractor.merge import dispute_pairs, key, merge

ROOT = Path(__file__).parent.parent
FIX = Path(__file__).parent / "fixtures" / "extractor"
TOPO = Topology.model_validate_json((ROOT / "data" / "topology.json").read_text(encoding="utf-8"))
RECORDED = datetime(2026, 11, 6, tzinfo=UTC)


@pytest.fixture(scope="module")
def chat():
    msgs = load_teams(ROOT / "data" / "elisa_examples" / "teams_chat.json")
    return msgs, extract(msgs, recorded_at=RECORDED)


def run(path):
    return extract(load_teams(path) if path.suffix == ".json" else load_email(path), recorded_at=RECORDED)


# ---------- extraction ----------

def test_chat(chat):
    msgs, out = chat
    assert out is not None
    a, rule = out
    assert a.action == "interface.bounce"
    assert "node.reboot" in a.avoid
    assert a.evidence.said_by == "Erkki Expert" and a.evidence.said_by_role == "expert"
    assert rule.condition_is_relative is True and rule.hedged is False
    assert a.evidence.excerpt in msgs[7].text or a.evidence.excerpt in "\n".join(m.text for m in msgs)
    assert rule.outcome == "recovered"
    assert a.trust == "verified_by_outcome"
    assert a.trigger.kind == "incident" and a.trigger.event == "sfp_replaced"
    assert {"link_up", "counters_zero"} <= set(a.trigger.symptoms)
    assert a.evidence.sources == ["teams:thread-001"]
    # unbound shape for the binder
    assert a.id == "CA-0000" and a.applies_to.entity_type == "transmission_node"
    assert a.applies_to.candidates == [] and a.applies_to.decided is None and a.evidence.cases == []
    assert a.status == "open" and a.recorded_at == RECORDED and a.valid_from == msgs[0].timestamp and a.valid_to is None


def test_email():
    a, rule = run(ROOT / "data" / "elisa_examples" / "email.txt")
    assert a.action == "interface.bounce"
    assert {"node.reboot", "sfp.replace"} & set(a.avoid)
    assert rule.outcome == "unknown"
    assert a.trust == "stated"
    assert a.evidence.sources == ["email:email-001"]


def test_chitchat_is_none():
    assert run(FIX / "chitchat.json") is None


def test_reworded_same_key(chat):
    a, _ = run(FIX / "reworded.json")
    assert a.action == "interface.bounce"
    assert key(a) == key(chat[1][0])


def test_key_moved_first_hand_is_stated():
    a, rule = run(FIX / "key_moved.json")
    assert a.action == "site.access_key" and a.trigger.kind == "workflow" and a.applies_to.entity_type == "site"
    assert rule.first_hand is True and a.evidence.said_by_role == "field_engineer"
    assert a.trust == "stated"


def test_key_hedged_is_hunch():
    a, rule = run(FIX / "key_hedged.json")
    assert a.action == "site.access_key"
    assert rule.hedged is True and a.trust == "hunch"


# ---------- merge (hand-built bound assertions) ----------

def cand(predicate, edge="closed"):
    return Candidate(predicate=predicate, edge=edge, support=1, against=0, basis="test")


def bounce(entity="TRN-042", at="2026-11-01T09:25:00+02:00", outcome="recovered", source="teams:thread-001",
           trust="verified_by_outcome", action="interface.bounce", text="disable the interface, wait, enable it"):
    return Assertion(
        id="CA-0000",
        trigger=Trigger(kind="incident", event="sfp_replaced", symptoms=["link_up", "counters_zero", "optics_normal"]),
        applies_to=AppliesTo(entity_type="transmission_node", decided=None, candidates=[
            cand("install_year <= 2019", "open"), cand("model == 'TX-200'"), cand("firmware == '4.1'"),
            cand("site == 'OULU-07'"), cand("region == 'north'")]),
        action=action, action_text=text, avoid=["node.reboot"],
        evidence=Evidence(cases=[Case(entity=entity, at=at, outcome=outcome)], sources=[source],
                          excerpt="x", said_by_role="expert", said_by="Erkki Expert"),
        trust=trust, status="open", questions_asked=[], supersedes=None, superseded_by=None,
        recorded_at=RECORDED, valid_from=at, valid_to=None, valid_while=None)


def barrier(site="OULU-03", text="at the neighbouring farm, ask for Mäkelä", at="2026-10-02T10:00:00+02:00",
            trust="stated", source="email:email-barrier"):
    return Assertion(
        id="CA-0000",
        trigger=Trigger(kind="workflow", event="dispatch_created", symptoms=[]),
        applies_to=AppliesTo(entity_type="site", decided=None, candidates=[cand(f"site == '{site}'")]),
        action="site.access_key", action_text=text, avoid=[],
        evidence=Evidence(cases=[Case(entity=site, at=at, outcome=None)], sources=[source],
                          excerpt="x", said_by_role="field_engineer", said_by="Veikko Vikkelä"),
        trust=trust, status="open", questions_asked=[], supersedes=None, superseded_by=None,
        recorded_at=RECORDED, valid_from=at, valid_to=None, valid_while=None)


def preds(a):
    return {c.predicate: c for c in a.applies_to.candidates}


def test_ids_assigned_in_order():
    s = merge([], bounce(), TOPO)
    s = merge(s, barrier(), TOPO)
    assert [a.id for a in s] == ["CA-0001", "CA-0002"]


def test_same_key_two_cases_two_sources_and_vote_on_tx250():
    s = merge(merge([], bounce(), TOPO), bounce(entity="TRN-063", at="2026-11-05T13:47:00+02:00",
                                                 source="teams:thread-reworded"), TOPO)
    assert len(s) == 1
    a = s[0]
    assert len(a.evidence.cases) == 2
    assert a.evidence.sources == ["teams:thread-001", "teams:thread-reworded"]
    c = preds(a)
    assert (c["model == 'TX-200'"].support, c["model == 'TX-200'"].against) == (1, 1)
    assert (c["install_year <= 2019"].support, c["install_year <= 2019"].against) == (2, 0)
    assert c["site == 'OULU-07'"].against == 1 and c["region == 'north'"].support == 2


@pytest.mark.parametrize("order", ["chat_first", "email_first"])
def test_chat_and_email_same_day_one_case(order):
    chat_a = bounce()
    email_a = bounce(at="2026-11-01T10:00:00+02:00", outcome=None, source="email:email-001", trust="stated")
    first, second = (chat_a, email_a) if order == "chat_first" else (email_a, chat_a)
    s = merge(merge([], first, TOPO), second, TOPO)
    assert len(s) == 1
    a = s[0]
    assert len(a.evidence.cases) == 1 and a.evidence.cases[0].outcome == "recovered"
    assert set(a.evidence.sources) == {"teams:thread-001", "email:email-001"}
    assert a.trust == "verified_by_outcome"
    assert all(c.support == 1 and c.against == 0 for c in a.applies_to.candidates)


def test_failed_outcome_sets_review():
    s = merge(merge([], bounce(), TOPO), bounce(entity="TRN-087", at="2026-11-07T10:00:00+02:00", outcome="failed",
                                                 source="teams:thread-x", trust="stated"), TOPO)
    a = s[0]
    assert a.status == "review"
    c = preds(a)
    for held in ("install_year <= 2019", "model == 'TX-200'", "firmware == '4.1'", "region == 'north'"):
        assert c[held].against == 1 and c[held].support == 1
    assert c["site == 'OULU-07'"].against == 0  # failed for TRN-087, so a failed outcome says nothing about it


def test_failed_outcome_same_day_duplicate_sets_review():
    s = merge(merge([], bounce(outcome=None, trust="stated"), TOPO),
              bounce(at="2026-11-01T10:00:00+02:00", outcome="failed", source="email:email-001", trust="stated"), TOPO)
    a = s[0]
    assert a.evidence.cases[0].outcome == "failed" and a.status == "review"


def test_same_trigger_different_action_disputed():
    s = merge(merge([], bounce(), TOPO), bounce(entity="TRN-087", at="2026-11-07T10:00:00+02:00",
                                                 action="node.reboot", text="reboot the unit", trust="stated"), TOPO)
    assert len(s) == 2 and [a.status for a in s] == ["disputed", "disputed"]
    assert dispute_pairs(s) == [("CA-0001", "CA-0002")]


def test_open_candidate_raised_by_recovered_2020_unit():
    s = merge(merge([], bounce(), TOPO), bounce(entity="TRN-120", at="2026-11-07T10:00:00+02:00",
                                                 source="teams:thread-y"), TOPO)
    c = preds(s[0])
    assert "install_year <= 2019" not in c
    raised = c["install_year <= 2020"]
    assert (raised.edge, raised.support, raised.against) == ("open", 2, 0)


def test_unknown_without_recovered_outcome_does_nothing():
    s = merge(merge([], bounce(), TOPO), bounce(entity="TRN-120", at="2026-11-07T10:00:00+02:00", outcome=None,
                                                 source="teams:thread-y", trust="stated"), TOPO)
    c = preds(s[0])["install_year <= 2019"]
    assert (c.support, c.against) == (1, 0)


def test_barrier_two_sites_two_assertions():
    s = merge(merge([], barrier(), TOPO), barrier(site="HEL-02", source="email:email-hel"), TOPO)
    assert len(s) == 2 and all(a.superseded_by is None and a.status == "open" for a in s)


def test_barrier_same_site_new_text_supersedes():
    new_at = "2026-11-07T15:14:00+02:00"
    s = merge(merge([], barrier(), TOPO), barrier(text="in the site cabinet now", at=new_at,
                                                   source="teams:thread-key_moved"), TOPO)
    old, new = s
    assert old.superseded_by == new.id == "CA-0002" and new.supersedes == old.id == "CA-0001"
    assert old.valid_to == new.valid_from == datetime.fromisoformat(new_at) and new.valid_to is None


def test_barrier_hunch_does_not_supersede():
    s = merge(merge([], barrier(), TOPO), barrier(text="in the cabinet", at="2026-11-07T15:14:00+02:00",
                                                   trust="hunch", source="teams:thread-key_hedged"), TOPO)
    assert len(s) == 2
    assert all(a.superseded_by is None and a.supersedes is None and a.valid_to is None for a in s)


def test_barrier_same_text_again_is_one_more_case():
    s = merge(merge([], barrier(), TOPO), barrier(text="At the neighbouring  farm, ask for Mäkelä",
                                                   at="2026-11-08T08:00:00+02:00", source="teams:thread-z"), TOPO)
    assert len(s) == 1 and len(s[0].evidence.cases) == 2


def test_other_never_merges():
    a = bounce(action="other", text="swap the fan tray")
    s = merge(merge([], a, TOPO), a, TOPO)
    assert len(s) == 2 and all(x.status == "open" for x in s)


def test_merge_does_not_mutate_inputs():
    first = merge([], bounce(), TOPO)
    snapshot = [a.model_dump() for a in first]
    merge(first, bounce(entity="TRN-063", at="2026-11-05T13:47:00+02:00", source="teams:thread-reworded"), TOPO)
    assert [a.model_dump() for a in first] == snapshot
