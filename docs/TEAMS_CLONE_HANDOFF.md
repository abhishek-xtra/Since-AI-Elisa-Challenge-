# Handoff: the team-chat clone for the demo

For whoever builds the chat UI (Abhishek, or a Claude Code session given this file). Written Saturday 8 Nov 2026 morning from branch `backend`, tag after `fix-2`. It extends `FRONTEND_PROMPT.md` section 5.2 (the thread page); where the two differ, this file wins for the chat screens, and `FRONTEND_PROMPT.md` still wins for stack, tokens and the data-layer interface.

## 1. What to build

A workplace chat app that looks like Teams at a glance: a left rail of channels and chats, a thread in the middle, nothing else. Four scenes from `docs/DEMO_CHAT.md` play in it, every agent line coming from backend output. Two modes:

- **Replay** (`?beat=N`, 1 to 7): the UI shows exactly the state the backend's `out/beat_N.json` left. This is what the video records.
- **Live** (no `?beat`): the same screens, but "Report fault" and the question buttons call the API, so a judge can click.

Not a copy of Microsoft Teams: no logo, name or exact colours (trademark; `FRONTEND_PROMPT.md` 5.2 says the same). A generic chat look with the brand tokens is enough. Mikael decides if he wants it closer.

## 2. What exists today (the data you integrate)

Run once in the repo root, then everything below is on disk and on `http://localhost:8000`:

```powershell
$env:LLM_OFFLINE="1"; py -3.14 demo.py        # writes out/ (seven beats, offline, ~20 s)
uvicorn api.app:app                           # serves out/ and two POST routes; CORS is open
```

### 2.1 Threads (`out/thread_<id>.json`, `GET /threads/{id}`)

| thread_id | channel | messages | questions | notifications | captured | What it is |
|---|---|---|---|---|---|---|
| `thread-001` | teams | 12 | 2 | 2 | 1 | Elisa's own chat, Veikko and Erkki, 1 Nov (scene 1). Both questions land here; both notifications are to Erkki. |
| `email-001` | email | 1 | 0 | 0 | 0 | Erkki's follow-up email, 1 Nov. Second source of CA-0001. |
| `email-12_barrier` | email | 1 | 0 | 1 | 1 | Kalle's 2 Oct email: barrier key at the farm (beat 5). |
| `thread-12b_barrier_update` | teams | 2 | 0 | 1 | 1 | Veikko tells Timo the key moved to the site cabinet, 7 Nov (beat 6). |
| `thread-13_second_technician` | teams | 2 | 0 | 0 | 0 | Sami in Helsinki on TRN-105, 8 Nov (beat 7, scene 3). Shown, never ingested. |

Shape:

```json
{
  "thread_id": "thread-001", "channel": "teams",
  "messages": [{"id": "teams:thread-001:1", "author": "Veikko Vikkelä", "role": "field_engineer",
                "timestamp": "2026-11-01T09:14:00+02:00", "channel": "teams", "thread_id": "thread-001",
                "text": "Hi Erkki, ...", "incident": null}],
  "questions": [{"assertion_id": "CA-0001", "key": "...", "to": "Erkki Expert", "thread_id": "thread-001",
                 "text": "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site.",
                 "options": [{"label": "All older units", "sets_decided": "install_year <= 2019", "edge": "open", "edge_answer": null}, "...", {"label": "No", "..."}],
                 "entity_id": "TRN-087", "answered": true}],
  "notifications": [{"to": "Erkki Expert", "text": "Your tip from 2026-11-01 was proposed for TRN-087 today.",
                     "assertion_id": "CA-0001", "entity_id": "TRN-087", "at": "2026-11-07T10:00:00+02:00"}],
  "captured": [{"message_id": "teams:thread-001:8", "assertion_id": "CA-0001"}]
}
```

- `role` is `field_engineer` or `expert`. Avatars are initials; the expert looks like everyone else.
- `captured` names the message whose text holds the tip's verbatim excerpt. That is where the one quiet line "Saved as a tip. Nothing for you to do." goes. Never anywhere else.
- `questions[].answered` is true once the answer was applied. Edge questions have two options with `edge_answer` set (`raise`/`close`); scope questions have one option per candidate with `sets_decided`.
- Thread files are **cumulative** (the final state after all beats). For replay by beat, filter: a notification belongs to the beat whose incident time equals its `at`; a question belongs to the beat of its `entity_id` (table in section 4).

### 2.2 Beats (`out/beat_N.json`, `GET /beats/{n}`)

`{"beat": N, "title": "...", "lines": ["printed demo lines"], "data": {...}}`. The `data` keys per beat:

