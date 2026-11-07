"""Break tests, section B (deterministic rules, no model). docs/BREAK_TESTS.md; findings in docs/break/B_rules.md.
Every test asserts what the contract/spec implies; xfail(strict=False) marks the ones expected to expose a bug."""
import threading
from datetime import UTC, datetime, timedelta, timezone

import pytest

from agent.get_context import get_context
from agent.outcomes import record_outcome
from agent.questions import answer
from binder.resolve import normalise_id, resolve_entities
from contracts.models import AppliesTo, Assertion, Candidate, Case, Evidence, Trigger
from extractor.merge import merge
from extractor.vote import vote
from pipeline import load_topology
from predicates import evaluate, lookup, parse
from store.json_store import JsonStore

TOPO = load_topology()
H = timezone(timedelta(hours=2))
AT = datetime(2026, 11, 7, 10, tzinfo=H)
RECORDED = datetime(2026, 11, 6, tzinfo=UTC)
SYMPTOMS = ["link_up", "optics_normal", "alarms_cleared", "counters_zero"]
CORE_CANDS = [("install_year <= 2019", "open"), ("model == 'TX-200'", "closed"), ("firmware == '4.1'", "closed"),
              ("site == 'OULU-07'", "closed"), ("region == 'north'", "closed")]


@pytest.fixture(autouse=True)
def out_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("OUT_DIR", str(tmp_path / "out"))
    monkeypatch.setenv("LLM_OFFLINE", "1")
    return tmp_path / "out"


def cand(p, edge="closed", support=1, against=0):
    return Candidate(predicate=p, edge=edge, support=support, against=against, basis="break test")


def bounce(id="CA-0001", entity="TRN-042", at="2026-11-01T09:25:00+02:00", outcome="recovered", trust="verified_by_outcome",
           action="interface.bounce", text="disable the interface, wait, enable it", status="open", cands=CORE_CANDS,
           said_by="Erkki Expert", symptoms=("link_up", "counters_zero", "optics_normal"), decided=None, valid_to=None):
    return Assertion(
        id=id, trigger=Trigger(kind="incident", event="sfp_replaced", symptoms=list(symptoms)),
        applies_to=AppliesTo(entity_type="transmission_node", decided=decided, candidates=[cand(p, e) for p, e in cands]),
        action=action, action_text=text, avoid=["node.reboot"],
        evidence=Evidence(cases=[Case(entity=entity, at=at, outcome=outcome)], sources=["teams:thread-001"],
                          excerpt="x", said_by_role="expert", said_by=said_by),
        trust=trust, status=status, questions_asked=[], supersedes=None, superseded_by=None,
        recorded_at=RECORDED, valid_from=at, valid_to=valid_to, valid_while=None)


def barrier(id="CA-0000", site="OULU-03", text="at the neighbouring farm, ask for Mäkelä", at="2026-10-02T10:00:00+02:00",
            trust="stated", source="email:email-barrier"):
    return Assertion(
        id=id, trigger=Trigger(kind="workflow", event="dispatch_created", symptoms=[]),
        applies_to=AppliesTo(entity_type="site", decided=None, candidates=[cand(f"site == '{site}'")]),
        action="site.access_key", action_text=text, avoid=[],
        evidence=Evidence(cases=[Case(entity=site, at=at, outcome=None)], sources=[source],
                          excerpt="x", said_by_role="field_engineer", said_by="Veikko Vikkelä"),
        trust=trust, status="open", questions_asked=[], supersedes=None, superseded_by=None,
        recorded_at=RECORDED, valid_from=at, valid_to=None, valid_while=None)


def mkstore(tmp_path, *assertions, name="store.json"):
    s = JsonStore(tmp_path / name)
    s.replace_all(list(assertions))
    return s


def ctx(s, entity, symptoms=SYMPTOMS, at=AT, event="sfp_replaced"):
    return get_context(s, TOPO, entity, event, symptoms, at)


