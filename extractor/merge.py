"""Merge a bound assertion into the store (BACKEND_PROMPT 5.2). Exact keys only, no fuzzy matching, no model call."""
from contracts.models import Assertion, Topology
from contracts.vocabulary import VALUE_CARRYING_ACTIONS
from extractor.supersede import supersede
from extractor.trust import merged_trust
from extractor.vote import vote

PLACEHOLDER_ID = "CA-0000"


def trigger_key(a: Assertion) -> tuple:
    return (a.trigger.kind, a.trigger.event, tuple(sorted(set(a.trigger.symptoms))))


def key(a: Assertion) -> tuple:
    """(kind, event, sorted symptoms, action). Value-carrying actions additionally match on entity and text in merge()."""
    return (*trigger_key(a), a.action)


def norm_text(text: str) -> str:
    return " ".join(text.lower().split())


def _never_merges(a: Assertion) -> bool:
    return "other" in (a.trigger.event, a.action, *a.trigger.symptoms)  # vocabulary.md: 'other' never merges


def _same_entity(old: Assertion, new: Assertion) -> bool:
    return bool(new.evidence.cases) and new.evidence.cases[0].entity in {c.entity for c in old.evidence.cases}


def _absorb(old: Assertion, new: Assertion, topology: Topology) -> None:
    old.evidence.sources += [s for s in new.evidence.sources if s not in old.evidence.sources]
    for nc in new.evidence.cases:
        dup = next((c for c in old.evidence.cases if c.entity == nc.entity and c.at.date() == nc.at.date()), None)
        if dup is None:
            old.evidence.cases.append(nc)
            vote(old, nc.entity, nc.outcome, topology)
        elif dup.outcome is None and nc.outcome:
            dup.outcome = nc.outcome  # same incident; the other source reported how it ended
            if nc.outcome == "failed":
                old.status = "review"  # as record_outcome: no second vote
    old.trust = merged_trust(old.evidence.cases, old.trust, new.trust)


def _assign_ids(assertions: list[Assertion]) -> None:
    n = max((int(a.id[3:]) for a in assertions), default=0)
    for a in assertions:
        if a.id == PLACEHOLDER_ID:
            n += 1
            a.id = f"CA-{n:04d}"


def merge(existing: list[Assertion], new: Assertion, topology: Topology) -> list[Assertion]:
    """Returns a new list (inputs are not mutated). Superseded assertions are kept but never matched."""
    out = [a.model_copy(deep=True) for a in existing]
    new = new.model_copy(deep=True)
    live = [] if _never_merges(new) else [a for a in out if a.superseded_by is None and not _never_merges(a)]
    value = new.action in VALUE_CARRYING_ACTIONS
    for old in live:
        if key(old) == key(new) and (not value or (_same_entity(old, new) and norm_text(old.action_text) == norm_text(new.action_text))):
            _absorb(old, new, topology)
            _assign_ids(out)
            return out
    out.append(new)
    _assign_ids(out)
    for old in live:
        if trigger_key(old) != trigger_key(new):
            continue
        if old.action != new.action:
            old.status = new.status = "disputed"
        elif value and _same_entity(old, new):
            supersede(old, new)
    return out


def dispute_pairs(assertions: list[Assertion]) -> list[tuple[str, str]]:
    """(id, id) for every two disputed assertions with the same trigger key and different actions; module 6 uses this."""
    d = [a for a in assertions if a.status == "disputed"]
    return [(a.id, b.id) for i, a in enumerate(d) for b in d[i + 1:]
            if trigger_key(a) == trigger_key(b) and a.action != b.action]
