# Gates run overnight (orchestrator standing in for Mikael)

Re-run any of these yourself. All commands from the repo root, PowerShell, with `$env:GOOGLE_CLOUD_PROJECT="project-f6c7adf3-6f57-4fdb-90e"` set (or `LLM_OFFLINE=1` to prove the cache is enough).

## Gate 0: contracts, topology, llm.py  (tag `gate-0`)

```
$env:LLM_OFFLINE="1"; py -3.14 -m pytest -q        -> 17 passed, 1 skipped (the live call)
py -3.14 -m pytest -q                              -> 18 passed (agent's run, live call ~0.002 EUR)
py -3.14 scripts/check_models.py                   -> gemini-4-argon and gemini-3.5-flash both answered; versions in README.md
```

Read: `contracts/models.py`, `contracts/vocabulary.md`, `contracts/get_context.md`, `data/topology.json`. Matches BACKEND_PROMPT section 4. Approved and frozen 03:05.

Decisions taken at this gate (agent's proposals, approved):
- Schemas are generated from `contracts/models.py`; a test fails on drift.
- `other` added to events and symptoms (2b requires it in every enum). Extra lists added for things the spec used without listing (trigger kinds, edges, predicate results, case outcomes, roles, channels, node/entity types, edge answers).
- `applies_to.decided` is `{predicate, edge}` or null.
- Question options carry `edge_answer: raise|close` for the edge question.
- A `raise` answer also updates `decided.predicate` when `decided` is that candidate (otherwise a decided open candidate could never widen and the assertion would stay ambiguous with its key already asked).
- Budget check is worst-case before the call (input chars/2 + full 4096 output allowance); recorded spend uses the real usage.
- Topology: 4 sites (OULU-07, OULU-11, OULU-03 north; HEL-02 south), 20 nodes incl. TRN-120 (TX-200, 2020, fw 4.1) for the edge test, TRN-102 (fw 5.10) for version ordering, TRN-033 for the corroboration stretch.

Spend after gate 0: 0.0109 EUR (4 live calls).

## Gates 1 to 8 and fix-1 (all run by the orchestrator, 03:10 to 04:50)

| Gate | Tag | Command | Result |
|---|---|---|---|
| 1 adapters | `gate-1` | `py -3.14 -m pytest -q tests/test_adapters.py` | 4 passed |
| 3 predicates | `gate-3` | `py -3.14 -m pytest -q tests/test_predicates.py tests/test_open_edge.py` | 213 passed |
| 2 extractor | `gate-2` | `py -3.14 -m pytest -q tests/test_extractor.py tests/test_trust.py tests/test_supersede.py` | 31 passed, first prompt attempt |
| 4 binder | `gate-4` | `py -3.14 -m pytest -q tests/test_binder.py tests/test_condition.py` | 40 passed |
| 5 store | `gate-5` | `py -3.14 -m pytest -q tests/test_store.py` | 8 passed, 6 skipped (Neo4j: Docker off) |
| 6 agent | `gate-6` | `py -3.14 -m pytest -q tests/test_agent.py` | 13 passed |
| 7 eval | `gate-7` | `py -3.14 -m eval.runner` | 13/14 (09 failed: extractor could not report a failed outcome) |
| 8 demo + api | `gate-8` | `LLM_OFFLINE=1 py -3.14 demo.py` and `tests/test_demo.py tests/test_api.py` | six beats, 10 passed |
| fix-1 | `fix-1` | `py -3.14 -m pytest -q` (live once), then offline, demo, `eval.runner` | 353 passed, 14/14 scenarios, 90/90 checks |

Whole-suite offline: `$env:LLM_OFFLINE="1"; py -3.14 -m pytest -q` -> 353 passed, 7 skipped. Spend after fix-1: 1.03 EUR, 53 live calls.
