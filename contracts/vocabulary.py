"""Every controlled value, in one place. Mirrors contracts/vocabulary.md (tests/test_contracts.py checks)."""
from typing import Literal, get_args

Event = Literal["sfp_replaced", "dispatch_created", "alarm_raised", "other"]
Symptom = Literal["link_up", "link_down", "optics_normal", "optics_low", "counters_zero", "counters_rising", "alarms_cleared", "other"]
Action = Literal["interface.bounce", "node.reboot", "sfp.replace", "counters.check", "site.access_key", "other"]
ValueCarryingAction = Literal["site.access_key"]
Trust = Literal["hunch", "stated", "verified_by_outcome"]
Status = Literal["open", "decided", "disputed", "review"]
Outcome = Literal["proposed", "declined", "ambiguous"]
TriggerKind = Literal["incident", "workflow"]
Edge = Literal["open", "closed"]
PredicateResult = Literal["holds", "fails", "unknown", "missing"]
CaseOutcome = Literal["recovered", "failed"]
ExtractedOutcome = Literal["recovered", "failed", "unknown"]
Role = Literal["field_engineer", "expert", "agent", "other"]
Channel = Literal["teams", "email", "agent_thread"]
NodeType = Literal["transmission_node", "router", "other"]
EntityType = Literal["transmission_node", "router", "site"]
EdgeAnswer = Literal["raise", "close"]

# list name in vocabulary.md -> Literal
LISTS = {
    "events": Event, "symptoms": Symptom, "actions": Action, "value-carrying actions": ValueCarryingAction,
    "trust": Trust, "assertion status": Status, "per-entity outcome": Outcome, "trigger kinds": TriggerKind,
    "candidate edges": Edge, "predicate results": PredicateResult, "case outcomes": CaseOutcome, "extracted outcomes": ExtractedOutcome,
    "roles": Role, "channels": Channel, "node types": NodeType, "entity types": EntityType, "edge answers": EdgeAnswer,
}
VALUE_CARRYING_ACTIONS = frozenset(get_args(ValueCarryingAction))
