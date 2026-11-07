# Elisa hidden-knowledge context layer

## Models used

Gemini on Google Cloud Vertex AI (location `global`, Application Default Credentials, no API key). All calls go through `llm.py` and are cached in `.llm_cache/`.

| Model ID | model_version (from the response) | Used for |
|---|---|---|
| `gemini-4-argon` | `gemini-4-argon` | extractor and stand-in agent: reads Teams/email threads and returns the structured rule; turns `get_context` results into a proposal (EXTRACT_MODEL) |
| `gemini-3.5-flash` | `gemini-3.5-flash` | synthetic scenario threads from scripts, a different model on purpose (GENERATE_MODEL) |

## What it is

A context layer that reads conversations people already have (a Teams chat, an email) and stores each reusable operational rule as a context assertion: a trigger, candidate scopes over network-topology attributes, an action, an avoid list, evidence, trust and validity. When an incident arrives, one deterministic tool, `get_context`, returns per assertion `proposed`, `declined` (with the failing candidate) or `ambiguous`, and on `ambiguous` asks the original expert one question, once per distinct ambiguity. It is advisory: it never acts on the network, never writes to the topology, and uses no numeric confidence anywhere.

## Run

```powershell
py -3.14 -m pip install -r requirements.txt
$env:LLM_OFFLINE="1"; py -3.14 -m pytest -q          # whole suite, from the cache
$env:LLM_OFFLINE="1"; py -3.14 demo.py               # the nine beats, writes out/
py -3.14 demo.py --beat 3                            # one beat on the state the previous beats left in out/
py -3.14 demo.py --clean                             # wipe out/
uvicorn api.app:app                                  # GET /assertions /graph /threads/{id} /beats/{n}, POST /incident /answer
```

- `LLM_OFFLINE=1`: every model call must be a cache hit in `.llm_cache/`; a miss raises instead of calling Vertex AI. The demo and the tests run this way.
- `LLM_BUDGET_EUR` (default 50): a live call that could push the recorded spend past this cap is refused.
- `OUT_DIR` overrides `out/` (the tests use a temp dir). Live calls need `GOOGLE_CLOUD_PROJECT` and Application Default Credentials.

## Contracts

- `contracts/message.schema.json`: one message from any channel (author, role, timestamp, channel, thread, verbatim text).
- `contracts/topology.schema.json`: the synthetic network graph (nodes, sites, regions); read-only.
- `contracts/assertion.schema.json`: the context assertion (trigger, candidate and decided scope, action, avoid, evidence, trust, status, validity, supersession).
- `contracts/vocabulary.md` / `vocabulary.py`: the closed lists of events, symptoms, actions, trust, status and outcomes.
- `contracts/predicates.md`: scope predicates over topology attributes and their `holds`/`fails`/`unknown`/`missing` results, including the open edge.
- `contracts/get_context.md`: the filter order, precedence on dispute, and the one question.
- `contracts/models.py`: the pydantic models the schemas are generated from.

## How generative AI is used

- `gemini-4-argon` (`EXTRACT_MODEL`) reads a thread and returns the structured rule (trigger, action, avoid, verbatim excerpt, speaker, stated condition, and whether the speaker is retracting earlier advice). It also runs the stand-in network operations agent: one structured call that turns `get_context` results into a proposal.
- `gemini-3.5-flash` (`GENERATE_MODEL`) expanded the scenario scripts into synthetic threads (see `data/DATA_CARD.md`); a different model on purpose.
- The model never decides scope, outcome, trust, supersession or whether a question is asked. Binding, candidate evaluation, `get_context`, the question and its options, applying the answer, notifications and the proposal text are code. An extracted excerpt that is not verbatim in the thread is dropped.
- Every call goes through `llm.py` and is cached on disk in `.llm_cache/` (keyed by model, prompt and schema), so the demo and tests replay offline. Spend is recorded in `.llm_cache/_spend.json` and capped by `LLM_BUDGET_EUR`.
- The code was written with Claude Code agents, one per module, each gated by its tests.

## Technology inventory

