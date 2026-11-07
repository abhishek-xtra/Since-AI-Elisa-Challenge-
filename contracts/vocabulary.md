# Controlled vocabulary

The extractor maps every word it reads into these lists. Anything that does not fit becomes `other`, keeps its wording in the free-text field next to it (`action_text`, `stated_condition`), and never merges with anything. Extend only by editing this file, then `contracts/vocabulary.py` to match (a test checks they agree).

Each list is one bullet: `- <name>: ` followed by backticked values. Notes go on the following indented lines.

- events: `sfp_replaced`, `dispatch_created`, `alarm_raised`, `other`
  - `other` added so the extractor never has to invent an event (BACKEND_PROMPT 2b: "Include `other` in every enum").
- symptoms: `link_up`, `link_down`, `optics_normal`, `optics_low`, `counters_zero`, `counters_rising`, `alarms_cleared`, `other`
  - `other` added for the same reason.
- actions: `interface.bounce`, `node.reboot`, `sfp.replace`, `counters.check`, `site.access_key`, `other`
- value-carrying actions: `site.access_key`
  - Their `action_text` is a fact that can change (where the key is), not a procedure. Only these are keyed on `action_text` and can supersede each other (5.2). Procedural actions never are; different wordings of the same procedure merge as cases.
- trust: `hunch`, `stated`, `verified_by_outcome`
- assertion status: `open`, `decided`, `disputed`, `review`
- per-entity outcome: `proposed`, `declined`, `ambiguous`
  - The outcome of `get_context` for one assertion on one entity.
- trigger kinds: `incident`, `workflow`
- candidate edges: `open`, `closed`
- predicate results: `holds`, `fails`, `unknown`, `missing`
  - What `evaluate` returns (contracts/predicates.md).
- case outcomes: `recovered`, `failed`
  - `null` when no outcome was reported for the case.
- extracted outcomes: `recovered`, `failed`, `unknown`
  - What the extractor reports for the thread; `unknown` becomes `null` on the case.
- roles: `field_engineer`, `expert`, `agent`, `other`
- channels: `teams`, `email`, `agent_thread`
- node types: `transmission_node`, `router`, `other`
- entity types: `transmission_node`, `router`, `site`
  - What an assertion's `applies_to.entity_type` can be. A workflow trigger (the barrier key) applies to a `site`.
- edge answers: `raise`, `close`
  - What an option of an edge question does to an `open` candidate (contracts/get_context.md).
- teams: `network-experts`, `field-operations`
  - The team that owns a question's domain (contracts/get_context.md): `network-experts` for an incident-trigger rule, `field-operations` for a workflow-trigger rule.
