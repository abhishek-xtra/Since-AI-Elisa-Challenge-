"""Pydantic mirrors of the JSON Schemas in contracts/, plus the extractor's LLM output models.

The *.schema.json files are generated from these models: `py -3.14 -m contracts.models`.
tests/test_contracts.py fails if a committed schema drifts from the models.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from contracts.vocabulary import (Action, CaseOutcome, Channel, Edge, EdgeAnswer, EntityType, Event, ExtractedOutcome, NodeType,
                                  Outcome, Role, Status, Symptom, TriggerKind, Trust)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------- message.schema.json ----------

class Incident(Strict):
    """Present only when the message is a reply inside the agent's own escalation thread; the binder then skips entity resolution and uses these fields."""
    entity_id: str = Field(description="Topology node or site ID the incident is on.")
    event: Event = Field(description="Event from contracts/vocabulary.md.")
    symptoms: list[Symptom] = Field(description="Observed symptoms from contracts/vocabulary.md.")


class Message(Strict):
    """One message from any channel. Ticket IDs are never modelled; a ticket number in text is free text."""
    id: str = Field(description="Unique message ID, e.g. 'teams:thread-001:1'.")
    author: str = Field(description="Display name of the speaker.")
    role: Role = Field(description="Speaker's role, mapped from the source's free-text role.")
    timestamp: datetime = Field(description="ISO 8601. Elisa's chat has times only; the adapter attaches the synthetic date 2026-11-01 and documents it.")
    channel: Channel = Field(description="Where the message came from.")
    thread_id: str = Field(description="Conversation the message belongs to; questions are posted back into this thread.")
    text: str = Field(description="Message text, verbatim.")
    incident: Incident | None = Field(default=None, description="Only in the agent's own escalation thread. Absent everywhere else.")


# ---------- topology.schema.json ----------

class Node(Strict):
    """A device in Elisa's network graph. Read-only: nothing in this system ever writes to a node."""
    id: str = Field(description="Node ID, e.g. 'TRN-042'.")
    type: NodeType = Field(description="Device type.")
    model: str = Field(description="Hardware model, e.g. 'TX-200'.")
    install_year: int = Field(description="Year the unit was installed.")
    firmware: str = Field(pattern=r"^\d+(\.\d+)*$", description="Dotted version string, compared as a numeric tuple ('5.10' > '5.2').")
    site: str = Field(description="ID of the Site the node is in.")


class Site(Strict):
    """A physical site. Region is resolved for nodes through their site."""
    id: str = Field(description="Site ID, e.g. 'OULU-03'.")
    name: str = Field(description="Human-readable name.")
    region: str = Field(description="Region, e.g. 'north'.")
    access: str = Field(description="Free text about physical access, may be empty. The barrier key location is NOT stored here; it is captured as an assertion bound to the site.")


class Topology(Strict):
    """Synthetic copy of Elisa's network graph. Links between devices are pending Elisa's answer and deliberately absent."""
    sites: list[Site] = Field(description="All sites.")
    nodes: list[Node] = Field(description="All nodes. Each node's site must be one of the sites.")


# ---------- assertion.schema.json ----------

class Trigger(Strict):
    """When the assertion applies. kind 'incident': event plus every listed symptom must be present (checks the agent runs against telemetry). kind 'workflow': event only, e.g. 'dispatch_created' with the site as entity; the barrier key is a workflow trigger with action 'site.access_key' and action_text holding the key location."""
    kind: TriggerKind = Field(description="'incident' (event + symptoms) or 'workflow' (event only).")
    event: Event = Field(description="Event from contracts/vocabulary.md.")
    symptoms: list[Symptom] = Field(description="All must be present for an incident trigger to match. Empty for a workflow trigger.")


class Candidate(Strict):
    """One hypothesis for the assertion's scope, a predicate over topology attributes (contracts/predicates.md). The device ID is never a candidate: the device is the origin of the case in evidence.cases. Only if the text limits the rule to that unit ('only this one') is "id == 'X'" added. A candidate with against > 0 is eliminated."""
    predicate: str = Field(description="'attr op value', grammar in contracts/predicates.md.")
    edge: Edge = Field(default="closed", description="Open edge: 'open' when the stated condition is relative (condition_is_relative) and the predicate's number came from the origin node's attribute, not from the speaker. The number is then the newest value known to be in, not a boundary. Everything else is 'closed'. On a new entity an open <=/< candidate holds at or below its number, is unknown above it, and fails only for a missing attribute. A supporting case or a 'yes' answer on a newer entity raises the number; a 'no' answer closes the edge at the current number. Never invent a margin.")
    support: int = Field(ge=0, description="Number of cases (not sources) whose entity satisfied this predicate.")
    against: int = Field(ge=0, description="Number of cases whose entity failed this predicate, or failed outcomes where it held. > 0 eliminates the candidate.")
    basis: str = Field(description="One sentence: where this candidate came from (speaker's words or the origin's attribute).")