| N | title | `data` keys | Screen it drives |
|---|---|---|---|
| 1 | No context | `results` (empty), `proposal`, `agent_text` | Veikko's fault channel before anything exists: `agent_text` = "No captured context applies to this incident; nothing to add." |
| 2 | Capture and link | `assertion`, `counters {messages, assertions, questions_asked}` | thread-001 with the capture line under message 8; overlay from `counters` |
| 3 | First use and the one question | `results_before`, `question`, `answer {option_index}`, `assertion`, `results`, `proposal`, `agent_text`, `counters {messages, assertions, forms, taps}` | the question card in thread-001, Erkki's tap (option 0), then `agent_text` in Veikko's fault channel, then the notification |
| 4 | Decline | `results_before`, `question`, `answer {option_index: 1}`, `assertion`, `results` | the edge question in thread-001, Erkki taps No, the decline reason from `results[0].reason` |
| 5 | Barrier | `results`, `notifications` | a dispatch for OULU-03: `results[0].assertion.action_text` is the key location; notification to Kalle |
| 6 | Update | `assertions` (old and new), `results`, `questions` (empty), `video_line` | thread-12b_barrier_update; the old fact shown struck through with `valid_to`, the new one proposed |
| 7 | Second technician, no question | `incident {entity_id, event, symptoms, at}`, `results`, `proposal`, `agent_text`, `notifications`, `questions_new: 0` | thread-13_second_technician with `agent_text` inserted as the agent's reply at `incident.at`; the notification in thread-001 |

A `ContextResult` in `results` is `{"assertion": {...full assertion...}, "outcome": "proposed|declined|ambiguous", "reason": "all hold: install_year <= 2019", "question": null | {...}}`. The `reason` strings are deterministic and short; show them as the STATUS line verbatim rather than rewriting them.

### 2.3 Other files

- `out/questions.json`: every question ever built, in order, with `entity_id`; no `answered` flag (that is only in thread files).
- `out/notifications.json`: every notification, with `at`.
- `out/assertions.json` (`GET /assertions`): the full store. `out/graph.json` (`GET /graph`): `nodes[{id,label,kind,attrs}]`, `edges[{from,to,kind,...}]` with kinds `SCOPED_BY`, `EVIDENCED_BY`, `CASE`, `IN_SITE`, `IN_REGION`, `OF_MODEL`. Not needed for the chat clone.
- `data/topology.json`: the 20 nodes and 4 sites, for the "Report fault" picker in live mode.

### 2.4 Extra chats to fill the rail (synthetic, not in `out/`)

`data/scenarios/04..10/thread.json` are seven more Teams-format threads (chit-chat, a hunch, a conflicting remedy, a failed fix on a 2016 unit, typos). They are **not** ingested by the demo and have no `out/` file, so copy them into the UI's mock folder and show them as ordinary chats with no agent activity. They make the rail look lived-in. Their format is the raw fixture format, not the `out/` message shape:

```json
{"channel": "teams", "date": "2026-11-03", "participants": [{"name": "...", "role": "Field Engineer"}],
 "messages": [{"seq": 1, "time": "09:14", "author": "...", "role": "Field Engineer", "text": "..."}]}
```

Map `date + time` to a timestamp (+02:00) and `role` to `field_engineer`/`expert`. All names are invented; the data card `data/DATA_CARD.md` lists every file and its hand edits. Never show ticket numbers (there are none).

### 2.5 API, live mode

- `POST /incident` body `{"entity_id": "TRN-105", "event": "sfp_replaced", "symptoms": ["link_up","optics_normal","alarms_cleared","counters_zero"], "at_time": "2026-11-08T14:00:00+02:00"}` returns `{"results": [ContextResult...], "agent_text": "..."}`. `at_time` must carry a timezone or it is a 422. It regenerates every thread file, so re-fetch the thread afterwards for new questions and notifications.
- `POST /answer` body `{"assertion_id": "CA-0001", "option_index": 0}` returns the updated assertion. 409 if that assertion's latest question is already answered, 422 if the index is out of range.
- Events and symptoms are the closed lists in `contracts/vocabulary.md`. The fault picker should offer only those.
- The stand-in model call behind `agent_text` is served from `.llm_cache/` when the request matches a demo input; an unseen input with `LLM_OFFLINE=1` falls back to a text built in code (same wording). Without the flag it costs one live call, a fraction of a cent.

## 3. Screens