Python 3.14; pydantic 2 (contracts, LLM output schemas); google-genai on Vertex AI (Gemini, ADC auth); FastAPI + uvicorn (API); pyvis (graph HTML); JSON-file store (primary; a Neo4j store is written but untested); pytest; jsonschema.

## Data

All data is synthetic. Elisa's example chat and email in `data/elisa_examples/` are used unmodified (the adapters date them 2026-11-01, as they carry times only). Every generated scenario thread is listed in `data/DATA_CARD.md` with its model, script and hand edits. Data handling: names and device IDs are illustrative, there is no personal or customer data, and nothing leaves the machine except the prompts sent to Vertex AI; GDPR handling of real chats is out of scope for this build. Facts are stored verbatim, including any code or key written in a message (a gate code ends up in the store, `graph.json` and the thread files); masking them is a policy decision for Elisa.

## Demo beats

`py -3.14 demo.py` prints these and writes `out/beat_N.json`, `out/graph.json`, `out/graph.html`, `out/assertions.json`, `out/thread_<id>.json`, `out/questions.json`, `out/notifications.json`.

1. **No context.** Empty store: `get_context` on TRN-087 returns `[]`; the stand-in agent says no captured context applies and adds nothing. It never invents a procedure; the real agent's own runbook is out of scope.
2. **Capture and link.** Erkki's chat and email become one assertion CA-0001 (`interface.bounce`, avoid `sfp.replace`, `node.reboot`) with five candidates and their support/against/edge, trust `verified_by_outcome`, 0 questions asked.
3. **First use and the one question.** TRN-087 is `ambiguous` on site; Erkki is asked once and taps "All older units"; the re-run is `proposed` and the agent says to disable and enable the interface, avoid `node.reboot`, citing Erkki, 1 case. 12 messages · 1 assertion · 0 forms · 1 tap.
4. **Decline.** TRN-101 (installed 2023) is `ambiguous`: 2023 is beyond the known edge 2019, so Erkki gets one edge question; he taps "No", the boundary becomes `install_year <= 2019`, closed, and the re-run is `declined` on install_year. No cutoff was invented: Erkki set it.
5. **Barrier.** The 2 Oct barrier email is ingested; a dispatch to OULU-03 proposes the key location (at the neighbouring farm, ask for Mäkelä) before the drive; Erkki's notification from beat 3 is shown.
6. **Update.** Veikko's 7 Nov Teams message supersedes the old fact: the farm assertion gets `valid_to` 2026-11-07 and `superseded_by` CA-0003; the next dispatch proposes the site cabinet and declines the farm as superseded; no question.
7. **Second technician, no question.** Sami (Helsinki, synthetic thread `data/scenarios/13_second_technician/`) hits the same fault on TRN-105, a 2019 TX-200 in the south region, a day after Erkki's tap. `get_context` proposes CA-0001 (all hold: `install_year <= 2019`), no question, the proposal is relayed with Erkki as the source, and Erkki gets one notification line. His thread is shown, not ingested. Script for the screen: `docs/DEMO_CHAT.md`.
8. **Stale by itself.** Kalle's 9 Nov Teams message (hand-written, `data/scenarios/14_road_closed/`): the access road to OULU-11 is closed for roadworks until 20 Nov, use the forest track from the north side. The binder turns "until 20 Nov" into `valid_to` 2026-11-20 23:59 (code, not the model). A dispatch to OULU-11 on 15 Nov proposes the forest track; the same dispatch on 21 Nov is `declined`, "expired 2026-11-20". Nobody retracted it; it expired on the date the engineer gave.
9. **Retracted.** Erkki writes in the experts channel (`data/scenarios/15_retraction/`): "ignore what I said about the bounce on the older units, that was a different issue, don't rely on it". The extractor marks it a retraction (`retracts: true`); CA-0001, his own assertion with the same key, goes to status `review` and gains the thread as a source; nothing is deleted or superseded. TRN-087 is then `declined`, "under review".

## Rollback

All work is on branch `backend`; `main` receives it only by a human merge. Each module is one commit after its gate, tagged `gate-N` (`gate-0` to `gate-6`, plus `data-1` for the scenario data), so any module can be reverted to its gate.