def by_text(assertions, text):
    return next(a for a in assertions if text in a.action_text)


def pending(s, entity="TRN-087"):
    """Run get_context so a question is recorded in out/questions.json; returns the first result."""
    r = ctx(s, entity)[0]
    assert r.outcome == "ambiguous" and r.question
    return r


# ---------- B1: supersede with an OLDER-dated update ----------

def test_b1_older_update_does_not_supersede_newer():
    newer = barrier(id="CA-0001", text="in the cabinet by the gate", at="2026-11-07T08:00:00+02:00")
    late_old = barrier(text="at the neighbouring farm, ask for Mäkelä", at="2026-10-02T10:00:00+02:00", source="email:late")
    out = merge([newer], late_old, TOPO)
    cabinet, farm = by_text(out, "cabinet"), by_text(out, "farm")
    assert cabinet.superseded_by is None and cabinet.valid_to is None, \
        f"newer fact superseded: superseded_by={cabinet.superseded_by} valid_to={cabinet.valid_to}"


def test_b1_get_context_after_late_older_update(tmp_path):
    newer = barrier(id="CA-0001", text="in the cabinet by the gate", at="2026-11-07T08:00:00+02:00")
    late_old = barrier(text="at the neighbouring farm, ask for Mäkelä", at="2026-10-02T10:00:00+02:00", source="email:late")
    s = mkstore(tmp_path, *merge([newer], late_old, TOPO))
    res = ctx(s, "OULU-03", symptoms=[], event="dispatch_created", at=datetime(2026, 11, 8, 8, tzinfo=H))
    proposed = [r.assertion.action_text for r in res if r.outcome == "proposed"]
    assert proposed == ["in the cabinet by the gate"], [(r.assertion.action_text, r.outcome, r.reason) for r in res]


# ---------- B2: firmware '4.1' vs '4.10' ----------

def test_b2_firmware_tuple_compare():
    n = lookup(TOPO, "TRN-042").model_copy(update={"firmware": "4.10"})
    assert evaluate("firmware == '4.1'", n, TOPO) == "fails"
    assert evaluate("firmware < '4.2'", n, TOPO) == "fails"       # 4.10 > 4.2
    assert evaluate("firmware > '4.9'", n, TOPO) == "holds"
    assert evaluate("firmware == '4.1'", n.model_copy(update={"firmware": "4.1.0"}), TOPO) == "fails"  # documented
    assert evaluate("firmware == '4.01'", lookup(TOPO, "TRN-042"), TOPO) == "holds"  # int('01') == 1


# ---------- B3: unknown entity ----------

def test_b3_unknown_entity(tmp_path):
    with pytest.raises(ValueError, match="TRN-999 is not in the topology"):
        ctx(mkstore(tmp_path, bounce()), "TRN-999")
    with pytest.raises(ValueError):  # even with an empty store it raises rather than returning []
        ctx(mkstore(tmp_path, name="empty.json"), "TRN-999")


# ---------- B4: answer out of range / twice ----------

def test_b4_answer_index_out_of_range(tmp_path):
    s = mkstore(tmp_path, bounce())
    r = pending(s)
    with pytest.raises(ValueError, match="no option 99"):
        answer(s, r.assertion.id, 99, TOPO)
    assert s.get(r.assertion.id).status == "open" and s.get(r.assertion.id).questions_asked == []


def test_b4_answer_negative_index_rejected(tmp_path):
    s = mkstore(tmp_path, bounce())
    r = pending(s)
    try:
        a = answer(s, r.assertion.id, -1, TOPO)
    except (IndexError, ValueError):
        return
    pytest.fail(f"-1 accepted: decided={a.applies_to.decided}")


def test_b4_answer_twice_rejected(tmp_path):
    s = mkstore(tmp_path, bounce())
    r = pending(s)
    assert answer(s, r.assertion.id, 0, TOPO).applies_to.decided.predicate == "install_year <= 2019"
    try:
        answer(s, r.assertion.id, 2, TOPO)  # "No" -> id == 'TRN-042'
    except ValueError:
        pass
    assert s.get(r.assertion.id).applies_to.decided.predicate == "install_year <= 2019", s.get(r.assertion.id).applies_to.decided


