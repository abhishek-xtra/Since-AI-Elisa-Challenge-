"""Module 4 gate: binder. No LLM, no extractor: ExtractedRule and the unbound Assertion are built by hand."""
import json
from datetime import datetime
from pathlib import Path

import jsonschema
import pytest

from adapters import load_email, load_teams
from binder import bind, normalise_id, resolve_entities
from contracts.models import (AppliesTo, Assertion, Evidence, ExtractedRule, Incident, Message, Topology, Trigger)

EX = Path("data/elisa_examples")
TOPO = Topology.model_validate_json(Path("data/topology.json").read_text(encoding="utf-8"))
SCHEMA = json.loads(Path("contracts/assertion.schema.json").read_text(encoding="utf-8"))
T0 = datetime.fromisoformat("2026-11-01T09:00:00+02:00")
ERKKI_EXCERPT = "Disable the interface, wait a little, then enable it again. Don't reboot the whole unit unless that fails."


def rule(**kw) -> ExtractedRule:
    base = dict(trigger_kind="incident", event="sfp_replaced", symptoms=["link_up", "optics_normal", "counters_zero"],
                stated_condition="older units", condition_is_relative=True, action="interface.bounce",
                action_text="disable the interface, wait, enable it", avoid=["node.reboot", "sfp.replace"],
                excerpt=ERKKI_EXCERPT, said_by="Erkki Expert", said_by_role="expert", hedged=False, first_hand=False,
                outcome="recovered", outcome_excerpt="Did that. Traffic is back 👍", about_entity=None)
    return ExtractedRule(**{**base, **kw})


def unbound(r: ExtractedRule, valid_from=T0) -> Assertion:
    """What the extractor hands the binder: no candidates, no cases."""
    return Assertion(
        id="CA-0001",
        trigger=Trigger(kind=r.trigger_kind, event=r.event, symptoms=r.symptoms),
        applies_to=AppliesTo(entity_type="site" if r.trigger_kind == "workflow" else "transmission_node", candidates=[], decided=None),
        action=r.action, action_text=r.action_text, avoid=r.avoid,
        evidence=Evidence(cases=[], sources=["teams:thread-001"], excerpt=r.excerpt, said_by_role=r.said_by_role, said_by=r.said_by),
        trust="verified_by_outcome" if r.outcome == "recovered" else "stated", status="open", questions_asked=[],
        supersedes=None, superseded_by=None, recorded_at=T0, valid_from=valid_from, valid_to=None, valid_while=None)


def msgs(*texts: str, incident: Incident | None = None) -> list[Message]:
    return [Message(id=f"teams:t:{i}", author="Veikko Vikkelä", role="field_engineer", timestamp=T0.replace(minute=i),
                    channel="teams", thread_id="t", text=t, incident=incident) for i, t in enumerate(texts)]


def do_bind(r: ExtractedRule, messages: list[Message]) -> Assertion:
    a = unbound(r)
    before = a.model_dump()
    out = bind(a, r, messages, TOPO)
    assert a.model_dump() == before, "bind mutated its input"
    jsonschema.validate(out.model_dump(mode="json"), SCHEMA, cls=jsonschema.Draft202012Validator,
                        format_checker=jsonschema.Draft202012Validator.FORMAT_CHECKER)
    return out


def preds(a: Assertion) -> dict[str, str]:
    return {c.predicate: c.edge for c in a.applies_to.candidates}


def test_erkki_chat():
    out = do_bind(rule(), load_teams(EX / "teams_chat.json"))
    assert preds(out) == {"install_year <= 2019": "open", "model == 'TX-200'": "closed", "firmware == '4.1'": "closed",
                          "site == 'OULU-07'": "closed", "region == 'north'": "closed"}
    assert len(out.applies_to.candidates) == 5
    assert all(c.support == 1 and c.against == 0 for c in out.applies_to.candidates)
    assert out.applies_to.candidates[0].predicate == "install_year <= 2019"
    assert "not a stated boundary" in out.applies_to.candidates[0].basis
    assert out.applies_to.entity_type == "transmission_node"
    [case] = out.evidence.cases
    assert case.entity == "TRN-042" and case.outcome == "recovered"
    assert case.at.isoformat() == "2026-11-01T09:22:00+02:00"
    assert out.status == "open" and out.questions_asked == [] and out.applies_to.decided is None


def test_outcome_not_confirmed():
    out = do_bind(rule(outcome="unknown", outcome_excerpt=None), load_teams(EX / "teams_chat.json"))
    assert out.evidence.cases[0].outcome is None


def test_outcome_failed():
    out = do_bind(rule(outcome="failed", outcome_excerpt="x"), load_teams(EX / "teams_chat.json"))
    assert out.evidence.cases[0].outcome == "failed"


def test_email_subject_resolves():
    email = load_email(EX / "email.txt")
    out = do_bind(rule(excerpt="try disabling and enabling the interface once."), email)
    assert out.evidence.cases[0].entity == "TRN-042"
    assert out.evidence.cases[0].at == email[0].timestamp


@pytest.mark.parametrize("text,expected", [
    ("trn42 is down again", "TRN-042"), ("TRN 042 link up", "TRN-042"), ("trn 87 no traffic", "TRN-087"),
    ("on TRN087 now", "TRN-087"), ("at Oulu 03 gate", "OULU-03"), ("OULU-03 barrier", "OULU-03"), ("oulu03 key", "OULU-03"),
])
def test_typos_resolve(text, expected):
    assert resolve_entities([text], TOPO)[0][0] == expected


