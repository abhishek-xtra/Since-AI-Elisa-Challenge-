# BACKEND PROMPT ADDENDUM (proposed by Abhishek, for Mikael to approve)

> **Status: MERGED (Saturday 7 November, ~02:30).** Part A (A1 to A3) and B1 are folded into `BACKEND_PROMPT.md` with two fixes: the merge key for value-carrying actions includes the bound entity and the normalised text, and the binder resolves site IDs. B2 is done by the frontend; B3 and B4 are stretch. Agents build from `BACKEND_PROMPT.md` only.
>
> **What it is.** It changes no code. It describes three changes to the backend's behaviour (Part A), and an optional list for the frontend extras (Part B).
>
> **Vocabulary.** Section numbers refer to `BACKEND_PROMPT.md`.

**Why.**
- The core of the entry is the backend: it finds context, keeps it up to date automatically, and asks on Teams only when it has to.
- `BACKEND_PROMPT.md` covers finding and asking well.
- It has no rule for a fact that **changes**.
- And it would ignore updates that come from field engineers.

Part A fixes both, and adds the demo step that shows it. The context map and chat are an optional extra for the video (Part B).

---

## Part A: must-haves (core behaviour)

### A1. Supersede rule: a newer fact replaces an older one

**Problem.** Take the barrier key. An email on 2 Oct says where it is. On 7 Nov a field engineer says in Teams that it moved to the site cabinet. Under §5.2 both have the same merge key: `workflow`, `dispatch_created`, no symptoms, `site.access_key`. So the update is merged as one more case of the same tip, and the old location stays live.

**Rule.** Some actions carry a **value** rather than a procedure. Their `action_text` is a fact that can change.

1. **Mark them in `contracts/vocabulary.md`** as value-carrying. To start, only `site.access_key`. Procedural actions such as `interface.bounce` are never value-carrying: different wordings of the same procedure still merge as cases.
2. **When to supersede.** For a value-carrying action, a new assertion supersedes an existing one when all of these hold:
   - it has the same merge key
   - it is bound to the same entity (the same site for a workflow trigger)
   - its `action_text` differs after normalisation (lower-case, whitespace collapsed)
   - it is **not** a `hunch`
3. **What happens:**
   - The new assertion gets `valid_from` = its message time and `supersedes` = the old ID.
   - The old assertion gets `valid_to` = the new `valid_from` and `superseded_by` = the new ID.
   - Nothing is deleted.
   - The same `action_text` again is an ordinary merge: a new case.
4. **A hunch never supersedes.** "I think the key might have moved" is stored as its own `hunch` assertion and the current fact stays live.
5. **`get_context` filter, step 2 (validity).** A superseded assertion is `declined` with the reason `"superseded by <new id> on <date>"`, not `"expired"`.
6. **The comparison is deterministic.** No model call decides whether two facts differ. The extractor still produces `action_text`, as it does now.

**Contract change.** Add two optional fields to `contracts/assertion.schema.json`: `supersedes` (string or null) and `superseded_by` (string or null). If contracts are already frozen, Mikael edits them by hand (§2, rule 1).

**Tests (new scenario `12b_barrier_update`):**
- **Input.** The barrier email (2 Oct), then a Teams message from a field engineer (7 Nov): "the key moved, it's in the site cabinet now".
- **Two assertions.** The old one has `valid_to = 2026-11-07…` and `superseded_by` set.
- **The update wins.** `dispatch_created` for that site on 8 Nov → `proposed` with the cabinet location. The old one comes back `declined`, with a reason containing "superseded".
- **Time travel still works.** `dispatch_created` with `at_time` 5 Oct → the email's location is `proposed`.
- **A hedged update doesn't supersede.** "I think the key may have moved" → a `hunch`; the old location stays `proposed`.

### A2. First-hand updates from field engineers count as `stated`

**Problem.** §4.4 makes anything from a speaker without the expert role and without an observed outcome a `hunch`, and §4.6 step 4 never proposes a hunch. So a field engineer reporting what he can see on site ("the key is in the cabinet now") would be captured and then never used.