def test_b4_edge_answer_twice(tmp_path):
    s = mkstore(tmp_path, bounce())
    r = ctx(s, "TRN-120")[0]
    assert r.question.key == "install_year <= 2019=unknown"
    after1 = answer(s, r.assertion.id, 0, TOPO).model_dump()  # passes only because the raised candidate no longer matches the key
    try:
        answer(s, r.assertion.id, 1, TOPO)
    except ValueError:
        pass
    assert s.get(r.assertion.id).model_dump() == after1, s.get(r.assertion.id).applies_to.candidates[0]


# ---------- B5: entity type mismatch in voting ----------

def test_b5_site_case_does_not_eliminate_node_candidates():
    a = bounce()
    vote(a, "OULU-07", "recovered", TOPO)
    eliminated = [c.predicate for c in a.applies_to.candidates if c.against]
    assert eliminated == [], f"eliminated by a site entity: {eliminated}"


def test_b5_node_case_on_workflow_rule():
    # fixed: a node case on a site rule is an entity-type mismatch and is skipped (was: the node's site was voted)
    a = barrier(id="CA-0001")
    vote(a, "TRN-019", "recovered", TOPO)
    assert (a.applies_to.candidates[0].support, a.applies_to.candidates[0].against) == (1, 0)
    b = bounce()
    vote(b, "RTR-007", "recovered", TOPO)   # a router case on a transmission_node rule is a mismatch too
    assert [(c.support, c.against) for c in b.applies_to.candidates] == [(1, 0)] * 5


# ---------- B6: edge raise, then a failed case on the newest unit ----------

def test_b6_raise_then_failed_other_day(tmp_path):
    s = mkstore(tmp_path, bounce())
    a = record_outcome(s, TOPO, "CA-0001", "TRN-120", "recovered", AT)
    c = {x.predicate: x for x in a.applies_to.candidates}
    assert "install_year <= 2020" in c and c["install_year <= 2020"].edge == "open"
    a = record_outcome(s, TOPO, "CA-0001", "TRN-120", "failed", AT + timedelta(days=1))
    c = {x.predicate: x for x in a.applies_to.candidates}
    assert "install_year <= 2020" in c, "edge came back down"
    assert c["install_year <= 2020"].against == 1 and a.status == "review"


def test_b6_failed_same_day_after_recovered_is_recorded(tmp_path):
    s = mkstore(tmp_path, bounce())
    record_outcome(s, TOPO, "CA-0001", "TRN-120", "recovered", AT)
    a = record_outcome(s, TOPO, "CA-0001", "TRN-120", "failed", AT + timedelta(hours=2))
    assert a.status == "review" or any(c.outcome == "failed" for c in a.evidence.cases), \
        f"failure lost: status={a.status} cases={[(c.entity, c.outcome) for c in a.evidence.cases]}"


def test_b6_all_candidates_eliminated_is_not_proposed(tmp_path):
    a = bounce()
    for c in a.applies_to.candidates:
        c.against = 1
    r = ctx(mkstore(tmp_path, a), "TRN-101")[0]   # different model, site, region, newer
    assert r.outcome != "proposed", f"{r.outcome}: {r.reason}"


# ---------- B7: tied dispute ----------

def test_b7_tied_dispute(tmp_path):
    a = bounce(id="CA-0001", status="disputed")
    b = bounce(id="CA-0002", status="disputed", action="sfp.replace", text="replace the SFP again", said_by="Jari")
    res = ctx(mkstore(tmp_path, a, b), "TRN-042")
    assert [(r.outcome, r.reason, r.question) for r in res] == [("ambiguous", "tied dispute, escalate", None)] * 2