def test_typo_binds():
    out = do_bind(rule(), msgs("Changed the SFP on trn 87.", "Counters zero."))
    assert out.evidence.cases[0].entity == "TRN-087"
    assert "install_year <= 2018" in preds(out)


def test_normalise_id():
    assert normalise_id("TRN-087") == normalise_id("trn 87") == normalise_id("Trn087") == "trn87"
    assert normalise_id("OULU-03") == "oulu3"


def test_mentioned_in_passing_loses():
    thread = msgs("Same thing as TRN-063 last week. Now TRN-087 after the SFP swap.", "TRN-087 link up, counters zero.",
                  "TRN-087 is back.", "TRN-055 was different.")
    out = do_bind(rule(), thread)
    assert out.evidence.cases[0].entity == "TRN-087"
    assert resolve_entities([m.text for m in thread], TOPO) == [("TRN-087", 3), ("TRN-063", 1)]  # TRN-055 not in topology


def test_about_entity_wins_over_heuristic():
    thread = msgs("TRN-042 again, like last week. TRN-042 TRN-042.", "And trn 87 now, link up, counters zero.")
    assert do_bind(rule(about_entity="trn 87"), thread).evidence.cases[0].entity == "TRN-087"
    assert do_bind(rule(about_entity="TRN-999"), thread).evidence.cases[0].entity == "TRN-042"  # unresolved: heuristic


def test_tie_broken_by_first_mention():
    assert resolve_entities(["TRN-087 and TRN-042"], TOPO) == [("TRN-087", 1), ("TRN-042", 1)]


def test_unknown_id_review():
    out = do_bind(rule(), msgs("Changed the SFP on TRN-999.", "Counters zero."))
    assert out.status == "review"
    assert out.applies_to.candidates == [] and out.evidence.cases == []


def test_incident_skips_scan():
    inc = Incident(entity_id="TRN-087", event="sfp_replaced", symptoms=["link_up", "counters_zero"])
    out = do_bind(rule(), msgs("This looks like what happened on TRN-042, TRN-042 again.", incident=inc))
    assert out.evidence.cases[0].entity == "TRN-087"
    assert "site == 'OULU-11'" in preds(out)


def test_workflow_binds_site():
    excerpt = "the key for the barrier on the private road at OULU-03 is at the neighbouring farm, ask for Mäkelä"
    r = rule(trigger_kind="workflow", event="dispatch_created", symptoms=[], stated_condition=None, condition_is_relative=False,
             action="site.access_key", action_text="at the neighbouring farm, ask for Mäkelä", avoid=[], excerpt=excerpt,
             said_by="Veikko Vikkelä", said_by_role="field_engineer", first_hand=True, outcome="unknown", outcome_excerpt=None)
    out = do_bind(r, msgs("Heads up for TRN-033 dispatches: " + excerpt))
    assert out.applies_to.entity_type == "site"
    assert out.evidence.cases[0].entity == "OULU-03"
    assert preds(out) == {"site == 'OULU-03'": "closed"}  # no region candidate: access knowledge is site-specific


@pytest.mark.parametrize("cond,excerpt", [
    ("only this one", ERKKI_EXCERPT), (None, "Just this unit: disable the interface."), ("only TRN-042", ERKKI_EXCERPT),
])
def test_only_this_one(cond, excerpt):
    out = do_bind(rule(stated_condition=cond, condition_is_relative=False, excerpt=excerpt), load_teams(EX / "teams_chat.json"))
    assert preds(out) == {"id == 'TRN-042'": "closed"}


def test_never_id_by_default():
    out = do_bind(rule(stated_condition=None, condition_is_relative=False), load_teams(EX / "teams_chat.json"))
    assert not any(p.startswith("id ") for p in preds(out))
    assert "install_year == 2019" in preds(out)  # no stated year, so the exact attribute is a candidate


def test_stated_year_no_duplicate():
    out = do_bind(rule(stated_condition="units installed before 2020", condition_is_relative=False), load_teams(EX / "teams_chat.json"))
    assert preds(out)["install_year < 2020"] == "closed"
    assert not any(p.startswith("install_year ==") for p in preds(out))


def test_unparsed_condition_logged_in_basis():
    out = do_bind(rule(stated_condition="the weird ones", condition_is_relative=False), load_teams(EX / "teams_chat.json"))
    assert len(out.applies_to.candidates) == 5
    assert all("'the weird ones' did not parse" in c.basis for c in out.applies_to.candidates)


def test_stated_candidate_failing_on_origin_is_dropped():
    out = do_bind(rule(stated_condition="installed after 2020", condition_is_relative=False), msgs("SFP on TRN-087.", "Counters zero."))
    # TRN-087 is 2018: "> 2020" would exclude its own case; the origin's attribute candidate takes its place
    assert "install_year > 2020" not in preds(out) and "install_year == 2018" in preds(out)


def test_expiry_goes_to_valid_while():
    out = do_bind(rule(stated_condition="stopped after firmware 5.0", condition_is_relative=False), msgs("SFP on TRN-087."))
    assert out.valid_while == "stopped after firmware 5.0" and not any("5.0" in p for p in preds(out))


def test_failed_origin_is_review():
    assert do_bind(rule(outcome="failed"), msgs("SFP on TRN-087.")).status == "review"