class Decided(Strict):
    """The predicate a human answer (or evidence leaving one) fixed. Other candidates stay recorded but are not evaluated."""
    predicate: str = Field(description="Predicate, same grammar as Candidate.predicate.")
    edge: Edge = Field(default="closed", description="Edge of the decided predicate, carried over from the option chosen.")


class AppliesTo(Strict):
    """Scope as a set of candidate predicates over topology attributes. Candidates are not ranked."""
    entity_type: EntityType = Field(description="Type of entity the assertion binds to; 'site' for a workflow trigger.")
    candidates: list[Candidate] = Field(description="Every plausible scope from the first case: the stated condition plus one per origin attribute (model, firmware, install_year if not already present, site, region). Never the device ID unless the text limits it to that unit.")
    decided: Decided | None = Field(description="Set by an answer to the one question; null while undecided.")


class Case(Strict):
    """A distinct incident: entity plus time. Chat and email about the same incident (same entity, same day) are one case."""
    entity: str = Field(description="Node or site ID the case happened on (the origin, for the first case).")
    at: datetime = Field(description="When the incident happened.")
    outcome: CaseOutcome | None = Field(description="'recovered' from a thread confirmation ('traffic is back') or a telemetry event; 'failed' if the action did not work; null if not reported.")


class Evidence(Strict):
    """Provenance. cases are distinct incidents (entity + time); sources are documents. Erkki's chat and email are one case, two sources. support counts cases."""
    cases: list[Case] = Field(description="Distinct incidents backing the assertion.")
    sources: list[str] = Field(description="Documents, as '<channel>:<id>', e.g. 'teams:thread-001', 'email:001'.")
    excerpt: str = Field(description="Copied character for character from the source; re-verified as a substring after whitespace normalisation.")
    said_by_role: Role = Field(description="Role of the speaker of the rule.")
    said_by: str = Field(description="Name of the speaker of the rule; the one question and the notification go to this person.")


class Assertion(Strict):
    """A context assertion: a reusable operational rule captured from a conversation. Nothing is ever deleted."""
    id: str = Field(pattern=r"^CA-\d{4}$", description="'CA-' plus four digits.")
    trigger: Trigger
    applies_to: AppliesTo
    action: Action = Field(description="Canonical action from contracts/vocabulary.md.")
    action_text: str = Field(description="The action in the speaker's words. For a value-carrying action (site.access_key) this is the fact itself, e.g. where the key is.")
    avoid: list[Action] = Field(description="Actions the speaker warned against.")
    evidence: Evidence
    trust: Trust = Field(description="Derived deterministically, first rule that applies: (1) any case with outcome 'recovered' -> verified_by_outcome; (2) hedged -> hunch; (3) said_by_role == expert or first_hand -> stated; (4) otherwise hunch. A field engineer reporting what he did or saw on site is 'stated'. Trust and support are separate axes.")
    status: Status = Field(description="open: candidates undecided; decided: answered or evidence left one; disputed: conflicts with another assertion; review: an outcome contradicted it.")
    questions_asked: list[str] = Field(description="Question keys (contracts/get_context.md). A key is appended once and never removed.")
    supersedes: str | None = Field(description="ID of the assertion this one replaced. Set only by the supersede rule (BACKEND_PROMPT 5.2) for value-carrying actions.")
    superseded_by: str | None = Field(description="ID of the assertion that replaced this one. Set only by the supersede rule, together with valid_to. Nothing is ever deleted.")
    recorded_at: datetime = Field(description="When the system learned it (ingestion time).")
    valid_from: datetime = Field(description="When it became true (conversation time).")
    valid_to: datetime | None = Field(description="null means still believed true.")
    valid_while: str | None = Field(description="Stated end condition, stored as text only. Nothing evaluates it (pending).")


# ---------- get_context results (contracts/get_context.md) ----------

class Option(Strict):
    """One tap-able answer. A scope option sets decided; an edge option raises or closes an open candidate and leaves decided unchanged."""
    label: str = Field(description="Button text, e.g. 'All older units', 'Only OULU-07', 'No', 'Yes'.")
    sets_decided: str | None = Field(default=None, description="Predicate this option writes into applies_to.decided; null for an edge option.")
    edge: Edge | None = Field(default=None, description="Edge of sets_decided ('open' for the relative condition); null means closed.")
    edge_answer: EdgeAnswer | None = Field(default=None, description="Edge question only: 'raise' moves the open candidate's number to the entity's value (edge stays open); 'close' closes the edge at the current number.")


