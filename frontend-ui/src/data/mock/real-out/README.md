# Real backend output (test fixtures)

Byte-for-byte copies of the backend's `out/` files (`beat_1..7.json`, `graph.json`, `assertions.json`, `thread_thread-001.json`, `thread_thread-12b_barrier_update.json`), copied on 7 Nov 2026 from `C:\dev\elisa\repo\.claude\worktrees\agent-ab4998e79c0721f44\out\` (backend commit d0624dd, `LLM_OFFLINE=1 demo.py`). Only `src/test/adapt.test.ts` reads them; the app never does. Re-copy them, don't edit them, when the backend's output changes.