def test_b7_three_way_tie_plus_loser(tmp_path):
    a = bounce(id="CA-0001", status="disputed")
    b = bounce(id="CA-0002", status="disputed", action="sfp.replace", text="replace", said_by="Jari")
    c = bounce(id="CA-0003", status="disputed", action="node.reboot", text="reboot", said_by="Pekka", trust="stated", outcome=None)
    res = {r.assertion.id: r for r in ctx(mkstore(tmp_path, a, b, c), "TRN-042")}
    assert res["CA-0001"].outcome == res["CA-0002"].outcome == "ambiguous"
    assert res["CA-0003"].outcome == "declined" and "lower precedence" in res["CA-0003"].reason


# ---------- B8: trust beats cases ----------

def test_b8_trust_before_cases(tmp_path):
    win = bounce(id="CA-0001", status="disputed")  # verified_by_outcome, 1 case
    lose = bounce(id="CA-0002", status="disputed", action="sfp.replace", text="replace the SFP", trust="stated",
                  outcome=None, said_by="Jari")
    lose.evidence.cases += [Case(entity="TRN-045", at="2026-10-01T10:00:00+02:00", outcome=None),
                            Case(entity="TRN-120", at="2026-10-02T10:00:00+02:00", outcome=None)]
    res = {r.assertion.id: r for r in ctx(mkstore(tmp_path, win, lose), "TRN-042")}
    assert res["CA-0001"].outcome == "proposed" and res["CA-0001"].reason == "disputed: Jari's replace the SFP, stated"
    assert res["CA-0002"].outcome == "declined"


# ---------- B9: not yet valid ----------

def test_b9_not_yet_valid(tmp_path):
    r = ctx(mkstore(tmp_path, bounce(at="2026-11-10T09:00:00+02:00")), "TRN-042")[0]
    assert (r.outcome, r.reason, r.question) == ("declined", "not yet valid on 2026-11-07, valid from 2026-11-10", None)


# ---------- B10: hedged repeat cannot downgrade ----------

@pytest.mark.parametrize("old_trust,old_outcome", [("verified_by_outcome", "recovered"), ("stated", None)])
def test_b10_hedged_repeat_does_not_downgrade(old_trust, old_outcome):
    old = bounce(trust=old_trust, outcome=old_outcome)
    new = bounce(id="CA-0000", entity="TRN-045", at="2026-11-05T09:00:00+02:00", outcome=None, trust="hunch")
    out = merge([old], new, TOPO)
    assert len(out) == 1 and out[0].trust == old_trust and len(out[0].evidence.cases) == 2


# ---------- B11: predicate value with a quote / malformed predicate in the store ----------

def test_b11_quote_in_value():
    n = lookup(TOPO, "TRN-042")
    with pytest.raises(ValueError, match="malformed predicate"):
        parse("site == 'O'Brien'")
    assert parse('site == "O\'Brien"') == ("site", "==", "O'Brien")  # double quotes accepted though grammar says single
    with pytest.raises(ValueError, match="malformed predicate"):
        evaluate("site == 'OULU-07' ", n, TOPO)
    with pytest.raises(ValueError, match="malformed predicate"):
        evaluate("site=='OULU-07'", n, TOPO)
    with pytest.raises(ValueError):
        evaluate("install_year == '2019'", n, TOPO)
    with pytest.raises(ValueError):
        evaluate("model < 'TX-300'", n, TOPO)


def test_b11_bad_predicate_does_not_break_get_context(tmp_path):
    good = bounce(id="CA-0001")
    bad = bounce(id="CA-0002", action="sfp.replace", text="x", cands=[("install_year == '2019'", "closed")])
    res = ctx(mkstore(tmp_path, good, bad), "TRN-042")
    assert any(r.assertion.id == "CA-0001" for r in res)


# ---------- B12: normalise_id ----------

def test_b12_normalise_id():
    assert normalise_id("TRN-0042") == normalise_id("TRN-042") == "trn42"
    assert normalise_id("TRN-100") == "trn100" and normalise_id("TRN-1010") != normalise_id("TRN-101")
    assert resolve_entities(["TRN-0042 down again"], TOPO) == [("TRN-042", 1)]


