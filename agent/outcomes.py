"""record_outcome (BACKEND_PROMPT 5.6): append a case, vote (extractor.vote), re-derive trust. No model call."""
from datetime import datetime

from contracts.models import Assertion, Case, Topology
from contracts.vocabulary import CaseOutcome
from extractor.trust import merged_trust
from extractor.vote import fail_duplicate, vote


def record_outcome(store, topology: Topology, assertion_id: str, entity_id: str, outcome: CaseOutcome,
                   at: datetime) -> Assertion:
    a = store.get(assertion_id)
    if a is None:
        raise ValueError(f"unknown assertion {assertion_id}")
    a = a.model_copy(deep=True)
    dup = next((c for c in a.evidence.cases if c.entity == entity_id and c.at.date() == at.date()), None)
    if dup is None:
        a.evidence.cases.append(Case(entity=entity_id, at=at, outcome=outcome))
        vote(a, entity_id, outcome, topology)
    elif outcome == "failed" and dup.outcome != "failed":
        fail_duplicate(a, dup, topology)  # None -> failed or recovered -> failed: the failure counts
    elif dup.outcome is None:
        dup.outcome = outcome  # same incident, now with its outcome; no second vote (as in merge)
    a.trust = merged_trust(a.evidence.cases, a.trust)
    store.put(a)
    return a
