# BACKEND PROMPT: Elisa hidden-knowledge context layer

You are building the backend of a hackathon entry for Elisa's "hidden knowledge" challenge. The full plan is `HANDOFF.md` in this repo (the merged team handoff; `MIKAEL_HANDOFF.md` and `ABHISHEK_HANDOFF.md` are history). This prompt is the build spec distilled from it, and it already includes Part A and item B1 of `BACKEND_PROMPT_ADDENDUM.md` (supersede rule, first-hand trust, beat 6, graph shape); do not read the addendum for anything else. Where this prompt and the handoff disagree, this prompt wins for the build. Read `HANDOFF.md` sections 4, 5, 12 and Appendix A before writing code. Read `TRANSCRIPT_RECORDING.md` only if a design question comes up.

Deadline for a working spine: Saturday 7 November 2026, 14:00. Feature freeze 20:00. The video is recorded from `demo.py` after 20:00. Nothing that is not produced by `demo.py` exists as far as the judges are concerned.

## 1. What the system does, in one paragraph

It reads conversations people already have (a Teams chat JSON, an email), notices when someone states a reusable operational rule, and stores it as a **context assertion**: a trigger the agent can check against telemetry, a set of candidate scopes over network-topology attributes, a canonical action, an avoid list, evidence, trust and validity. It never asks the expert anything at capture time. The assertion is bound into a synthetic copy of Elisa's network graph with one edge per candidate scope. When a new incident arrives anywhere in the graph, a single tool `get_context` returns, deterministically, one of three outcomes per assertion: `proposed`, `declined` (with the failing candidate), or `ambiguous`. On `ambiguous` the system produces one question for the original expert, once per distinct ambiguity, never the same one twice. Later cases add `support` or `against` to candidates and eliminate the wrong ones. Conflicting assertions are ordered by a visible precedence; only a tie escalates. The system is advisory. It never acts on the network and never modifies the topology nodes.

What this is: candidate elimination over the topology. No numeric confidence, no probabilities, no learned scores, anywhere. Every answer must be explainable in one sentence built from the fields.

## 2. Hard rules for how you work

1. **Contracts first, then frozen.** Write everything in `contracts/` first, show it to the human, and after approval never edit it. If a contract is wrong, say so and stop; the human changes it.
2. **One module per task, in the order in section 6.** Each module has one pytest file and one human gate. Do not start the next module until the human has run the gate command. Report the exact command to run. "It works" without the human running it does not count.
3. **All LLM calls go through `llm.py`**, Gemini on Vertex AI, with a disk cache. The full rules are in section 2b. Nothing else in the codebase imports an LLM SDK.
4. **No invented vocabulary.** The extractor maps into `contracts/vocabulary.md`. Anything outside becomes `other` with its text and never merges.
5. **Python 3.12 or newer (the machine has 3.14 via `py -3.14`), `pytest`, `pydantic` for the contracts, `google-genai`, `neo4j` driver, `pyvis` for the fallback export, `fastapi` and `uvicorn` only for the thin read API in section 8.** No other dependencies without asking. The submission form has a "Generative AI in your project" field and a Gemini prize category: `README.md` must state which Gemini models were used for what.
6. **Build nothing from the "stretch" or "pending" lists in section 9.** Leave the named hooks, nothing more.
7. **Honest reporting.** If a gate fails, say which assertion failed and why. Do not weaken a test to pass it.

## 2b. LLM rules: Gemini on Google Cloud Vertex AI

**Setup, already done by the human.** Project `project-f6c7adf3-6f57-4fdb-90e`, Vertex AI API enabled, Application Default Credentials via `gcloud auth application-default login`, `GOOGLE_CLOUD_PROJECT` set in the environment. There is no API key anywhere. Nothing reads `GOOGLE_API_KEY` or any `ANTHROPIC_*` variable. If ADC is missing, say so and stop; do not invent an auth path.

**Client.** `pip install google-genai`. One module-level client in `llm.py`:

```python
from google import genai
from google.genai import types
client = genai.Client(vertexai=True, project=os.environ["GOOGLE_CLOUD_PROJECT"], location="global")
```

