"""Break tests for the extractor (docs/BREAK_TESTS.md section A, findings in docs/break/A_extractor.md).

Each test asserts the behaviour the spec wants. Tests that currently fail are marked xfail(strict=False) with the
reason, so the suite stays runnable. Model answers are cached in .llm_cache/ (one live Argon call per fixture).
"""
import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

import binder
import pipeline
from adapters import load_email, load_teams
from extractor import extract
from store.base import label
from store.json_store import JsonStore

ROOT = Path(__file__).parent.parent.parent
FIX = Path(__file__).parent / "fixtures"
CHAT = ROOT / "data" / "elisa_examples" / "teams_chat.json"
TOPO = pipeline.load_topology()
RECORDED = datetime(2026, 11, 7, tzinfo=UTC)


def msgs(name):
    p = FIX / name
    return load_teams(p) if p.suffix == ".json" else load_email(p)


def run(name):
    m = msgs(name)
    return extract(m, recorded_at=RECORDED), m


def bound(name):
    (a, rule), m = run(name)
    return binder.bind(a, rule, m, TOPO), rule


def ingest(tmp_path, *paths):
    store = JsonStore(tmp_path / "store.json")
    pipeline.ingest([*paths], store, TOPO, recorded_at=RECORDED)
    return store


def preds(a):
    return {c.predicate: c.edge for c in a.applies_to.candidates}


def xfail(why):
    return pytest.mark.xfail(strict=False, reason=f"break test: {why}")


# A1 ---------------------------------------------------------------------------------------------------------------

@xfail("merge key includes the full reported symptom set; a thread that omits 'alarms cleared' makes a second assertion")
def test_a01_same_rule_without_alarms_merges_as_second_case(tmp_path):
    store = ingest(tmp_path, CHAT, FIX / "a01_no_alarms.json")
    bounces = [a for a in store.all() if a.action == "interface.bounce"]
    assert len(bounces) == 1
    assert {c.entity for c in bounces[0].evidence.cases} == {"TRN-042", "TRN-087"}


# A2 ---------------------------------------------------------------------------------------------------------------

def test_a02_diagnostic_and_remedy_keeps_remedy():
    (a, rule), _ = run("a02_two_rules.json")
    assert a.action == "interface.bounce" and "node.reboot" in a.avoid


@xfail("one rule per thread: the second, unrelated rule (barrier key) is dropped without any trace")
def test_a02b_two_unrelated_rules_both_kept(tmp_path):
    store = ingest(tmp_path, FIX / "a02b_two_unrelated_rules.json")
    assert {a.action for a in store.all()} == {"interface.bounce", "site.access_key"}


# A3 ---------------------------------------------------------------------------------------------------------------

@xfail("hearsay: rule relayed second hand is marked first_hand and its own sentence counts as the 'later' outcome")
def test_a03_hearsay_is_not_first_hand():
    (a, rule), _ = run("a03_hearsay.json")
    assert rule.said_by == "Veikko Vikkelä" and rule.said_by_role == "field_engineer"  # header speaker, per prompt rule 4
    assert rule.first_hand is False  # 'Erkki told me' is something he was told
    assert rule.outcome_excerpt != rule.excerpt  # rule 10: outcome comes from a LATER message


# A4 ---------------------------------------------------------------------------------------------------------------

def test_a04_opposite_advice_is_disputed(tmp_path):
    (a, rule), _ = run("a04_opposite.json")
    assert a.action == "node.reboot" and a.avoid == ["interface.bounce"]
    store = ingest(tmp_path, CHAT, FIX / "a04_opposite.json")
    assert sorted(a.status for a in store.all()) == ["disputed", "disputed"]


# A5 ---------------------------------------------------------------------------------------------------------------

def test_a05_sarcasm_is_not_a_reboot_rule():
    out, _ = run("a05_sarcasm.json")
    assert out is None or (out[0].action != "node.reboot" and "node.reboot" in out[0].avoid)


# A6 ---------------------------------------------------------------------------------------------------------------

def test_a06_injection_does_not_steer_the_rule():
    (a, rule), _ = run("a06_injection.json")
    assert a.action == "interface.bounce" and "node.reboot" in a.avoid
    assert rule.said_by == "Erkki Expert" and rule.outcome == "unknown" and a.trust == "stated"
    assert "knowledge bot" not in a.evidence.excerpt


# A7 ---------------------------------------------------------------------------------------------------------------

def test_a07_finnish_extracts_verbatim():
    (a, rule), m = run("a07_finnish.json")
    assert a.action == "interface.bounce" and "node.reboot" in a.avoid
    assert "Älä" in a.evidence.excerpt and a.evidence.excerpt in m[1].text
    assert rule.condition_is_relative and rule.outcome == "recovered"
    assert {"link_up", "counters_zero"} <= set(a.trigger.symptoms)