def test_b12_resolver_ticket_and_model_strings():
    assert resolve_entities(["ticket INC0012345, TX-200 on 4.1, RX-10"], TOPO) == []


# ---------- B13: by_entity ----------

@pytest.mark.xfail(strict=False, reason="break test B13: by_entity ignores region predicates (no way to ask 'what applies in north')")
def test_b13_by_entity_region(tmp_path):
    s = mkstore(tmp_path, bounce())
    assert [a.id for a in s.by_entity("north")] == ["CA-0001"] or [a.id for a in s.by_entity("region:north")] == ["CA-0001"]


def test_b13_by_entity_counts_eliminated_candidates(tmp_path):
    a = bounce()
    for c in a.applies_to.candidates:
        if c.predicate.startswith("site"):
            c.against = 1
    # documented: a site candidate already voted out still makes the assertion 'about' that site
    assert [x.id for x in mkstore(tmp_path, a).by_entity("OULU-07")] == ["CA-0001"]


# ---------- B14: graph with a site not in topology / negated predicates ----------

def test_b14_graph_unknown_site_kind(tmp_path):
    g = mkstore(tmp_path, barrier(id="CA-0001", site="OULU-99")).graph(TOPO)
    n = next(x for x in g["nodes"] if x["id"] == "OULU-99")
    assert n["kind"] == "unknown", n  # fixed: an entity outside the topology is not claimed to be a node


def test_b14_graph_negated_predicate(tmp_path):
    g = mkstore(tmp_path, bounce(cands=[("site != 'OULU-07'", "closed")])).graph(TOPO)
    assert not any(e["kind"] == "SCOPED_BY" and e["to"] == "OULU-07" for e in g["edges"])


# ---------- B15: concurrent answer / lost update ----------

@pytest.mark.xfail(strict=False, reason="break test B15: two JsonStore instances on one file: last writer wins, an answer is lost")
def test_b15_stale_store_loses_update(tmp_path):
    s = mkstore(tmp_path, bounce(id="CA-0001"), bounce(id="CA-0002", action="sfp.replace", text="replace", said_by="Jari"))
    pending(s)   # records questions for CA-0001 and CA-0002
    s1, s2 = JsonStore(s.path), JsonStore(s.path)  # two API requests, each with its own demo.store()
    answer(s1, "CA-0001", 0, TOPO)
    answer(s2, "CA-0002", 0, TOPO)
    fresh = JsonStore(s.path)
    assert fresh.get("CA-0001").status == "decided" and fresh.get("CA-0002").status == "decided", \
        (fresh.get("CA-0001").status, fresh.get("CA-0002").status)