Verify the exact call signatures against the installed SDK version (`pip show google-genai`, and the package's own docstrings) before relying on them; do not trust memory for parameter names.

**Models, verified on this project on Saturday 7 November (HTTP 200 at the `global` location; every 2.5 and 3.x ID returns 404, and `us-central1` returns 404 for everything, so never change the location):**

- `EXTRACT_MODEL = "gemini-4-argon"`
- `GENERATE_MODEL = "gemini-3.5-flash"` (a different model, on purpose, for synthetic threads)

Both IDs are constants at the top of `llm.py` and nowhere else. At step 0 make one call to each and print the `model_version` from the response into `README.md`. If a call returns 404 or "not allowed to use Publisher Model", say so and stop; do not search for other IDs.

**One function.** `llm.structured(system: str, user: str, schema: type[BaseModel], model: str = EXTRACT_MODEL) -> BaseModel | None`:

- `config=types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json", response_schema=schema, temperature=0, max_output_tokens=4096, safety_settings=<all categories BLOCK_NONE>)`. Safety filters otherwise trip on ordinary network-operations text ("kill the process", "attack surface"); the content is synthetic and technical.
- Parse `response.text` with `schema.model_validate_json`. On a JSON or validation error, retry once with the error message appended to the user prompt. On the second failure, raise with the raw text in the message. Never return a partially valid object.
- Retry 429 and 503 with exponential backoff, five attempts, then raise.
- **Cache**: key = SHA-256 of (model, system, user, schema JSON). Store under `.llm_cache/<key>.json` with the raw response text. Read before calling. Commit the directory. A `LLM_OFFLINE=1` environment variable makes a cache miss raise instead of calling, so CI and the demo prove they run offline.
- Log model, token usage from `response.usage_metadata`, and cache hit or miss, one line per call.

**Schema rules that keep Gemini's structured output stable.** Gemini's `response_schema` accepts a subset of JSON Schema. Follow these or the call fails or drifts:

- Define every output type as a pydantic model with flat, explicit fields. No `dict[str, Any]`, no `additionalProperties`, no recursive models, no `anyOf` unions other than `Optional[X]`.
- Controlled values are `Literal[...]` or `Enum` built from `contracts/vocabulary.md`, so the model cannot invent a symptom or action. Include `"other"` in every enum.
- Lists have item types that are themselves flat models or literals.
- Keep output models small: the extractor's output is `ExtractedRule` (trigger kind, event, symptoms, stated_condition as text, condition_is_relative: bool, action, action_text, avoid, excerpt, said_by, said_by_role, hedged: bool, first_hand: bool, outcome_confirmed: bool, outcome_excerpt), or `null` via a wrapper `ExtractionResult { found: bool, rule: Optional[ExtractedRule], reason: str }`. Binding, trust, candidates, dates and IDs are **not** produced by the model; `binder/` and `extractor/` derive them deterministically from the output.
- Put field descriptions in `Field(description=...)`. They are sent to the model and they matter.

**Prompt rules for the extractor.**

- System prompt: the role (an assistant that spots reusable operational rules in network-operations conversations), the vocabulary lists verbatim, the definition of a reusable rule (a condition plus an action that would apply to a future incident, not a one-off instruction), and the hard rules: `excerpt` must be copied character for character from the conversation; `found=false` when the thread contains no reusable rule; one rule per thread, the one most strongly stated; `hedged=true` when the speaker says "maybe", "I think", "might"; `first_hand=true` only when the speaker reports something they did or saw themselves ("I moved it", "it's in the cabinet now", "I'm at the site and the gate is open"), not something they were told; `condition_is_relative=true` when the stated condition is a comparative with no number stated by the rule's speaker ("older units", "the big sites"), even if someone else in the thread guessed a number; `outcome_confirmed=true` only if a later message reports the action worked.
- User prompt: the thread as `[time] Name (role): text` lines, nothing else.
- One worked example in the system prompt, from a **different domain than the fixture** (a power-supply fan rule, not the SFP rule), so the test on Erkki's thread is not circular.
- The evidence check in `extractor/` re-verifies the excerpt as a substring after whitespace normalisation, regardless of what the model claims.

**Prompt rules for synthetic-thread generation (`GENERATE_MODEL`).**

- Input is a scenario script: who speaks, what rule is hidden, which trap, which device IDs and attributes, whether the outcome is confirmed, the channel style (Teams: short messages, timestamps, a few typos and a smiley; email: one longer message with a subject line).
- Output schema is a list of messages in the `contracts/message.schema.json` shape, Finnish-style names, no ticket IDs as entities, no real company data.
- The script and the model ID are written next to the output in `data/DATA_CARD.md`. Every generated thread is marked `placeholder: true` until a human has read it.

**Where the model is never used.** Binding, candidate voting, the `get_context` filter, precedence, merge, trust derivation, and anything in `demo.py` beat 3 to 5. The stand-in agent in beat 1 and beat 3 is one `llm.structured` call with a schema `AgentProposal { action, action_text, avoid, cites }`, given the `get_context` results as its user prompt. Its only job is to turn the filtered context into a sentence; it has no tools and no discretion over scope.

## 3. Repository layout

```
contracts/      assertion.schema.json, topology.schema.json, message.schema.json,
                vocabulary.md, predicates.md, get_context.md
data/
  elisa_examples/   teams_chat.json, email.txt, use_case.md, README.md: copy them from
                    Elisa_SinceAI2026/ELISA_HIDDEN_KNOWLEDGE_EXAMPLE_2026/ in this repo
  topology.json     synthetic topology (seed below; Abhishek's sheet replaces it)
  scenarios/NN_slug/  thread.json | email.txt, expected.json  (01 to 12, plus 12b_barrier_update)
  DATA_CARD.md      what was generated, how, with which model and prompt
adapters/   teams.py, email.py        -> list[Message]
extractor/  extract.py, markers.py    -> Assertion | None
binder/     bind.py                   -> Assertion with candidates
predicates/ evaluate.py               -> bool
store/      base.py, neo_store.py, json_store.py
agent/      get_context.py, stand_in.py, questions.py, outcomes.py
eval/       test_scenarios.py, case_table.py -> docs/CASE_TABLE.md
api/        app.py (thin FastAPI over the store, read-only + two POSTs)
out/        JSON artefacts written by demo.py, read by the frontend
llm.py, demo.py, README.md
```

## 4. Contracts (write these first)

### 4.1 `contracts/message.schema.json`

One message: `id`, `author`, `role` (`field_engineer` | `expert` | `agent` | `other`), `timestamp` (ISO 8601; the provided chat has times only, so the adapter attaches the synthetic date `2026-11-01` and documents it), `channel` (`teams` | `email` | `agent_thread`), `thread_id`, `text`, optional `incident` (`entity_id`, `event`, `symptoms[]`; present only when the message is a reply inside the agent's own escalation thread, in which case the binder skips entity resolution). Do not model ticket IDs. A ticket number in text is free text.

### 4.2 `contracts/topology.schema.json`

- `node`: `id`, `type` (`transmission_node` | `router` | ...), `model`, `install_year` (int), `firmware` (string, comparable), `site`.
- `site`: `id`, `name`, `region`, `access` (free text, may be empty; the barrier key lives here once captured, as an assertion bound to the site, not as a static field).
- No links between devices. That is pending Elisa's answer; leave a commented placeholder.

Seed `data/topology.json` with 4 sites in 2 regions and about 20 nodes, using these names so the frontend's mock fixtures and the API show the same picture: OULU-07 (north), OULU-11 (north), OULU-03 (north, a barrier on its access road), and one site in region `south`. Include at least: TRN-042 (model TX-200, install 2019, firmware 4.1, site OULU-07), TRN-087 (TX-200, 2018, 4.1, OULU-11), TRN-101 (TX-300, 2023, 5.2, any site), one TX-250 from 2018, one TX-200 from 2016, and one TX-200 from 2020 on firmware 4.1 (for the open-edge test). Abhishek's sheet replaces this file later; keep the same schema and these IDs.

### 4.3 `contracts/vocabulary.md`

Controlled lists the extractor must map into. Start with:

- events: `sfp_replaced`, `dispatch_created`, `alarm_raised`
- symptoms: `link_up`, `link_down`, `optics_normal`, `optics_low`, `counters_zero`, `counters_rising`, `alarms_cleared`
- actions: `interface.bounce`, `node.reboot`, `sfp.replace`, `counters.check`, `site.access_key`, `other`
- value-carrying actions (their `action_text` is a fact that can change, not a procedure): `site.access_key` only. Procedural actions never are; different wordings of the same procedure merge as cases.
- trust: `hunch`, `stated`, `verified_by_outcome`
- assertion status: `open`, `decided`, `disputed`, `review`
- per-entity outcome of `get_context`: `proposed`, `declined`, `ambiguous`

Extend only by editing this file.

### 4.4 `contracts/assertion.schema.json`

```json
{
  "id": "CA-0001",
  "trigger": {"kind": "incident", "event": "sfp_replaced", "symptoms": ["link_up", "optics_normal", "counters_zero"]},
  "applies_to": {
    "entity_type": "transmission_node",
    "candidates": [
      {"predicate": "install_year <= 2019", "edge": "open", "support": 1, "against": 0, "basis": "Erkki: 'older units'; 2019 is TRN-042's install_year, not a stated boundary (Veikko guessed 'around 2019')"},
      {"predicate": "model == 'TX-200'",    "support": 1, "against": 0, "basis": "attribute of TRN-042"},
      {"predicate": "firmware == '4.1'",    "support": 1, "against": 0, "basis": "attribute of TRN-042"},
      {"predicate": "site == 'OULU-07'",    "support": 1, "against": 0, "basis": "attribute of TRN-042"},
      {"predicate": "region == 'north'",    "support": 1, "against": 0, "basis": "attribute of TRN-042's site"}
    ],
    "decided": null
  },
  "action": "interface.bounce",
  "action_text": "disable the interface, wait, enable it",
  "avoid": ["node.reboot", "sfp.replace"],
  "evidence": {
    "cases": [{"entity": "TRN-042", "at": "2026-11-01T09:25:00Z", "outcome": "recovered"}],
    "sources": ["teams:thread-001", "email:001"],
    "excerpt": "Disable the interface, wait a little, then enable it again. Don't reboot the whole unit unless that fails.",
    "said_by_role": "expert",
    "said_by": "Erkki Expert"
  },
  "trust": "verified_by_outcome",
  "status": "open",
  "questions_asked": [],
  "supersedes": null,
  "superseded_by": null,
  "recorded_at": "2026-11-06T00:00:00Z",
  "valid_from": "2026-11-01T00:00:00Z",
  "valid_to": null,
  "valid_while": null
}
```

Rules encoded in the schema's description fields:

- `trigger.kind` is `incident` (event + symptoms) or `workflow` (event only, e.g. `dispatch_created` with the site as entity). The barrier key is a `workflow` trigger with action `site.access_key` and `action_text` holding the key location.
- **The device ID is never a candidate.** The device is the origin of the case in `evidence.cases`. Only if the text limits the rule to that unit ("only this one") is `id == 'X'` added as a candidate.
- `cases` are distinct incidents (entity + time). `sources` are documents. Erkki's chat and email are one case, two sources. `support` counts cases.
- `trust`, derived deterministically in this order: (1) any case with `outcome: recovered` → `verified_by_outcome` (from a thread confirmation such as "traffic is back" or a telemetry event); (2) `hedged` → `hunch`; (3) `said_by_role == expert` or `first_hand` → `stated`; (4) otherwise `hunch`. A field engineer reporting what he did or saw on site is `stated`. Trust and support are separate axes.
- **Open edge.** A candidate carries `edge: "open" | "closed"`. When the stated condition is relative (`condition_is_relative`) and the predicate's number came from the origin node's attribute, not from the speaker, the candidate is `open`: the number is the newest value known to be in, not a boundary. Nobody in the data said where "older" ends, so the system must not claim it does. Everything else is `closed`. On a new entity an open `<=`/`<` candidate **holds** at or below its number, is **unknown** above it (see 4.5), and fails only for a missing attribute. A supporting case or a "yes" answer on a newer entity raises the number; a "no" answer closes the edge at the current number. Never invent a margin.
- `valid_while` is stored as text only. Nothing evaluates it. `valid_to` null means still believed true.
- `questions_asked` is a list of question keys (5.4). A key is appended once and never removed.
- `supersedes` / `superseded_by`: set only by the supersede rule in 5.2 for value-carrying actions. Nothing is ever deleted.

### 4.5 `contracts/predicates.md`

Grammar: `attr op value` where attr is a node attribute or `region` (resolved through the node's site), op in `== != < <= > >=`, value a string or int; `id == 'X'` is allowed. Comparison on `firmware` is by numeric tuple of the dotted version. Evaluator signature: `evaluate(predicate: str, node: Node, topology: Topology, edge: str = "closed") -> Literal["holds", "fails", "unknown", "missing"]`. `missing` when the attribute does not exist on this node (treated as a failure everywhere). `unknown` only for an `open` candidate whose op is `<=`/`<` (or `>=`/`>`) when the node's value is beyond the number. `peer.attr` is reserved and raises `NotImplemented` (pending).

### 4.6 `contracts/get_context.md`

```
get_context(entity_id, event, symptoms, at_time) -> list[ContextResult]
ContextResult: {assertion, outcome, reason, question?}
```

Filter order, deterministic, no model call anywhere in it:

1. Trigger match: `trigger.kind == incident` and event equal and every trigger symptom present in `symptoms`; or `trigger.kind == workflow` and event equal. Not matched: not returned at all.
2. Validity: `valid_from <= at_time` and (`valid_to` null or `at_time < valid_to`). Expired: `declined`, reason "expired <date>"; if `superseded_by` is set, reason "superseded by <id> on <date>" instead.
3. Scope: if `decided` is set, evaluate only the decided predicate (with its edge). Otherwise evaluate every candidate with `against == 0`. All `holds`: `proposed`. At least one `fails`/`missing` and none `holds`: `declined`, reason names the failing candidates and, separately, any `unknown` ones ("install year 2023 is beyond the known edge 2019"). Any other mix (some hold and some fail, or something is `unknown` with nothing failing): `ambiguous`, reason names the disagreeing or unknown candidates, and if its question key is not in `questions_asked`, attach a `question` (section 5.4).
4. Trust: `hunch` is returned with outcome `declined` and reason "hunch, not verified" so the agent can mention it but must not propose it.
5. Status: `disputed` assertions go through precedence (section 5.5). `review` assertions are returned `declined`, reason "under review".
6. The proposal text the agent builds must include: action_text, the avoid list, `said_by`, source channel, number of cases, and the dispute note if any.

## 5. Behaviour rules the modules must implement

### 5.1 Extractor

Input: one thread (list[Message]). Output: zero or one Assertion (before binding). Steps: a marker pre-check is **not** built (stretch); go straight to one LLM call with the vocabulary in the system prompt, asking for the structured JSON or `null`. Then the **evidence check**: `excerpt` must be a verbatim substring of the concatenated thread text (whitespace-normalised); `action_text` must be supported by the excerpt; otherwise drop the assertion and log why. Trust is derived, not asked of the model: outcome present in thread (a confirmation message after the action, e.g. "traffic is back", "did that, works") sets the case outcome `recovered`.

### 5.2 Merge

Key = (`trigger.kind`, `trigger.event`, sorted `trigger.symptoms`, `action`). For a **value-carrying** action the key also includes the bound entity (the site for a workflow trigger) and `action_text` normalised (lower-case, whitespace collapsed). Exact match on the key:

- Same key: merge into the existing assertion. Append the case if (entity, time) is new, append sources, re-derive trust, and **vote**: for each candidate with `against == 0`, evaluate against the new case's entity; `holds` → `support += 1`; `fails`/`missing` → `against += 1`; `unknown` on an open candidate with a `recovered` outcome → raise the candidate's number to the entity's value and `support += 1` (the edge stays open). If the new case's outcome is `failed`, instead add `against` to every candidate that held for it, and set `status = review`.
- Same trigger key, different action: both assertions get `status = disputed` and reference each other.
- **Value-carrying action, same key except `action_text`** (same trigger, same entity, different text): the new assertion **supersedes** the old one if the new one is not a `hunch`: new gets `valid_from` = its message time and `supersedes` = old id; old gets `valid_to` = that time and `superseded_by` = new id. A `hunch` with different text is stored as its own assertion and the old one stays live. No model call decides whether two texts differ.
- Different trigger: separate assertion.

No fuzzy matching. Chat + email about the same incident (same entity, same day) are one case.

### 5.3 Binder

Resolve explicit node IDs and site IDs, nicknames and obvious typos ("trn42", "TRN 042", "Oulu 03") against `topology.json` by normalised ID; if no match, no binding and the assertion is stored unbound with `status = review`. A workflow-trigger rule binds to a site. Candidate set = the condition stated in the text, parsed deterministically from `stated_condition` into a predicate: a number stated by the speaker gives a `closed` candidate; a relative condition ("older units") gives `install_year <= <origin's install_year>` with `edge: "open"`; plus one `closed` candidate per attribute of the origin node: `model`, `firmware`, `install_year` (only if not already a candidate), `site`, `region`. Never the ID. Never ask a question here. If `message.incident` is present, skip resolution and use it.

### 5.4 The one question

Built only inside `get_context` on `ambiguous`, only if the question's key is not in `questions_asked`. The key is the sorted list of (candidate predicate, evaluation result) pairs that made it ambiguous, so the same ambiguity is never asked twice, but a genuinely new one (a 2020 unit after the site question was settled) can be. Shape:

```json
{"assertion_id": "CA-0001", "key": "...", "to": "Erkki Expert", "thread_id": "thread-001",
 "text": "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site.",
 "options": [
   {"label": "All older units", "sets_decided": "install_year <= 2019", "edge": "open"},
   {"label": "Only OULU-07",    "sets_decided": "site == 'OULU-07'"},
   {"label": "No",              "sets_decided": "id == 'TRN-042'"}
 ]}
```

Options are generated from the disagreeing candidates: one option per surviving candidate that holds for the new entity (phrased as the broad choice), one per candidate that fails (phrased as the narrow choice), plus "No". For an `unknown` open candidate the question is about the edge ("does it apply to a 2020 unit too?") with options "Yes" (raise the number to the entity's value, edge stays open) and "No" (close the edge at the current number); `decided` is unchanged by an edge answer. `answer(assertion_id, option_index)` applies the option, sets `status = decided` where `decided` was set, and appends the key to `questions_asked`. The question is written to `out/questions.json` for the frontend; the backend never delivers it anywhere else.

### 5.5 Precedence on conflict

For two or more `disputed` assertions matching the same incident, order by: trust (`verified_by_outcome` > `stated` > `hunch`), then number of cases (more first), then `valid_from` (newer first). If a strict winner exists, it is `proposed` with `reason` containing "disputed: <other>'s <action_text>, <other trust>". If tied on all three, every one is returned `ambiguous` with reason "tied dispute, escalate", no question attached.

### 5.6 Outcomes

`record_outcome(assertion_id, entity_id, outcome, at)` appends a case and runs the vote in 5.2. `recovered` can also upgrade trust. `failed` where every candidate held sets `status = review`.

### 5.7 Expert notification

When an assertion is `proposed`, append `{"to": said_by, "text": "Your tip from <date> was used on <entity> today."}` to `out/notifications.json`. Nothing else.

## 6. Build order, tests and gates

Sequential. One agent per module. Each row: write the module, write its test, run it, then stop and report the command.

| # | Module | Test asserts | Human gate |
|---|---|---|---|
| 0 | `contracts/`, `data/topology.json`, `llm.py` | schemas validate the example assertion; one call to each model ID succeeds and the `model_version`s are printed; one `llm.structured` call against a tiny schema succeeds, is cached, and a second call is a cache hit; `LLM_OFFLINE=1` makes a miss raise | Human reads contracts and the model list, approves, freeze |
| 1 | `adapters/` | Elisa's chat → 12 messages, email → 1, both valid against the schema, dates attached | Skim |
| 2 | `extractor/` + merge | chat and email → exactly one assertion, one case, two sources; `action == interface.bounce`; `avoid` contains `node.reboot`; `trust == verified_by_outcome`; `condition_is_relative` true; excerpt verbatim; a reworded thread ("shut / no shut, came back") maps to the same key; a chit-chat thread → `None`; Veikko's "the key moved, it's in the site cabinet now" → `stated`; "someone said the key might be in the cabinet" → `hunch`; a second barrier text for the same site supersedes the first, a hunch does not, the same text again is a new case; two barrier keys for different sites are two assertions | Read the assertion JSON |
| 3 | `predicates/` | fixture table of (predicate, edge, node, expected), including `region`, firmware ordering, missing attribute → `missing`, open `install_year <= 2019` on a 2020 node → `unknown`, closed → `fails` | Read the table |
| 4 | `binder/` | candidates = open `install_year <= 2019` + closed model, firmware, site, region (install_year not duplicated); no `id ==` candidate; "trn42" resolves; "Oulu 03" resolves to the site; unknown ID → `review`; no question generated | Read the candidates |
| 5 | `store/` | JSON store and Neo4j store pass the same test: round trip, query by entity, one `SCOPED_BY` edge per candidate, `EVIDENCED_BY` edges to sources, `CASE` edges to case entities; Neo4j Browser shows it | Look at the graph. If Neo4j is not running 45 min after starting this row, finish with JSON store + pyvis export and move on |
| 6 | `agent/` | TRN-087 → `ambiguous`, question names the site candidate; after `answer(0)` → `proposed`, proposal text has "counters", "disable", not "reboot", "1 case", "Erkki"; TRN-101 → `declined`, reason names `model` failing and the year as beyond the known edge; the 2020 TX-200 → `ambiguous` with an edge question, "No" closes it and a re-run is `declined`; TX-250 2018 unit before the answer → `ambiguous`; counters rising → not returned; the barrier assertion surfaces on `dispatch_created` for its site and not for another; after the cabinet update the new location is `proposed`, the old is `declined` "superseded", and `at_time` before the update proposes the old one | Read all outputs |
| 7 | `eval/` | parametrised over `data/scenarios/*/expected.json`; writes `docs/CASE_TABLE.md` with pass/fail and one line why | Read the table |
| 8 | `demo.py` + `api/` | runs the six beats, writes `out/beat_N.json` and the frontend artefacts; API serves the same JSON | Run it end to end |

Scenario folders must exist for Appendix A rows 1 to 12 (the spine) plus `12b_barrier_update` (the barrier email on 2 Oct, then a Teams message from field engineer Veikko on 7 Nov: "the key moved, it's in the site cabinet now"; and a hedged variant that must not supersede). Row 1 uses the provided files. Rows 2 to 12 use threads that Abhishek scripts and `GENERATE_MODEL` expands via `llm.py`; until his scripts arrive, write minimal placeholder threads yourself and mark them `placeholder: true` in `expected.json` so they are replaced, and log every generated file in `data/DATA_CARD.md`.

`expected.json` shape: `{"extracted": true|false, "assertion": {partial fields that must match}, "bind": {"candidates_include": [...], "candidates_exclude": [...]}, "incidents": [{"entity": "...", "event": "...", "symptoms": [...], "at": "...", "expect": "proposed|declined|ambiguous", "reason_contains": "..."}]}`.

## 7. `demo.py`: the six beats

Each beat prints a short human-readable block and writes `out/beat_N.json`. Runs fully from the LLM cache. Order:

1. **No context.** Incident on TRN-087 with an empty store. The stand-in agent (one prompt, one tool call, cached) proposes a reboot or another SFP swap. Show the empty `get_context` result and the agent text.
2. **Capture and link.** Ingest the chat and the email. Print the assertion, the candidates with support counts, the trust, and "0 questions asked". Write `out/graph.json` (nodes, edges with `kind: SCOPED_BY|EVIDENCED_BY`).
3. **First use and the one question.** Same incident on TRN-087. `ambiguous` on site. Print the question. Simulate Erkki answering option 0. Re-run: `proposed`. Agent text cites Erkki, 1 case, avoid reboot. Print the counter: 12 messages, 1 assertion, 0 forms, 1 tap.
4. **Decline.** Incident on TRN-101. `declined`, reason names the failing model candidate and the year beyond the known edge.
5. **Barrier.** Ingest the barrier email (synthetic, in `data/scenarios/12_barrier/`, dated 2 Oct). `dispatch_created` for OULU-03. The key location is proposed before the drive. Append the notification to Erkki for beat 3.
6. **Update.** Ingest Veikko's Teams message from `12b_barrier_update` (7 Nov). Print both assertions, the old one with `valid_to` and `superseded_by`. `dispatch_created` for OULU-03 again: the cabinet location is `proposed`, the old one shown as superseded with its date. No question asked. Write `out/beat_6.json` and update that thread's `out/thread_<id>.json`. Line for the video: "Nobody edited anything. The newer message replaced the old fact, and the old one is kept with the date it stopped being true."

`demo.py --beat N` runs one beat; `demo.py` runs all. Deterministic output, no timestamps from the wall clock.

## 8. What the frontend will need (build only the data side now)

Two pages come later, written by someone else: a mock Teams thread (shows the conversation, the question with tap-able options, the notification) and a read-only graph page (draws `out/graph.json`). Provide, and keep stable:

- `out/graph.json`: `{"nodes": [{"id", "label", "kind": "assertion|node|site|region|model|source", "attrs": {...}}], "edges": [{"from", "to", "kind", "support", "against"}]}`. Edge kinds: `SCOPED_BY` (assertion → topology node/site/region/model it is scoped to, one per candidate, with support/against and the edge state), `EVIDENCED_BY` (assertion → source), `CASE` (assertion → each entity in `evidence.cases`), `IN_SITE` (node → site), `IN_REGION` (site → region), `OF_MODEL` (node → model). Node `attrs` carry `model`, `install_year`, `firmware`, `site`, `region`; assertion `attrs` carry `action`, `action_text`, `avoid`, `trust`, `status`, `said_by`, `valid_from`, `valid_to`, `superseded_by`, case count. The frontend derives nothing it can read here.
- `out/thread_<id>.json`: the messages of a thread plus any question and notification targeting it, in display order, and `captured: [{"message_id", "assertion_id"}]` naming the message whose excerpt became the assertion.
- `out/beat_N.json`: everything printed in that beat, as data.
- `api/app.py`: `GET /assertions`, `GET /graph`, `GET /threads/{id}`, `GET /beats/{n}`, `POST /incident` (body = get_context args, returns results and agent text), `POST /answer` (assertion_id, option_index). Same shapes as the files. Run with `uvicorn api.app:app`. CORS open.

Do not build any HTML.

## 9. Out of scope for this build (leave only the named hook)

Stretch, after the spine passes and only when the human says so: corroboration search over the corpus (hook: `extractor/corroborate.py` with a `NotImplemented` stub), marker-phrase pre-filter (`extractor/markers.py` stub), split diagnostic from remedy, regional/seasonal triggers (the `region` candidate exists; season conditions do not), capture from the agent's escalation thread beyond honouring `message.incident`, blast radius on avoid, baseline RAG, `GET /context/{entity_id}` and `POST /chat` from the addendum (B3, B4; the frontend has fallbacks for both).

Pending Elisa's answers, do not build: evaluating `valid_while`, links and `peer.` predicates, event-stream corroboration, anything keyed on ticket IDs (tickets are a legacy system Elisa is retiring).

Never: numeric confidence, model-reported certainty, fuzzy duplicate matching, a question at capture time, any write to topology nodes, any action on the network, a live Slack or Teams connector.

## 10. Definition of done for the whole backend

- `pytest` green, including `eval/` over scenarios 1 to 12 and 12b with the case table generated.
- `python demo.py` runs offline from the cache and writes all `out/` files.
- `README.md` has: what it is in three sentences, how to run tests and the demo, the contracts list, the AI tools used and how (required by the submission form), and a technology inventory.
- `data/DATA_CARD.md` lists every generated file with model and prompt.
- Every claim in the README is something `demo.py` shows.
