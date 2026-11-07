"""Binder (BACKEND_PROMPT 5.3): resolve the origin entity, add the origin case and the candidate scopes.
Deterministic. Never asks a question, never calls the LLM, never writes to the topology."""
import logging
import re

from binder.condition import stated_candidate
from binder.resolve import normalise_id, resolve_entities
from contracts.models import Assertion, Candidate, ExtractedRule, Message, Node, Site, Topology
from predicates import lookup, parse

log = logging.getLogger(__name__)

_ONLY_THIS = re.compile(r"\b(?:only|just)\s+(?:this|that)\s+(?:one|unit|node|device|box)\b", re.I)
_ONLY_ID = re.compile(r"\bonly\s+(?:on\s+)?([A-Za-z]+[ _-]?\d+)\b", re.I)


def _ws(s: str) -> str:
    return " ".join(s.split())


def _origin(assertion: Assertion, messages: list[Message], topology: Topology) -> Node | Site | None:
    if incident := next((m.incident for m in messages if m.incident), None):
        return lookup(topology, incident.entity_id)
    want = Site if assertion.trigger.kind == "workflow" else Node
    for eid, _ in resolve_entities([m.text for m in messages], topology):
        if isinstance(entity := lookup(topology, eid), want):
            return entity
    return None


def _only_this(rule: ExtractedRule, origin_id: str) -> str | None:
    """The phrase limiting the rule to the origin unit, if the condition or excerpt has one."""
    for text in (rule.stated_condition or "", rule.excerpt):
        if m := _ONLY_THIS.search(text):
            return m.group(0)
        for m in _ONLY_ID.finditer(text):
            if normalise_id(m.group(1)) == normalise_id(origin_id):
                return m.group(0)
    return None


def _candidates(rule: ExtractedRule, origin: Node | Site, topology: Topology) -> list[Candidate]:
    if phrase := _only_this(rule, origin.id):
        return [Candidate(predicate=f"id == '{origin.id}'", support=1, against=0, basis=f"{rule.said_by}: '{phrase}'")]
    stated = stated_candidate(rule, origin, topology)
    note = f"; stated condition '{rule.stated_condition}' did not parse" if rule.stated_condition and not stated else ""
    if isinstance(origin, Node):
        attrs = [("model", f"'{origin.model}'", origin.id), ("firmware", f"'{origin.firmware}'", origin.id),
                 ("install_year", str(origin.install_year), origin.id), ("site", f"'{origin.site}'", origin.id)]
        if isinstance(site := lookup(topology, origin.site), Site):
            attrs.append(("region", f"'{site.region}'", f"{origin.id}'s site"))
    else:
        attrs = [("site", f"'{origin.id}'", origin.id), ("region", f"'{origin.region}'", origin.id)]
    out = [stated] if stated else []
    for attr, value, of in attrs:
        predicate = f"{attr} == {value}"
        if predicate in {c.predicate for c in out} or (attr == "install_year" and any(parse(c.predicate)[0] == attr for c in out)):
            continue
        out.append(Candidate(predicate=predicate, support=1, against=0, basis=f"attribute of {of}{note}"))
    return out


def bind(assertion: Assertion, rule: ExtractedRule, messages: list[Message], topology: Topology) -> Assertion:
    """A new Assertion bound to its origin entity; the input is not mutated. No origin -> unbound, status 'review'."""
    data = assertion.model_dump()
    origin = _origin(assertion, messages, topology)
    if origin is None:
        # The Assertion schema has no free-text note field, so the reason goes to the log.
        log.warning("binder: no topology entity resolved for %s (excerpt %r); stored unbound, status review",
                    assertion.id, rule.excerpt)
        data["applies_to"]["candidates"] = []
        data["evidence"]["cases"] = []
        data["status"] = "review"
        return Assertion.model_validate(data)
    excerpt = _ws(rule.excerpt)
    holder = next((m for m in messages if excerpt and excerpt in _ws(m.text)), messages[0])
    if isinstance(origin, Site):
        data["applies_to"]["entity_type"] = "site"
    elif origin.type in ("transmission_node", "router"):
        data["applies_to"]["entity_type"] = origin.type
    data["applies_to"]["candidates"] = [c.model_dump() for c in _candidates(rule, origin, topology)]
    data["evidence"]["cases"] = [{"entity": origin.id, "at": holder.timestamp,
                                  "outcome": "recovered" if rule.outcome_confirmed else None}]
    return Assertion.model_validate(data)
