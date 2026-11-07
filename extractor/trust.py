"""Trust derivation (BACKEND_PROMPT 4.4). Deterministic; the model never decides trust."""
from contracts.models import Case, ExtractedRule
from contracts.vocabulary import CaseOutcome, Trust


def first_hand_counts(rule: ExtractedRule) -> bool:
    """First-hand trust (late rule). Revert: make this return False and delete its tests in tests/test_trust.py."""
    return rule.first_hand


def derive_trust(rule: ExtractedRule, outcome: CaseOutcome | None) -> Trust:
    """First rule that applies: recovered -> verified_by_outcome; hedged -> hunch; expert or first-hand -> stated; else hunch."""
    if outcome == "recovered":
        return "verified_by_outcome"
    if rule.hedged:
        return "hunch"
    if rule.said_by_role == "expert" or first_hand_counts(rule):
        return "stated"
    return "hunch"


def merged_trust(cases: list[Case], *trusts: Trust) -> Trust:
    """Re-derived on merge: any recovered case -> verified_by_outcome; else stated if any merged source was, else hunch."""
    if any(c.outcome == "recovered" for c in cases):
        return "verified_by_outcome"
    return "stated" if {"stated", "verified_by_outcome"} & set(trusts) else "hunch"
