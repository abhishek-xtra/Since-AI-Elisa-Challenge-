"""Candidate voting (BACKEND_PROMPT 5.2). Pure topology arithmetic, no model call. Mutates and returns the assertion."""
import logging

from contracts.models import Assertion, Topology
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


def vote(assertion: Assertion, case_entity: str, outcome: CaseOutcome | None, topology: Topology) -> Assertion:
    entity = lookup(topology, case_entity)
    if entity is None:
        log.warning("vote skipped: %s not in topology", case_entity)
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