**Rule.**
- **Extractor output.** Add one boolean to `ExtractedRule`: `first_hand`, true when the speaker reports something they directly did or observed themselves ("I moved it", "it's in the cabinet now", "I'm at the site and the gate is open"). Give it a clear `Field(description=...)`.
- **Trust derivation**, deterministic, in this order:
  1. any case with `outcome: recovered` → `verified_by_outcome`
  2. `hedged` → `hunch`
  3. `said_by_role == expert` **or** `first_hand` → `stated`
  4. otherwise → `hunch`

**Tests:**
- Veikko (`field_engineer`): "the key moved, it's in the site cabinet now" → `stated`.
- "Someone said the key might be in the cabinet" → `hunch` (hedged and not first-hand).
- Erkki's core thread is unchanged → `verified_by_outcome`.

### A3. One more demo step: the update

Add **beat 6** to `demo.py` after the barrier beat:

6. **Update.**
   - Ingest the field engineer's Teams message, from scenario `12b_barrier_update`.
   - Print the old and new assertions, with the old one's `valid_to` and `superseded_by`.
   - Run `dispatch_created` for the site again: the **new** location is `proposed`, and the old one is shown as superseded, with its date.
   - Write `out/beat_6.json`, and update `out/thread_<id>.json` for that thread.
   - No question is asked: nothing was ambiguous.

The video line is: *"Nobody edited anything. The newer message replaced the old fact, and the old one is kept with the date it stopped being true."*

Also keep the **mock Teams thread** (§8, `out/thread_<id>.json`) as the must-have screen. It is where the one question and Erkki's tap appear in the video. The context map is the optional extra.

**Synthetic data.** Abhishek writes the scenario script for `12b_barrier_update`: a Finnish-style field engineer, no ticket number, a short Teams message. It is marked `placeholder: true` until he has read the generated thread, and logged in `data/DATA_CARD.md`.

---

## Part B: optional, frontend extras (only if Mikael or Abhishek asks)

These only help the optional context map and chat. With our small synthetic data, the frontend can work most of this out itself from `out/graph.json`, so build these only if there is time after the spine passes.

| # | What | Why | Cost |
|---|---|---|---|
| B1 | **Network shape in `out/graph.json`.** Node kinds add `region` and `model`. Edges add `IN_SITE` (node → site), `IN_REGION` (site → region), `OF_MODEL` (node → model), and `CASE` (assertion → each entity in `evidence.cases`). Node `attrs` include `trust`, `status`, `valid_to`, `superseded_by`. | The map can draw device → site → region and show where a tip was used | Small; the cheapest and most useful item here |
| B2 | **A short `label` per assertion**, from a fixed template per action, e.g. `interface.bounce` with `avoid` containing `node.reboot` → "Bounce, don't reboot"; `site.access_key` → "Site access". No model call. | Readable node labels on the map | Small |
| B3 | **`GET /context/{entity_id}`.** Every live (not superseded, not expired) assertion whose decided or surviving candidates hold for the entity, or that is bound to it, regardless of trigger. Deterministic. | The chat's "look up context" job | Small |
| B4 | **`POST /chat`.** One cached `llm.structured` call classifies the message as `ask` or `add`. An `add` goes through the normal adapter (new channel value `context_chat`) → extractor → merge path, exactly like a Teams message, including A1 and A2. An `ask` resolves the entity, calls B3, and the model only phrases the answer from those results, citing assertion IDs. | The chat panel on the map | Medium. Its calls must be cached, and any chat shown in the video must be a `demo.py` beat. |

Count badges, the neighbourhood view and the hunch toggle are computed in the frontend. The backend needs nothing more for them.

---

## Small note

`BACKEND_PROMPT.md` points agents at `MIKAEL_HANDOFF.md` v6. The merged team handoff is now `HANDOFF.md`. Mikael's call whether to update that pointer.