1. **Rail** (left, 280px): "Faults" channel group with one channel per reported fault (TRN-087, TRN-101, TRN-105), "Experts" with thread-001, "Site access" with the barrier email and the update thread, then the seven filler chats under "Other". Unread dots only where a beat added something.
2. **Thread** (centre, max 760px): messages as in `FRONTEND_PROMPT.md` 5.2. Add the agent as a participant called "Context layer" with a small network icon. It posts exactly three kinds of message, nothing else:
   - a **proposal**: `agent_text` verbatim, in the fault channel, at the incident time;
   - a **question card**: `question.text` plus one button per option, in the expert's thread (`question.thread_id`), collapsing to "Answered: <label>" once `answered`;
   - a **notice**: `notification.text` verbatim, as a muted one-liner in the expert's thread.
3. **Fault channel** (one per incident entity): the technician's report message(s) (synthetic: Sami's are in `thread-13_second_technician`; for TRN-087 and TRN-101 write two short lines in the same style, or ask the backend for a fixture), then the STATUS line built from `results[].outcome` and `reason`, then the agent's proposal if any. If the outcome is `ambiguous`, the STATUS line says the question went to the expert and the proposal appears only after the answer.
4. **Report fault** (live mode only): a small form with entity (from topology), event, symptoms (checkboxes from the vocabulary), posts `/incident`, then opens that fault channel. It is the one place with controls; keep it off screen in replay mode.

No dashboards, no metadata panels, no confidence numbers, no "AI" badge. The "0 forms · 1 tap" counter is a video overlay from `beat_3.data.counters`, not app chrome.

## 4. Scene to beat to data

| Scene (`DEMO_CHAT.md`) | `?beat` | What is on screen | Source fields |
|---|---|---|---|
| 1 original chat | 2 | thread-001, capture line under message `teams:thread-001:8` | thread `captured`; overlay `beat_2.data.counters` and `assertion.applies_to.candidates` |
| 2 first reuse | 3 | TRN-087 fault channel: STATUS "ambiguous" then proposal; thread-001: question 0 and its answer; notice for TRN-087 | `beat_3.data.results_before[0].reason`, `question`, `answer`, `agent_text`; thread `questions[0]`, `notifications[0]` |
| 4 decline | 4 | TRN-101 fault channel: STATUS from `results[0].reason` ("install year 2023 is beyond the known edge 2019"); thread-001: edge question, Erkki taps No | `beat_4.data` |
| 3 second technician | 7 | thread-13_second_technician with the proposal inserted at 14:00; thread-001 notice for TRN-105 | `beat_7.data.agent_text`, `incident.at`, `notifications` |
| (barrier, if shown) | 5, 6 | OULU-03 dispatch channel: key location; email-12_barrier notice to Kalle; thread-12b: old fact struck through | `beat_5.data.results`, `beat_6.data.assertions` (`valid_to`, `superseded_by`) |

Beat state is cumulative: at `?beat=7` everything from beats 2 to 6 is also visible. Beat 1 shows the TRN-087 fault channel with the "nothing to add" line and an empty rail apart from the filler chats.

Replay filters: notification → beat by `at` (`2026-11-07T10:00` beat 3, `2026-11-08T08:00` beat 5, `2026-11-08T14:00` beat 7); question → beat by `entity_id` (TRN-087 beat 3, TRN-101 beat 4); captured lines → beat 2 (thread-001), 5 (email-12_barrier), 6 (thread-12b).

## 5. Rules

- Every sentence the agent says on screen is a backend string: `agent_text`, `question.text`, option `label`, `notification.text`, `reason`. Do not write agent dialogue in the frontend. STATUS lines may wrap a `reason` in a fixed template ("Erkki's tip does not apply: {reason}.").
- Technician lines you write are synthetic and must be marked so in the mock folder README. No real names, no ticket numbers, no invented procedures. When the agent has nothing, the technician does whatever they were going to do; the UI does not suggest anything.
- Never change `contracts/`, `demo.py` or `api/`. If a shape is missing, say which field and the backend adds it (two examples that are easy: a fixture thread for Veikko's TRN-087 report, and a `GET /scenarios` route serving the filler chats).
- Dates: the chat is dated 1 Nov 2026 (synthetic; Elisa's file has times only). Show dates as the data gives them.
- Backend is read through `VITE_API_URL`; the mock folder mirrors `out/` byte for byte so `VITE_DATA_SOURCE=mock|api` is the only switch.

## 6. Definition of done

- `?beat=3` and `?beat=7` on the thread page reproduce scenes 2 and 3 of `DEMO_CHAT.md` with no hand-typed agent text.
- Live mode: report a fault on TRN-019 (TX-200, 2016) after beat 7 and the proposal appears with no question; report one on TRN-102 (TX-300, 2024) and the STATUS line shows the decline reason.
- A judge reading the mock folder finds a README saying which files are Elisa's, which are generated (and by what), and which are hand-written.
- `npm test` covers: the replay filters (question and notification to beat), the question card collapsing after `answer()`, and the rule that the agent posts only the three message kinds.
