"""Module 6 gate: pipeline + get_context + the one question + outcomes + notifications + stand-in agent.
Extraction and the two stand-in calls come from .llm_cache/ (they also run with LLM_OFFLINE=1)."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from agent.get_context import get_context
from agent.outcomes import record_outcome
from agent.questions import answer
from agent.stand_in import NO_CONTEXT, propose, proposal_text
from pipeline import ingest, load_topology
from store.json_store import JsonStore

ROOT = Path(__file__).parent.parent
TOPO = load_topology()
H = timezone(timedelta(hours=2))
AT = datetime(2026, 11, 7, 10, tzinfo=H)
DISPATCH = datetime(2026, 11, 8, 8, tzinfo=H)
RECORDED = datetime(2026, 11, 7, tzinfo=timezone.utc)
SYMPTOMS = ["link_up", "optics_normal", "alarms_cleared", "counters_zero"]
CORE = [ROOT / "data/elisa_examples/teams_chat.json", ROOT / "data/elisa_examples/email.txt"]
BARRIER = ROOT / "data/scenarios/12_barrier/email.txt"
UPDATE = ROOT / "data/scenarios/12b_barrier_update/thread.json"
HEDGED = ROOT / "data/scenarios/12b_barrier_update/thread_hedged.json"


@pytest.fixture(autouse=True)
def out_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("OUT_DIR", str(tmp_path / "out"))
    return tmp_path / "out"


@pytest.fixture
def make_store(tmp_path):
    n = iter(range(100))

    def make(paths=CORE):
        s = JsonStore(tmp_path / f"store{next(n)}.json")
        ingest(paths, s, TOPO, recorded_at=RECORDED)
        return s
    return make


def ctx(store, entity, symptoms=SYMPTOMS, at=AT):
    return get_context(store, TOPO, entity, "sfp_replaced", symptoms, at)


def only(results):
    assert len(results) == 1, results
    return results[0]


def pick(results, text):
    return only([r for r in results if text in r.assertion.action_text])


def test_pipeline_one_case_two_sources(make_store):
    s = make_store()
    a = only(s.all())
    assert a.action == "interface.bounce" and len(a.evidence.cases) == 1 and len(a.evidence.sources) == 2


def test_core_question_answer_and_proposal(make_store, out_dir):
    s = make_store()
    r = only(ctx(s, "TRN-087"))
    assert r.outcome == "ambiguous" and "site" in r.reason
    q = r.question
    assert "site == 'OULU-07'=fails" in q.key and q.to == "Erkki Expert" and q.thread_id == "thread-001"
    assert q.text == "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site."
    labels = {o.label: o for o in q.options}
    assert labels["All older units"].sets_decided == "install_year <= 2019" and labels["All older units"].edge == "open"
    assert labels["Only OULU-07"].sets_decided == "site == 'OULU-07'"
    assert labels["No"].sets_decided == "id == 'TRN-042'"
    assert q.options[0].label == "All older units"
    assert json.loads((out_dir / "questions.json").read_text(encoding="utf-8"))[-1]["entity_id"] == "TRN-087"

    a = answer(s, r.assertion.id, 0, TOPO)
    assert a.status == "decided" and a.applies_to.decided.predicate == "install_year <= 2019" and q.key in a.questions_asked
    r = only(ctx(s, "TRN-087"))
    assert r.outcome == "proposed" and r.question is None

    notes = json.loads((out_dir / "notifications.json").read_text(encoding="utf-8"))
    assert notes == [{"to": "Erkki Expert", "text": "Your tip from 2026-11-01 was proposed for TRN-087 today.",
                      "assertion_id": r.assertion.id, "entity_id": "TRN-087", "at": AT.isoformat()}]
    ctx(s, "TRN-087")  # same run again: no duplicate notification
    assert len(json.loads((out_dir / "notifications.json").read_text(encoding="utf-8"))) == 1

    p = propose([r], "TRN-087", "sfp_replaced", SYMPTOMS)
    assert p.action == "interface.bounce" and p.action != "node.reboot"
    text = proposal_text([r], p)
    assert "Disable" in text and "enable" in text and "Erkki Expert" in text and "1 case," in text
    assert "Avoid:" in text and "node.reboot" in text.split("Avoid:")[1] and "teams, email" in text
    print(text)


def test_stand_in_without_context():
    p = propose([], "TRN-087", "sfp_replaced", SYMPTOMS)
    assert p.action == "other" and p.cites == []  # nothing captured: the layer must not invent a procedure
    assert proposal_text([], p) == NO_CONTEXT


def test_newer_other_model_declined(make_store):
    r = only(ctx(make_store(), "TRN-101"))
    assert r.outcome == "declined" and r.question is None
    assert "model TX-300 fails model == 'TX-200'" in r.reason
    assert "install year 2023 is beyond the known edge 2019" in r.reason


def test_edge_question_no(make_store):
    s = make_store()
    r = only(ctx(s, "TRN-120"))
    assert r.outcome == "ambiguous" and r.question.key == "install_year <= 2019=unknown"
    assert r.question.text == "Your TRN-042 tip: does it apply to TRN-120 too? Installed 2020, newer than any unit it has worked on."
    assert [(o.label, o.edge_answer) for o in r.question.options] == [("Yes", "raise"), ("No", "close")]
    a = answer(s, r.assertion.id, 1, TOPO)
    c = a.applies_to.candidates[0]
    assert (c.predicate, c.edge, a.applies_to.decided, a.status) == ("install_year <= 2019", "closed", None, "open")
    # Contract: decided is unchanged by an edge answer, so on an undecided assertion the closed candidate now fails
    # while model/firmware/site/region hold -> a NEW scope ambiguity, not declined (see report).
    r = only(ctx(s, "TRN-120"))
    assert r.outcome == "ambiguous" and "install_year 2020 fails install_year <= 2019" in r.reason
    assert "install_year <= 2019=fails" in r.question.key


def test_edge_question_no_after_decided(make_store):
    """Build-table row 6 order: answer 'All older units' on TRN-087 first, then the 2020 unit; 'No' -> declined."""
    s = make_store()
    r = only(ctx(s, "TRN-087"))
    answer(s, r.assertion.id, 0, TOPO)
    r = only(ctx(s, "TRN-120"))
    assert r.outcome == "ambiguous" and r.question.key == "install_year <= 2019=unknown"
    answer(s, r.assertion.id, 1, TOPO)
    r = only(ctx(s, "TRN-120"))
    assert r.outcome == "declined" and "install_year" in r.reason and r.question is None


def test_edge_question_yes(make_store):
    s = make_store()
    r = only(ctx(s, "TRN-120"))
    a = answer(s, r.assertion.id, 0, TOPO)
    assert a.applies_to.candidates[0].predicate == "install_year <= 2020" and a.applies_to.candidates[0].edge == "open"
    assert only(ctx(s, "TRN-120")).outcome == "proposed"


def test_other_model_2018_ambiguous(make_store):
    r = only(ctx(make_store(), "TRN-063"))
    assert r.outcome == "ambiguous" and "model" in r.reason and "model == 'TX-200'=fails" in r.question.key


def test_counters_rising_not_returned(make_store):
    assert ctx(make_store(), "TRN-087", ["link_up", "optics_normal", "alarms_cleared", "counters_rising"]) == []


def test_outcomes(make_store):
    s = make_store()
    aid = s.all()[0].id
    a = record_outcome(s, TOPO, aid, "TRN-063", "recovered", AT)
    by = {c.predicate: c for c in a.applies_to.candidates}
    assert by["model == 'TX-200'"].against == 1 and by["install_year <= 2019"].support == 2
    assert len(a.evidence.cases) == 2 and a.trust == "verified_by_outcome"
    assert len(record_outcome(s, TOPO, aid, "TRN-063", "recovered", AT).evidence.cases) == 2  # same entity, same day
    a = record_outcome(s, TOPO, aid, "TRN-019", "failed", AT)
    assert a.status == "review" and s.get(aid).status == "review"
    r = only(ctx(s, "TRN-087"))
    assert r.outcome == "declined" and r.reason == "under review"


def test_barrier(make_store):
    s = make_store([BARRIER])
    r = only(get_context(s, TOPO, "OULU-03", "dispatch_created", [], DISPATCH))
    assert r.outcome == "proposed" and "Mäkelä" in r.assertion.action_text
    # a site-bound key has only the site candidate, so another site is a clean decline
    r = only(get_context(s, TOPO, "OULU-07", "dispatch_created", [], DISPATCH))
    assert r.outcome == "declined" and "site OULU-07 fails site == 'OULU-03'" in r.reason

    ingest([UPDATE], s, TOPO, recorded_at=RECORDED)
    results = get_context(s, TOPO, "OULU-03", "dispatch_created", [], DISPATCH)
    assert pick(results, "cabinet").outcome == "proposed"
    old = pick(results, "farm")
    assert old.outcome == "declined" and old.reason == f"superseded by {pick(results, 'cabinet').assertion.id} on 2026-11-07"
    results = get_context(s, TOPO, "OULU-03", "dispatch_created", [], datetime(2026, 10, 5, 8, tzinfo=H))
    assert pick(results, "farm").outcome == "proposed" and pick(results, "cabinet").outcome == "declined"


def test_barrier_hedged(make_store):
    s = make_store([BARRIER, HEDGED])
    results = get_context(s, TOPO, "OULU-03", "dispatch_created", [], DISPATCH)
    assert pick(results, "farm").outcome == "proposed"
    hunch = pick(results, "cabinet")
    assert hunch.outcome == "declined" and hunch.reason == "hunch, not verified"


def test_precedence(make_store):
    s = make_store()
    core = s.all()[0].model_copy(update={"status": "disputed"}, deep=True)
    rival = core.model_copy(update={"id": "CA-0099", "action": "sfp.replace", "action_text": "Replace the SFP again",
                                    "trust": "stated"}, deep=True)
    rival.evidence.said_by = "Jari Korhonen"
    s.replace_all([core, rival])
    results = {r.assertion.id: r for r in ctx(s, "TRN-042")}
    assert results[core.id].outcome == "proposed"
    assert results[core.id].reason == "disputed: Jari Korhonen's Replace the SFP again, stated"
    assert results["CA-0099"].outcome == "declined" and "disputed" in results["CA-0099"].reason
    s.put(rival.model_copy(update={"trust": core.trust, "valid_from": core.valid_from}))
    results = ctx(s, "TRN-042")
    assert [(r.outcome, r.reason, r.question) for r in results] == [("ambiguous", "tied dispute, escalate", None)] * 2
