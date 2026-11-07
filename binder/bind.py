"""Binder (BACKEND_PROMPT 5.3): resolve the origin entity, add the origin case and the candidate scopes.
Deterministic. Never asks a question, never calls the LLM, never writes to the topology."""
import logging
import re

from binder.condition import EXPIRY, stated_candidate
from binder.resolve import _TOKEN, normalise_id, resolve_entities
from contracts.models import Assertion, Candidate, ExtractedRule, Message, Node, Site, Topology
from predicates import evaluate, lookup, parse

log = logging.getLogger(__name__)

_ONLY_THIS = re.compile(r"\b(?:only|just)\s+(?:this|that)\s+(?:one|unit|node|device|box)\b", re.I)
_CURRENT = re.compile(r"\b(?:now|currently|this|working on)\b[^.?!]{0,12}$", re.I)  # "Now it's X", "working on X"
_ONLY_ID = re.compile(r"\bonly\s+(?:on\s+)?([A-Za-z]+[ _-]?\d+)\b", re.I)


def _ws(s: str) -> str:
    return " ".join(s.split())


def _origin(assertion: Assertion, rule: ExtractedRule, messages: list[Message], topology: Topology) -> Node | Site | None:
    if incident := next((m.incident for m in messages if m.incident), None):
        return lookup(topology, incident.entity_id)
    want = Site if assertion.trigger.kind == "workflow" else Node

    def named(texts: list[str]) -> list[str]:
        return [eid for eid, _ in resolve_entities(texts, topology) if isinstance(lookup(topology, eid), want)]

    if rule.about_entity and (about := named([rule.about_entity])):
        return lookup(topology, about[0])

    # The opening message reports the current incident: one entity there is the origin; several, the one introduced
    # as current ("Now it's TRN-087"); else the most mentioned in the thread. An earlier device named often loses.
    opening = next((m.text for m in messages if named([m.text])), "")
    first = named([opening])
    if len(first) == 1:
        return lookup(topology, first[0])
    for t in _TOKEN.finditer(opening):
        eid = next((e for e in first if normalise_id(e) == normalise_id(t.group(0))), None)
        if eid and _CURRENT.search(opening[:t.start()]):
            return lookup(topology, eid)
    everywhere = named([m.text for m in messages])
    return lookup(topology, everywhere[0]) if everywhere else None


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
    if stated and evaluate(stated.predicate, origin, topology, stated.edge) != "holds":
        # the case happened on the origin, so a scope that excludes it is a mis-parse; it would only ask nonsense
        log.warning("binder: stated candidate %r does not hold on origin %s; dropped", stated.predicate, origin.id)
        stated = None
    expiry = rule.stated_condition and EXPIRY.search(rule.stated_condition)
    note = f"; stated condition '{rule.stated_condition}' did not parse" if rule.stated_condition and not stated and not expiry else ""
    if isinstance(origin, Node):
        attrs = [("model", f"'{origin.model}'", origin.id), ("firmware", f"'{origin.firmware}'", origin.id),
                 ("install_year", str(origin.install_year), origin.id), ("site", f"'{origin.site}'", origin.id)]
        if isinstance(site := lookup(topology, origin.site), Site):
            attrs.append(("region", f"'{site.region}'", f"{origin.id}'s site"))
    else:
        # a site-bound fact (where the key is) is about that site; region is a candidate only if the speaker said so
        attrs = [("site", f"'{origin.id}'", origin.id)]
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
    origin = _origin(assertion, rule, messages, topology)
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
                                  "outcome": None if rule.outcome == "unknown" else rule.outcome}]
    if rule.stated_condition and EXPIRY.search(rule.stated_condition):
        data["valid_while"] = rule.stated_condition  # an end condition, text only (nothing evaluates it)
    if rule.outcome == "failed":
        data["status"] = "review"  # the rule did not work on its own origin: never proposed until a human looks
    return Assertion.model_validate(data)
