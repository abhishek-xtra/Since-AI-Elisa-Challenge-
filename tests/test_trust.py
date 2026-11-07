"""derive_trust (BACKEND_PROMPT 4.4). The first-hand tests are marked so reverting the first-hand rule is deleting them."""
import pytest

from contracts.models import Case, ExtractedRule
from extractor.trust import derive_trust, merged_trust


def rule(role="expert", hedged=False, first_hand=False):
    return ExtractedRule(trigger_kind="incident", event="sfp_replaced", symptoms=[], stated_condition=None,
                         condition_is_relative=False, action="interface.bounce", action_text="x", avoid=[],
                         excerpt="x", said_by="X", said_by_role=role, hedged=hedged, first_hand=first_hand,
                         outcome="unknown", outcome_excerpt=None)


@pytest.mark.parametrize("r,outcome,expected", [
    (rule(hedged=True), "recovered", "verified_by_outcome"),  # outcome beats everything
    (rule(hedged=True), None, "hunch"),                        # hedged beats expert
    (rule(), None, "stated"),
    (rule(), "failed", "stated"),
    (rule(role="field_engineer"), None, "hunch"),
    (rule(role="other"), None, "hunch"),
])
def test_order(r, outcome, expected):
    assert derive_trust(r, outcome) == expected


# first-hand rule: delete these two tests together with extractor.trust.first_hand_counts to revert it
def test_first_hand_field_engineer_is_stated():
    assert derive_trust(rule(role="field_engineer", first_hand=True), None) == "stated"


def test_first_hand_hedged_is_still_hunch():
    assert derive_trust(rule(role="field_engineer", first_hand=True, hedged=True), None) == "hunch"


def test_merged_trust():
    rec = Case(entity="TRN-042", at="2026-11-01T09:25:00+02:00", outcome="recovered")
    none = Case(entity="TRN-042", at="2026-11-01T09:25:00+02:00", outcome=None)
    assert merged_trust([none, rec], "hunch", "hunch") == "verified_by_outcome"
    assert merged_trust([none], "hunch", "stated") == "stated"
    assert merged_trust([none], "hunch", "hunch") == "hunch"