@pytest.mark.xfail(strict=False, reason="break test B15: concurrent answers on one question: several accepted, and WinError 32 on store.tmp")
def test_b15_threaded_answers(tmp_path):
    s = mkstore(tmp_path, bounce())
    r = pending(s)
    errors, results = [], []

    def go(i):
        try:
            results.append(answer(JsonStore(s.path), r.assertion.id, i % 3, TOPO).applies_to.decided.predicate)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{type(e).__name__}: {e}")
    ts = [threading.Thread(target=go, args=(i,)) for i in range(12)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    final = JsonStore(s.path).get(r.assertion.id)
    print("threaded answers:", len(results), "ok;", len(errors), "errors", errors[:2], "; final decided:", final.applies_to.decided)
    assert len(results) == 1, f"{len(results)} answers to one question accepted: {sorted(set(results))}; errors {errors[:2]}"


# ---------- B16: next_id after CA-9999 ----------

def test_b16_next_id_overflow(tmp_path):
    bounce(id=mkstore(tmp_path, bounce(id="CA-9999")).next_id())


def test_b16_merge_id_overflow():
    for a in merge([bounce(id="CA-9999")], bounce(id="CA-0000", action="sfp.replace", text="replace"), TOPO):
        Assertion.model_validate(a.model_dump())


# ---------- B17: valid_to before valid_from ----------

def test_b17_valid_to_before_valid_from():
    with pytest.raises(ValueError):
        bounce(at="2026-11-01T09:00:00+02:00", valid_to="2026-10-01T09:00:00+02:00")


# ---------- B18: at exactly valid_to / valid_from; naive datetime ----------

def test_b18_boundaries(tmp_path):
    s = mkstore(tmp_path, bounce(at="2026-11-01T09:00:00+02:00", valid_to="2026-11-07T10:00:00+02:00"))
    r = ctx(s, "TRN-042", at=datetime(2026, 11, 7, 10, tzinfo=H))[0]
    assert (r.outcome, r.reason) == ("declined", "expired 2026-11-07")
    assert ctx(s, "TRN-042", at=datetime(2026, 11, 7, 8, tzinfo=UTC))[0].outcome == "declined"  # same instant in UTC
    assert ctx(s, "TRN-042", at=datetime(2026, 11, 1, 9, tzinfo=H))[0].outcome == "proposed"     # exactly valid_from


def test_b18_naive_at_time(tmp_path):
    s = mkstore(tmp_path, bounce())
    try:
        ctx(s, "TRN-042", at=datetime(2026, 11, 7, 10))
    except ValueError:
        return
    pytest.fail("naive at_time accepted")


# ---------- B19: workflow trigger with symptoms; node rule on a site ----------

def test_b19_workflow_ignores_symptoms(tmp_path):
    s = mkstore(tmp_path, barrier(id="CA-0001"))
    assert ctx(s, "OULU-03", symptoms=["link_down", "counters_rising"], event="dispatch_created")[0].outcome == "proposed"


def test_b19_incident_rule_on_site_entity(tmp_path):
    r = ctx(mkstore(tmp_path, bounce()), "OULU-07")[0]
    assert r.outcome == "declined" and r.question is None, f"{r.outcome}: {r.reason} | {r.question and r.question.text}"
    assert r.reason == "entity type site does not match transmission_node"


# ---------- B20: merge never matches a superseded assertion ----------

def test_b20_superseded_not_matched():
    farm = barrier(id="CA-0001")
    cabinet = barrier(id="CA-0002", text="in the cabinet by the gate", at="2026-11-07T08:00:00+02:00")
    farm.superseded_by, farm.valid_to, cabinet.supersedes = "CA-0002", cabinet.valid_from, "CA-0001"
    back = barrier(text="at the neighbouring farm, ask for Mäkelä", at="2026-11-20T08:00:00+02:00", source="email:back")
    out = merge([farm, cabinet], back, TOPO)
    assert len(out) == 3
    assert out[0].superseded_by == "CA-0002" and len(out[0].evidence.sources) == 1  # old farm untouched
    assert out[1].superseded_by == "CA-0003" and out[2].supersedes == "CA-0002"


# ---------- B21: record_outcome edge cases ----------

def test_b21_record_outcome_unknown_entity(tmp_path):
    s = mkstore(tmp_path, bounce())
    a = record_outcome(s, TOPO, "CA-0001", "TRN-999", "recovered", AT)
    assert len(a.evidence.cases) == 2  # case appended although the vote was skipped (logged)
    with pytest.raises(ValueError):
        record_outcome(s, TOPO, "CA-0042", "TRN-042", "recovered", AT)


# ---------- B22: answer() edge cases ----------

def test_b22_answer_without_question(tmp_path):
    with pytest.raises(ValueError, match="no question recorded"):
        answer(mkstore(tmp_path, bounce()), "CA-0001", 0, TOPO)


def test_b22_answer_assertion_not_in_store(tmp_path):
    pending(mkstore(tmp_path, bounce()))
    with pytest.raises(ValueError):
        answer(mkstore(tmp_path, name="other.json"), "CA-0001", 0, TOPO)