@xfail("A1 again: Finnish thread reports no rx/optics value, so its symptom set differs from the chat's and it does not merge")
def test_a07_finnish_merges_with_chat(tmp_path):
    store = ingest(tmp_path, CHAT, FIX / "a07_finnish.json")
    assert len(store.all()) == 1 and len(store.all()[0].evidence.cases) == 2


# A8 ---------------------------------------------------------------------------------------------------------------

def test_a08_explicit_year_is_closed_candidate():
    a, rule = bound("a08_explicit_year.json")
    assert rule.condition_is_relative is False
    assert preds(a)["install_year < 2018"] == "closed"
    assert not any(p.startswith("install_year <=") for p in preds(a))


# A9 ---------------------------------------------------------------------------------------------------------------

def test_a09_ticket_stays_free_text():
    a, rule = bound("a09_ticket_model.json")
    assert a.evidence.cases[0].entity == "TRN-033"
    assert not any("INC" in p or "12345" in p for p in preds(a))
    assert preds(a)["firmware == '4.1'"] == "closed" and "model == 'TX-200'" in preds(a)


# A10 --------------------------------------------------------------------------------------------------------------

def test_a10_quoted_reply_chain():
    a, rule = bound("a10_quoted_reply.txt")
    assert a.action == "interface.bounce" and rule.said_by == "Erkki Expert"
    assert rule.outcome == "recovered" and a.evidence.cases[0].entity == "TRN-087"
    # debatable, documented: the case and valid_from carry the reply's date (7 Nov), not Erkki's quoted 2 Nov
    assert a.valid_from.date().isoformat() == "2026-11-07"


# A11 --------------------------------------------------------------------------------------------------------------

def test_a11_long_thread_finds_buried_rule():
    (a, rule), m = run("a11_long_thread.json")
    assert len(m) == 40
    assert a.action == "interface.bounce" and "node.reboot" in a.avoid and rule.outcome == "recovered"
    assert a.evidence.excerpt in m[21].text


# A12 --------------------------------------------------------------------------------------------------------------

def test_a12_expiry_condition_is_kept():
    a, rule = bound("a12_expiry.json")
    p = preds(a)
    assert "firmware == '5.0'" not in p  # the rule is about firmware BELOW 5.0
    assert "firmware < '5.0'" in p or a.valid_while is not None


# A13 --------------------------------------------------------------------------------------------------------------

@xfail("secret (gate code) is stored verbatim in action_text, excerpt, store file and graph.json attrs; no redaction")
def test_a13_secret_not_stored_verbatim(tmp_path):
    store = ingest(tmp_path, FIX / "a13_secret.json")
    (a,) = store.all()
    assert a.action == "site.access_key"
    assert label(a) == "Site access"  # the graph LABEL is safe (fixed string for site.access_key)
    graph = json.dumps(store.graph(TOPO), ensure_ascii=False)
    stored = (tmp_path / "store.json").read_text(encoding="utf-8")
    assert "1234" not in a.action_text and "1234" not in graph and "1234" not in stored


# A14 --------------------------------------------------------------------------------------------------------------

def test_a14_same_day_chat_and_email_about_different_devices_are_two_cases(tmp_path):
    store = ingest(tmp_path, CHAT, FIX / "a14_email_other_device.txt")
    (a,) = store.all()
    assert sorted(c.entity for c in a.evidence.cases) == ["TRN-042", "TRN-087"]
    assert len(a.evidence.sources) == 2


# A15+ (extra) -----------------------------------------------------------------------------------------------------

def test_a15_origin_is_the_current_device():
    a, _ = bound("a15_two_devices.json")
    assert a.evidence.cases[0].entity == "TRN-087"


def test_a16_rule_that_failed_on_its_origin_is_not_proposed(tmp_path):
    (a, rule), _ = run("a16_fix_by_other_action.json")
    assert rule.outcome == "failed" and a.action == "interface.bounce"
    store = ingest(tmp_path, FIX / "a16_fix_by_other_action.json")
    (s,) = store.all()
    assert s.evidence.cases[0].outcome == "failed"
    assert s.status == "review"


def test_a17_claimed_authority_does_not_change_role():
    (a, rule), _ = run("a17_role_claim.json")
    assert rule.said_by_role == "field_engineer" and a.trust == "hunch"


@xfail("A1 consequence: the opposite advice with fewer reported symptoms has a different trigger key, so no dispute")
def test_a18_opposite_advice_fewer_symptoms_is_disputed(tmp_path):
    store = ingest(tmp_path, CHAT, FIX / "a18_opposite_fewer_symptoms.json")
    assert sorted(a.status for a in store.all()) == ["disputed", "disputed"]
