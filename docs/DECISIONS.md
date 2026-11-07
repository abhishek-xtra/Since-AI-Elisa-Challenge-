# Decisions made ahead of time for the overnight build (Sat 7 Nov 2026, ~02:45)

Mikael is asleep. The orchestrator (Claude Fable) stands in for the human gate so the build does not stall. Every item below is reversible: the build is on branch `backend`, one commit per module, tag `gate-N`. Mikael reviews in the morning and can revert any commit.

| # | Where the spec says "ask the human" | Decision tonight |
|---|---|---|
| 1 | Gate 0: human reads contracts and approves the freeze | The orchestrator approves if the contracts match `BACKEND_PROMPT.md` section 4, and fixes mismatches itself. |
| 2 | A contract is wrong mid-build (rule 1: stop) | The orchestrator changes the contract, logs the change and reason in this file under "Contract changes", reruns affected tests, continues. |
| 3 | Neo4j not running after 45 min | Try Docker once. If Docker Desktop is off or the container fails on the first try, JSON store is primary, Neo4j store is skipped. pyvis export for the graph. |
| 4 | Scenario scripts come from Abhishek | Not available tonight. The orchestrator writes the scripts; `gemini-3.5-flash` expands them; every generated thread is `placeholder: true` and listed in `data/DATA_CARD.md`. Barrier email: a field engineer to the field team, OULU-03, "the key for the barrier on the private road is at the neighbouring farm, ask for Mäkelä", dated 2 Oct 2026. Update (12b): Veikko in Teams on 7 Nov, "the key moved, it's in the site cabinet now". Hedged variant: "someone said the key might be in the cabinet now". |
| 5 | Extractor fails on Erkki's thread | The agent may rewrite the extractor prompt text up to four times, never the test. If still failing, keep the best version, record the gate as failed, continue with modules that do not depend on it. |
| 6 | Gemini rejects a schema shape or safety category | Adapt the pydantic output model or drop the category. The JSON contract does not change. |
| 7 | What Erkki taps in beat 3 | Option 0, "All older units". |
| 8 | An agent fails its gate twice | The orchestrator fixes it or respawns with the failure attached. After a third failure that module stops; the rest continues. |
| 9 | Budget | `LLM_BUDGET_EUR=50` stays. If it trips, remaining work runs from cache only and the report says so. |
| 10 | Finish time | Report written at 08:00 in whatever state the build is in. |
| 11 | Synthetic dates | Erkki's chat and email: 2026-11-01. TRN-087 incident: 2026-11-07. TRN-101 incident: 2026-11-07. Barrier dispatch: 2026-11-08. |
| 12 | Agent questions | Agents do not ask. They decide, write the decision under "Agent decisions" below, and continue. |

## Contract changes (after the gate-0 freeze)

(none yet)

## Agent decisions

(agents append here)

- **adapters (module 1):** Email `thread_id` uses the same mapped stem as the id (`email-001` for Elisa's `email.txt`, `email-<stem>` otherwise), so id and thread agree. Email `text` is `Subject: <subject>`, a blank line, then the body with leading/trailing newlines stripped. A `Date:` header is parsed as RFC 2822 (`email.utils`). Teams date precedence: `date` argument, then the file's top-level `"date"`, then `SYNTHETIC_DATE`. Teams messages are sorted by `seq`. Offset is a fixed `+02:00` (EET), not a DST-aware Europe/Helsinki zone, as specified; a summer-dated scenario would still get `+02:00`.

- **Module 3 (predicates), open edge on a failed ordering comparison.** With `edge="open"` any `<`/`<=`/`>`/`>=` comparison that is false returns `unknown` (not only strictly beyond the number), so open `install_year < 2019` on a 2019 node is `unknown`, as the task brief required; `==`/`!=` and `missing` are unaffected. Lives in `predicates.evaluate.open_edge_result`.
- **Module 3, parse vs missing.** `parse` accepts any lowercase identifier as `attr` so `vendor == 'X'` evaluates to `missing` (contracts/predicates.md example); only a malformed string raises `ValueError`. Type errors also raise `ValueError`: `<`/`>` on a string attribute, int value on a string attribute or vice versa, non-dotted firmware value. Both quote styles are accepted.
- **Module 3, Site attributes.** A Site exposes `id`, `name`, `region` and `site` (= its own id); everything else (including `access`) is `missing`.
- **Module 4 (binder), unbound note.** The Assertion schema has no free-text field, so the "no entity resolved" reason for an unbound `review` assertion is written to the `binder.bind` logger (warning), not into the assertion.
- **Module 4, resolution.** Tokens are `letters[ _-]?digits`, normalised (lowercase, letters+digits, leading zeros stripped) and matched against topology IDs. Most-mentioned entity of the expected type wins (site for a workflow trigger, node otherwise), ties by first mention. No fallback from a node mention to its site for a workflow rule (or vice versa): it goes to `review`. An `incident` entity ID not in the topology also goes to `review`. `entity_type` is set to the resolved node's `type` (`router` stays `router`).
- **Module 4, stated condition precedence** (`binder.condition.stated_candidate`, one candidate at most): stated year (`before/older than/prior to/pre` → `<`, `after/newer than` → `>`, `since/from` → `>=`), then `firmware [below|above|...] X`, then `model X` (canonicalised to the topology's spelling), then the relative open candidate (only if `condition_is_relative`; `newer/new/recent/later` → `>=`, otherwise `<=`), then "this site" → origin's site, then a site ID or a topology region name. A number in the speaker's words wins over `condition_is_relative`. It takes an optional `topology` argument for site/region/model recognition.
- **Module 4, attribute dedup.** An attribute candidate is skipped if the same predicate is already present (e.g. stated `firmware == '4.1'`); `install_year == <year>` is skipped if any `install_year` candidate is present. When the stated condition does not parse, every attribute candidate's basis ends with "; stated condition '<text>' did not parse".
- **Module 4, "only this one".** `only|just this|that one|unit|node|device|box`, or `only [on] <id>` matching the origin by normalised ID, in `stated_condition` or the excerpt, gives the single candidate `id == '<origin>'`.
- **Module 4, case time.** The message whose whitespace-normalised text contains the whitespace-normalised excerpt; an excerpt spanning several messages falls back to the first message.

| 13 | After module 8 | Until 09:00: break tests. Adversarial threads and edge cases aimed at the extractor and the deterministic rules, each logged in `docs/BREAK_TESTS.md` (what was tried, what happened, fix or not, commit). Fixes go in as commits on `backend` tagged `break-N`. (Mikael, 03:40) |
- **Module 5 (store), graph ids.** Topology nodes and sites keep their own ids; regions are `region:<name>`, models `model:<name>`, sources the source string itself (`teams:thread-001`). `SCOPED_BY` for `site`/`region`/`model` points at that entity; any other attribute (`install_year`, `firmware`, `id`, ...) points at the origin (first case entity). `SCOPED_BY` edges also carry `predicate` (two candidates can share a target); `support`/`against`/`edge` appear only on `SCOPED_BY`. Site nodes carry attrs `name`, `region`, `access`; region/model/source attrs are `{}`. An edge end outside the topology gets a bare node so nothing dangles. Neo4j not tested live (Docker off, decision 3): JSON store is primary, `NeoStore` is written but unverified.
