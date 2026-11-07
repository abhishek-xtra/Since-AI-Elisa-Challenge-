"""Candidate voting (BACKEND_PROMPT 5.2). Pure topology arithmetic, no model call. Mutates and returns the assertion."""
import logging

from contracts.models import Assertion, Site, Topology
from contracts.vocabulary import CaseOutcome
from predicates import evaluate, lookup, parse
from predicates.evaluate import _attribute

log = logging.getLogger(__name__)


def raise_edge(predicate: str, entity, topology: Topology) -> str:
    """Move an open ordering candidate's number to the entity's value ('install_year <= 2019' -> '<= 2020'). No margin."""
    attr, op, _ = parse(predicate)
    value = _attribute(entity, attr, topology)
    op = "<=" if op in ("<", "<=") else ">="
    return f"{attr} {op} {value}" if isinstance(value, int) else f"{attr} {op} '{value}'"


def entity_type(entity) -> str:
    """The entity's kind in applies_to.entity_type terms: 'site' or the node's type."""
    return "site" if isinstance(entity, Site) else entity.type


def vote(assertion: Assertion, case_entity: str, outcome: CaseOutcome | None, topology: Topology) -> Assertion:
    entity = lookup(topology, case_entity)
    if entity is None:
        log.warning("vote skipped: %s not in topology", case_entity)
        return assertion
    if entity_type(entity) != assertion.applies_to.entity_type:
        # a site's attributes say nothing about a node rule (and vice versa); counting it would eliminate candidates
        log.warning("vote skipped: %s is a %s, %s is about %s", case_entity, entity_type(entity), assertion.id,
                    assertion.applies_to.entity_type)
        return assertion
    for c in assertion.applies_to.candidates:
        if c.against:
            continue  # eliminated candidates are not evaluated again
        r = evaluate(c.predicate, entity, topology, c.edge)
        if outcome == "failed":
            if r == "holds":
                c.against += 1
        elif r == "holds":
            c.support += 1
        elif r in ("fails", "missing"):
            c.against += 1
        elif r == "unknown" and c.edge == "open" and outcome == "recovered":
            c.predicate = raise_edge(c.predicate, entity, topology)
            c.support += 1
    if outcome == "failed":
        assertion.status = "review"
    return assertion


def fail_duplicate(assertion: Assertion, case, topology: Topology) -> None:
    """A 'failed' report for a case already counted (same entity, same day, outcome None or 'recovered'): a failure
    always counts, so the case becomes failed, candidates that hold get against, and the assertion goes to review."""
    case.outcome = "failed"
    vote(assertion, case.entity, "failed", topology)
    assertion.status = "review"  # also when vote() skipped the entity
