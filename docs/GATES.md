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
