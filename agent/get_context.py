"""get_context (contracts/get_context.md): the one tool the agent calls. Deterministic, no model call.

Side effects: a question attached to a result is recorded in out/questions.json, and every proposed result appends a
notification to out/notifications.json (both deduplicated).
"""
from datetime import datetime

from agent.notify import notify
from agent.questions import build_question, question_key, record_question
from contracts.models import Assertion, ContextResult, Topology
from extractor.merge import dispute_pairs
from extractor.vote import entity_type
from predicates import evaluate, lookup, parse
from predicates.evaluate import _attribute

TRUST_RANK = {"hunch": 0, "stated": 1, "verified_by_outcome": 2}


def trigger_matches(a: Assertion, event: str, symptoms: list[str]) -> bool:
    if a.trigger.event != event:
        return False
    return a.trigger.kind == "workflow" or set(a.trigger.symptoms) <= set(symptoms)


def validity_reason(a: Assertion, at: datetime) -> str | None:
    if a.valid_from > at:
        return f"not yet valid on {at.date().isoformat()}, valid from {a.valid_from.date().isoformat()}"
    if a.valid_to is not None and at >= a.valid_to:
        if a.superseded_by:
            return f"superseded by {a.superseded_by} on {a.valid_to.date().isoformat()}"
        return f"expired {a.valid_to.date().isoformat()}"
    return None


def scope_results(a: Assertion, entity, topology: Topology) -> dict[str, str]:
    """Candidate predicate -> holds/fails/unknown/missing; only decided if set, else every candidate with against == 0."""
    d = a.applies_to.decided
    if d:
        return {d.predicate: evaluate(d.predicate, entity, topology, d.edge)}
    return {c.predicate: evaluate(c.predicate, entity, topology, c.edge) for c in a.applies_to.candidates if c.against == 0}


def describe(predicate: str, result: str, entity, topology: Topology) -> str:
    attr, _, value = parse(predicate)
    actual = _attribute(entity, attr, topology)
    if result == "unknown":
        return f"{attr.replace('_', ' ')} {actual} is beyond the known edge {value}"
    if result == "missing":
        return f"{attr} is missing on {entity.id} for {predicate}"
    return f"{attr} {actual} {result} {predicate}"


def scope_outcome(results: dict[str, str], entity, topology: Topology) -> tuple[str, str]:
    held = [p for p, r in results.items() if r == "holds"]
    failed = [p for p, r in results.items() if r in ("fails", "missing")]
    unknown = [p for p, r in results.items() if r == "unknown"]
    say = lambda ps: "; ".join(describe(p, results[p], entity, topology) for p in ps)
    if not results:  # every candidate eliminated and nothing decided: no scope is left that could hold
        return "declined", "no surviving scope candidate"
    if not failed and not unknown:
        return "proposed", f"all hold: {', '.join(held)}"
    if failed and not held:
        return "declined", say(failed) + (f". Unknown: {say(unknown)}" if unknown else "")
    if failed:
        return "ambiguous", f"{say(failed)}; but {say(held)}" + (f"; unknown: {say(unknown)}" if unknown else "")
    return "ambiguous", say(unknown)


def filter_one(a: Assertion, entity, topology: Topology, at: datetime) -> ContextResult:
    """Steps 2 to 5 for one trigger-matched assertion (precedence among disputed ones is applied afterwards)."""
    if reason := validity_reason(a, at):
        return ContextResult(assertion=a, outcome="declined", reason=reason)
    if entity_type(entity) != a.applies_to.entity_type:
        return ContextResult(assertion=a, outcome="declined",
                             reason=f"entity type {entity_type(entity)} does not match {a.applies_to.entity_type}")
    try:
        results = scope_results(a, entity, topology)
        outcome, reason = scope_outcome(results, entity, topology)
    except ValueError as e:  # one bad stored predicate declines its own assertion, never the others
        return ContextResult(assertion=a, outcome="declined", reason=f"invalid predicate: {e}")
    if outcome == "declined":
        return ContextResult(assertion=a, outcome=outcome, reason=reason)
    if a.trust == "hunch":
        return ContextResult(assertion=a, outcome="declined", reason="hunch, not verified")
    if a.status == "review":
        return ContextResult(assertion=a, outcome="declined", reason="under review")
    question = None
    if outcome == "ambiguous" and question_key(results) not in a.questions_asked:
        question = build_question(a, entity, results, topology)
    return ContextResult(assertion=a, outcome=outcome, reason=reason, question=question)


def _rank(a: Assertion) -> tuple:
    return TRUST_RANK[a.trust], len(a.evidence.cases)


def precedence(results: list[ContextResult]) -> None:
    """Disputed assertions still proposed after steps 2-5, paired by dispute_pairs: trust, then cases, then newer."""
    live = {r.assertion.id: r for r in results if r.outcome == "proposed" and r.assertion.status == "disputed"}
    pairs = dispute_pairs([r.assertion for r in live.values()])
    for id, r in live.items():
        rivals = [live[b if a == id else a] for a, b in pairs if id in (a, b)]
        if not rivals:
            continue
        mine = (*_rank(r.assertion), r.assertion.valid_from)
        theirs = [(*_rank(o.assertion), o.assertion.valid_from) for o in rivals]
        note = "; ".join(f"{o.assertion.evidence.said_by}'s {o.assertion.action_text}, {o.assertion.trust}" for o in rivals)
        if all(mine > t for t in theirs):
            r.reason = f"disputed: {note}"
        elif mine == max(theirs + [mine]):
            r.outcome, r.reason = "ambiguous", "tied dispute, escalate"
        else:
            r.outcome, r.reason = "declined", f"disputed, lower precedence than {note}"


def get_context(store, topology: Topology, entity_id: str, event: str, symptoms: list[str],
                at_time: datetime) -> list[ContextResult]:
    if at_time.tzinfo is None or at_time.utcoffset() is None:
        raise ValueError("at_time must be timezone-aware")
    entity = lookup(topology, entity_id)
    if entity is None:
        raise ValueError(f"{entity_id} is not in the topology")
    results = [filter_one(a, entity, topology, at_time) for a in store.all() if trigger_matches(a, event, symptoms)]
    precedence(results)
    for r in results:
        if r.question:
            record_question(r.question, entity_id)
    notify(results, entity_id, at_time)
    return results