class Question(Strict):
    """The one question, built only inside get_context on 'ambiguous' when its key is not yet in questions_asked."""
    assertion_id: str = Field(description="Assertion the question is about.")
    key: str = Field(description="Sorted (candidate predicate, evaluation result) pairs that made it ambiguous; format in contracts/get_context.md.")
    to: str = Field(description="evidence.said_by of the assertion.")
    thread_id: str = Field(description="The expert's original thread; the question is posted there.")
    text: str = Field(description="One short sentence naming the new entity and the disagreeing attribute.")
    options: list[Option] = Field(description="Generated from the disagreeing candidates, plus 'No'.")


class ContextResult(Strict):
    """What get_context returns for one assertion whose trigger matched."""
    assertion: Assertion
    outcome: Outcome = Field(description="proposed, declined or ambiguous.")
    reason: str = Field(description="One sentence built from the fields: failing, unknown or disagreeing candidates, expiry, supersession, trust or dispute.")
    question: Question | None = Field(default=None, description="Attached only on 'ambiguous' with a key not yet asked.")


# ---------- extractor LLM output (sent to Gemini as response_schema: flat, Literal enums, no extra-forbid) ----------

class ExtractedRule(BaseModel):
    """One reusable operational rule: a condition plus an action that would apply to a future incident, not a one-off instruction."""
    trigger_kind: TriggerKind = Field(description="'incident' if the rule is about diagnosing a fault (event plus symptoms); 'workflow' if it is about a work step such as a dispatch to a site (event only).")
    event: Event = Field(description="The event that starts the situation. Use 'other' if none of the listed events fits.")
    symptoms: list[Symptom] = Field(description="Observed symptoms the rule's condition requires, from the list only. Empty for a workflow rule.")
    stated_condition: str | None = Field(description="The scope condition in the speaker's own words, e.g. 'older units' or 'units installed before 2019'. null if none was stated.")
    condition_is_relative: bool = Field(description="true when the stated condition is a comparative with no number stated by the rule's speaker ('older units', 'the big sites'), even if someone else in the thread guessed a number.")
    action: Action = Field(description="The canonical action the rule recommends. Use 'other' if none fits.")
    action_text: str = Field(description="The recommended action in the speaker's words, short. For site.access_key, where the key is.")
    avoid: list[Action] = Field(description="Actions the speaker says not to do (e.g. 'don't reboot' -> node.reboot).")
    excerpt: str = Field(description="The sentence(s) stating the rule, copied character for character from the conversation.")
    said_by: str = Field(description="Name of the person who stated the rule, as written in the conversation.")
    said_by_role: Role = Field(description="That person's role.")
    hedged: bool = Field(description="true when the speaker hedges: 'maybe', 'I think', 'might', 'someone said'.")
    first_hand: bool = Field(description="true only when the speaker reports something they did or saw themselves ('I moved it', 'it's in the cabinet now', 'I'm at the site and the gate is open'), not something they were told.")
    outcome: ExtractedOutcome = Field(description="'recovered' only if a later message reports the action worked ('traffic is back', 'did that, works'); 'failed' only if a later message reports the action was tried and did not work ('didn't help', 'no change, had to reboot'); otherwise 'unknown'.")
    outcome_excerpt: str | None = Field(description="The confirming or failing message text, copied character for character; null when outcome is 'unknown'.")


class ExtractionResult(BaseModel):
    """Whether the thread contains a reusable rule, and the rule if so."""
    found: bool = Field(description="false when the thread contains no reusable rule.")
    rule: ExtractedRule | None = Field(description="The one rule most strongly stated; null when found is false.")
    reason: str = Field(description="One short sentence explaining the decision.")


# ---------- schema generation ----------

SCHEMAS = {"message": Message, "topology": Topology, "assertion": Assertion}
TOPOLOGY_COMMENT = "PLACEHOLDER: links between devices (and peer.* predicates) are pending Elisa's answer. Do not add them until the human changes this contract."


def json_schema(name: str) -> dict:
    s = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": f"{name}.schema.json", **SCHEMAS[name].model_json_schema()}
    if name == "topology":
        s["$comment"] = TOPOLOGY_COMMENT
    return s


if __name__ == "__main__":
    for name in SCHEMAS:
        (Path(__file__).parent / f"{name}.schema.json").write_text(json.dumps(json_schema(name), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
