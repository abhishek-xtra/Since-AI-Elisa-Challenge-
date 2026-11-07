# Mock fixtures

These files are hand-written stand-ins. Replace them by switching `VITE_DATA_SOURCE=api`. Never shown in the final video.

- They match the shapes of the backend's `out/` files (`docs/process/BACKEND_PROMPT.md` sections 4 and 8, plus `docs/process/BACKEND_PROMPT_ADDENDUM.md` A1).
- Made by `frontend-ui/scripts/gen_fixtures.mjs` from Elisa's `teams_chat.json` (synthetic date 2026-11-01) and the synthetic data named in the plan. Re-run it instead of editing the JSON by hand:

  ```bash
  node scripts/gen_fixtures.mjs ../challenge/ELISA_HIDDEN_KNOWLEDGE_EXAMPLE_2026/teams_chat.json src/data/mock
  ```

- `graph.json` has no `IN_SITE` / `IN_REGION` / `OF_MODEL` edges and no `label`s on purpose, so the frontend's fallbacks (addendum B1, B2 missing) are what get exercised.
- **Additions beyond `docs/process/FRONTEND_PROMPT.md` 4.4**, all synthetic: two southern sites (HKI-02, HKI-05), two southern tips (CA-0006, CA-0007) so the "Rest of the network" badge has something to count, and `threads/thread-002.json` (Veikko's "the key moved" message, the source of CA-0003).
- `notifications.json` is held back by `mockSource` until the question in thread-001 is answered, the way the backend writes it after a proposal.
- Regions are Finland's real regions (maakunnat): the Oulu sites are in `north_ostrobothnia`, the Helsinki sites in `uusimaa`, and an extra site `ROV-01` (Rovaniemi) is in `lapland`. The backend's seed still uses `north` / `south`; switching it is Mikael's call, since predicates like `region == 'north'` and the scenario tests change with it.
- CA-0004 (winter power cuts, "up north") has two candidate regions, `lapland` and `north_ostrobothnia`, so it shows as `ambiguous` for OULU-03 in beats 5 and 6, and counts in both regions on the Finland map.
- No ticket numbers anywhere. `[KEY LOCATION FROM THE EMAIL]` in CA-0002 is a placeholder until the barrier email is written.
