# FRONTEND PROMPT: Elisa hidden-knowledge context layer (UI)

You are building the frontend of a hackathon entry for Elisa's "hidden knowledge" challenge. Abhishek owns it.

**Read first:**
- `HANDOFF.md` sections 4, 5, 6 and 8: the plan, the design, the demo and video, and scope.
- `BACKEND_PROMPT.md` sections 4 and 8: the contracts and what the backend writes for the frontend.
- `BACKEND_PROMPT_ADDENDUM.md`: superseded facts, first-hand trust, beat 6, and the optional frontend extras B1–B4.

**This prompt:** the build spec for the UI only.

**Goal right now: looks and behaviour, running on mock data.**
- Abhishek must be able to run it, click through it and judge it before the backend exists.
- It must switch to the real backend with **one setting** and no code changes, once `demo.py` and `api/app.py` exist.

**The UI's place in the entry.** The backend is the product: it finds context, keeps it up to date and asks on Teams only when it must. The UI is how the video *shows* that. The context map and chat are an optional "wow" extra. Build in the priority order of section 6, and never let the extras delay the must-have screen.

---

## 1. What the UI shows, in one paragraph

- **Thread (must-have).** A mock team-chat thread, where an expert's normal conversation happens. Later, the system's one question lands there and he answers with one tap. The "your tip was used today" notice appears there too.
- **Context map (optional extra).** A dark, Obsidian-style map of the network around one device:
  - grey dots for Elisa's network
  - glowing nodes for context points (tips)
  - count badges for everything further away
  - unconfirmed hunches hidden behind a toggle
- **Chat (optional extra).** A chat window that stays collapsed until an engineer wants to look something up or add something.
- **Title card (video asset).** A chapter title screen for the video.

## 2. The design principle: almost nothing on screen

An engineer should barely notice this exists. Every screen shows only what helps with the fault in front of them.

**Do not add:**
- stats panels or dashboards
- tables of results
- sidebars of metadata
- confidence numbers
- "AI" badges
- onboarding text
- settings pages

If a piece of information is not needed to act on this fault, it is not on screen. The one deliberate exception is the video's "0 forms, 1 tap" counter, which is an overlay in the title card, not part of the app.

## 3. Tech

- **Stack.** Vite + React 18 + TypeScript, in `ui/` (the repo layout in `HANDOFF.md` section 15). Node 20.
- **Dependencies.** `d3-force` for the map layout, and `vitest` + `@testing-library/react` for tests. No other dependencies without asking: no UI kits, no CSS frameworks, no state libraries. Plain CSS with custom properties in one `tokens.css`.
- **Scripts.** `npm run dev` runs it. `npm run build` makes a static build. `npm test` runs the tests.
- **The data switch.** One setting: `VITE_DATA_SOURCE=mock|api` (default `mock`) and `VITE_API_URL` (default `http://localhost:8000`). Nothing else in the code knows which source is active.
- **No real connectors.** No Teams, Slack or email connector, and no network calls except to `VITE_API_URL` when the source is `api`.
- **Fonts.** "Source Sans 3" from Google Fonts. A system font is the fallback.

## 4. The data layer: what makes it mergeable

All data goes through one module, `ui/src/data/`. Components never fetch or import JSON directly.

### 4.1 Types mirror the backend contracts

`ui/src/data/types.ts` mirrors the backend's contracts exactly, using the same field names and the same vocabulary strings:
- `Assertion` (`BACKEND_PROMPT.md` 4.4, plus `supersedes` and `superseded_by` from addendum A1)
- `Message` (4.1)
- `Node` and `Site` (4.2)
- `ContextResult` and `Question` (4.6, 5.4)
- `Graph` (section 8: `nodes[{id,label,kind,attrs}]`, `edges[{from,to,kind,support,against}]`)
- `Thread` (`out/thread_<id>.json`)
- `Notification` (5.7)

**The backend's `contracts/` folder is the source of truth.** When it exists, re-check these types against it. If they differ, change the **types and the adapter here**, never the backend.

### 4.2 One interface, two implementations

```ts
interface DataSource {
  getGraph(): Promise<Graph>;
  getThread(id: string): Promise<Thread>;
  getAssertion(id: string): Promise<Assertion>;
  reportIncident(args: {entity_id: string; event: string; symptoms: string[]; at_time: string}):
    Promise<{results: ContextResult[]; agent_text: string}>;
  answer(assertion_id: string, option_index: number): Promise<void>;
  getContextFor?(entity_id: string): Promise<Assertion[]>;          // backend extra B3; optional
  chat?(text: string): Promise<{kind: "ask" | "add"; reply: string; assertion_ids: string[]}>; // B4; optional
}
```

- **`mockSource.ts`** reads fixtures from `ui/src/data/mock/`, keeps state in memory (answers, chat additions), and simulates a small delay (150 ms) so loading states are visible.
- **`apiSource.ts`** calls the backend endpoints:
  - `GET /graph`
  - `GET /threads/{id}`
  - `GET /assertions` (and filters by ID if there is no single-item endpoint)
  - `POST /incident`
  - `POST /answer`
  - and, only if they exist, `GET /context/{entity}` and `POST /chat`

### 4.3 Degrade gracefully when the backend extras don't exist

The backend extras B1–B4 in `BACKEND_PROMPT_ADDENDUM.md` are optional. The UI must work without them.

- **No network edges in the graph (B1 missing).** If the graph has no `IN_SITE`, `IN_REGION` or `OF_MODEL` edges, read `site`, `model` and `region` from node `attrs` and build those edges in the frontend (`ui/src/data/derive.ts`). If the attributes are missing too, draw the tips attached only to their case entities.
- **No `label` (B2 missing).** Make one with the same template table as the addendum:
  - `interface.bounce` with avoid containing `node.reboot` → "Bounce, don't reboot"
  - `site.access_key` → "Site access"
  - unknown actions → the first 4 words of `action_text`
- **No `getContextFor` (B3 missing).** The chat's "look up" falls back to filtering `getGraph()` assertions whose `CASE` or scope edges touch the entity.
- **No `chat` (B4 missing).** The chat panel still opens. Asking works through the B3 fallback, with a fixed, plain reply built from the tips found (no model). Adding shows: "Adding context from here isn't connected yet. Say it in your team chat and it will be picked up."

### 4.4 Mock fixtures

The fixtures live in `ui/src/data/mock/` and match the backend's `out/` shapes exactly. Write them from Elisa's provided material plus the synthetic data already named in the plan. **Use no ticket numbers anywhere.**

**Topology.** Matches `BACKEND_PROMPT.md` 4.2 seed:
- 3 sites in 2 regions (north, south)
- TRN-042: TX-200, 2019, firmware 4.1, site OULU-07, north
- TRN-087: TX-200, 2018, 4.1, a different northern site, OULU-11
- TRN-101: TX-300, 2023, 5.2
- one TX-250 from 2018, and one TX-200 from 2016
- OULU-03 in the north, with a barrier on its access road
- about 20 nodes in total

**Assertions:**

| ID | What | Trust | Status |
|---|---|---|---|
| CA-0001 | Erkki's bounce-don't-reboot tip, cases TRN-042 (1 Nov) and TRN-087 (7 Nov), `decided: install_year <= 2019` | `verified_by_outcome` | `decided` |
| CA-0002 | Barrier key from an email (2 Oct): "[KEY LOCATION FROM THE EMAIL]" | `stated` | superseded by CA-0003 on 7 Nov |
| CA-0003 | Barrier key update from a field engineer in Teams (7 Nov): "in the site cabinet" | `stated` | `open` |
| CA-0004 | Winter power cuts, bound to region north | `stated` | `open` |
| CA-0005 | "Firmware 5.0 may fix it", on TX-200 units | `hunch` | `open` |

**Other fixtures:**
- **Thread** `thread-001`: Elisa's 12-message chat (from `data/elisa_examples/teams_chat.json`, with the synthetic date 2026-11-01). Then, on 7 Nov, the question for TRN-087 with its three options (5.4), Erkki's answer, and the notification.
- **`beats/beat_1.json` … `beat_6.json`**: hand-written stand-ins in the backend's `out/beat_N.json` shape, one per demo beat (section 7.3).
- **`README.md`** in the mock folder: "These files are hand-written stand-ins. Replace them by switching `VITE_DATA_SOURCE=api`. Never shown in the final video."

## 5. Screens

### 5.1 Visual tokens (`ui/src/tokens.css`)

One dark theme for all screens.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#1E1F22` | page background |
| `--panel` | `#2A2C31` | chat panel, cards, badges |
| `--line` | `#3A3D44` | dividers |
| `--line-strong` | `#4A4E57` | card and input borders |
| `--text` | `#E4E7EC` | body text |
| `--text-muted` | `#A9B0BA` | secondary text (passes 4.5:1 on `--bg` and `--panel`) |
| `--net` / `--net-hub` | `#8E9BAA` / `#B7C2CE` | network dots |
| `--focus-node` | `#E4E7EC` | the device in focus |
| `--context` | `#FF3D7F` | tips, with glow `0 0 22px 8px rgba(255,61,127,.5)` |
| `--hunch` | `#B8496F` | hunches, with a weaker glow |
| `--context-text` | `#FFD1E0` | tip labels |
| `--focus-ring` | `#FFFFFF` | keyboard focus, 3px with a 2px offset |

**Radii:** 8px for controls, 12–14px for panels, fully round for badges and dots.

**Spacing:** a 4px grid.

**Type:**
- 15px body
- 13–14px secondary text
- 16–18px titles
- weights 400, 600 and 700
- sentence case everywhere: no all-caps labels, no letter-spaced eyebrow labels

### 5.2 Thread page: `/thread/:id` (must-have, priority 1)

A generic team-chat look. **Not** a copy of Microsoft Teams: no Teams logo, colours, name or layout chrome. The header just says the thread's participants.

- **Messages.** Avatar initials, name, time and text. The expert's messages are visually the same as everyone's: capture is invisible, because that is the point.
- **One quiet line after capture.** Under the message whose excerpt became a tip, a small muted line with a check icon: "Saved as a tip. Nothing for you to do." Only on the message that holds the excerpt. One per tip, never more.
- **The question card**, when the thread has a question:
  - it comes from the system, with a small network icon as its avatar and the name "Context layer"
  - the question text, then one button per option (at least 44px tall)
  - one muted line: "Asked once. Your answer is remembered."
  - tapping an option calls `answer()`; the card collapses to "Answered: <label>" and the buttons go
- **The notification**, when one exists: a dark banner, "Erkki, your tip was used on TRN-087 today", plus one line saying what happened. Built from `Notification` and the related `ContextResult`.
- **No side panels and no metadata.** Width capped at about 760px, centred.

### 5.3 Context map: `/` (optional extra, priority 2)

**The view.**
- A full-window dark map, with a small header at the top left: "Context map" and a chip "Around <focus id>".
- At the top right: a checkbox, "Show unconfirmed hunches" (off by default), and a text button, "Zoom out to whole network".
- **Focus.** `?focus=TRN-087` (default TRN-087).

**What's in the local view:**
- the focus device
- nodes within 2 hops over network edges (device → model group, device → site → region)
- every **live** tip attached to any of those:
  - through a `CASE` edge to a node in view, or
  - whose decided scope (or all surviving candidates) holds for the focus device, or
  - bound to a site or region in view

**Live** means not superseded and not past `valid_to`. Superseded and expired tips are never drawn. Hunches are drawn only when the toggle is on: dimmer, with a smaller glow.

**Everything else becomes count badges.**
- One badge per region or site group outside the view, e.g. "3 more sites, 4 tips".
- One badge for the rest, e.g. "Rest of the network: 12 tips".
- Counts are computed from live tips only.
- Clicking a site badge expands it into its nodes and tips in place.

**Zoom out.** Shows only regions as nodes, each with a badge of its tip count. Clicking a region zooms back in, focused on that region.

**Layout.**
- `d3-force`, run to a fixed number of ticks on load, then frozen. The map must not wobble while recording.
- The focus device is pinned at the centre.
- A deterministic seed or initial positions, so the same data always gives the same picture.

**Rendering.**
- One SVG for the edges (`aria-hidden`). Network edges are thin grey; tip edges are pink.
- Absolutely positioned HTML on top for nodes, so they can be real buttons.
- Every tip node is a `<button>` with a 44px hit area and an `aria-label` of its title.
- Network dots are decorative, with visible text labels.

**Click a tip → a small card next to it, three lines only:**
1. the title (label)
2. one sentence: what to do, and what to avoid
3. muted: who said it, the channel and date, the trust in words, and the case count. If it replaced older info: "Replaced earlier info from <date>."

**Trust in words:**

| Trust | Shown as |
|---|---|
| `verified_by_outcome` | "Verified" |
| `stated` | "Stated, not yet verified" |
| `hunch` | "A hunch. Agents won't use it until it's confirmed." |

Never show a number other than the case count.

**Motion.** One subtle glow on tips, and nothing else animated. Respect `prefers-reduced-motion`: no glow pulse.

### 5.4 Chat panel (optional extra, priority 3; lives on the map page)

- **Collapsed by default.** A pill button at the bottom right: "Ask or add context".
- **Open.** A 380px panel with the header "Ask or add context", a collapse button, the message list, and an input with a hidden label "Message" and the placeholder "Ask, or tell it something new". Plus a send button with `aria-label="Send"`.
- **Sending.**
  - Calls `chat()` if it exists, otherwise uses the fallback in 4.3.
  - Replies are short and cite what they used. For example: "Locked barrier on the private road. Key: in the site cabinet. Updated 7 Nov, replacing an email from 2 Oct."
  - When a reply mentions tips, those tips briefly highlight on the map: one 600ms ring, with no motion if reduced motion is on.
- **The mock source scripts two exchanges** that match the demo:
  - "Anything I should know about OULU-03 before I drive out?" → the barrier key answer
  - "The key moved, it's in the site cabinet now" → "Got it. Added to OULU-03. The earlier info is kept with the date it stopped being true."
- **The chat never asks the engineer questions.** It answers, or it confirms what it saved.

### 5.5 Title card: `/title/:chapter` (video asset)

- A 1920×1080 layout, scaled to fit the window, for screen recording.
- `chapter` is one of `capture`, `bind`, `recall`, `stay-true`.
- **The content:**
  - "Chapter N of 4"
  - the chapter word, very large, 700 weight
  - one line under it:
    - Capture: "Knowledge pulled from a normal conversation. Nobody fills in a form."
    - Bind: "Linked to the right place in the network, and nowhere else."
    - Recall: "Used the moment the same fault comes back."
    - Stay true: "Replaced when it changes. Dropped where it no longer holds."
  - a glowing pink line across the lower third, with four stops; the current stop is larger and glowing
- Same tokens as the app. `?counter=1` adds "0 forms · 1 tap" in the corner (the only place this counter appears).

### 5.6 Beat replay: `?beat=N` on `/` and `/thread/:id`

- **What it does.** Loads `beat_N.json` and shows the UI in exactly that beat's state, so each video shot is reproducible.
  - On `/thread/thread-001`: beat 2 shows the thread with the capture line; beat 3 adds the question, then the answer and the notification.
  - On `/`: beat 3 shows the map focused on TRN-087 with CA-0001 selected; beat 4 shows it focused on TRN-101, where no tip applies; beats 5 and 6 show it focused on OULU-03 with the barrier tip, before and after the update.
- **Stepping.** Use focusable "Previous beat" and "Next beat" buttons in a corner of the page, hidden with `?clean=1` for recording. Do not add global key handlers; they would steal keystrokes from the chat input.

## 6. Build order, tests and gates

Sequential. Each step ends with a command Abhishek runs and something he looks at. "It works" without him running it does not count.

| # | Step | Test | Abhishek's gate |
|---|---|---|---|
| 0 | Vite + TS app in `ui/`, `tokens.css`, `types.ts`, mock fixtures | fixtures type-check; a test loads each fixture through `mockSource` | `npm run dev` opens a blank dark page; skim the fixtures |
| 1 | Data layer: `DataSource`, `mockSource`, `apiSource`, `derive.ts` | `derive.ts` builds network edges from `attrs`; label templates; live/superseded/hunch filters; `apiSource` against a stubbed fetch | `npm test` green |
| 2 | **Thread page** (must-have) | renders 12 messages + question; tapping option 0 calls `answer` and shows "Answered"; the notification shows | Click through `/thread/thread-001` |
| 3 | Context map, local view | the focus is pinned; superseded CA-0002 is not drawn; CA-0005 only with the toggle; the badge counts match the fixtures; the same data gives the same positions | Look at `/`; toggle hunches; open a site badge |
| 4 | Tip card + zoom out | the card shows 3 lines with the trust in words; "Replaced earlier info" on CA-0003; zoom out shows regions with counts | Click each tip; zoom out and back |
| 5 | Chat panel | collapsed by default; both scripted exchanges work in mock; the highlight ring appears; the fallback message shows when `chat` is absent | Open the chat, send both messages |
| 6 | Title card | all four chapters render at 1920×1080 | Look at each chapter |
| 7 | Beat replay | beats 1–6 load on both pages; `?clean=1` hides the controls | Step through all six |
| 8 | API switch smoke test | with `VITE_DATA_SOURCE=api` and the backend running, the thread and map load from the API | Only once the backend's step 8 exists |

**Feature freeze is Saturday 20:00, the same as the backend.** If behind, cut in this order:
1. zoom out
2. chat panel
3. beat replay on the map
4. the map itself

**The thread page and the title card are never cut.**

## 7. Rules

1. **Honesty for the video.** Shots in the final video are recorded with `VITE_DATA_SOURCE=api` against the backend's real `demo.py` output, or against `out/` files copied from it. Mock fixtures are for building the looks only. If the backend can't produce something, it isn't in the video.
2. **Never invent backend behaviour in the UI.** The UI does not decide scope, trust, precedence or supersession; it displays what the data says. The only logic in the UI:
   - deriving missing network edges and labels (4.3)
   - choosing what's in view
   - counting badges
3. **Vocabulary.** Use the backend's strings in code (`verified_by_outcome`, `site.access_key`…). Show the plain-language versions in 5.3 on screen. Say "tip" on screen, never "assertion".
4. **Accessibility, as built, not as an afterthought:**
   - real buttons, inputs and labels
   - visible focus rings
   - 44px targets
   - text contrast at least 4.5:1 (the tokens in 5.1 pass on the dark backgrounds)
   - nothing told apart by colour alone (hunches also differ in size and glow strength, and their card says "hunch")
   - `prefers-reduced-motion` respected
   - the map has a text alternative: a visually hidden list of the tips in view
5. **Phone width.** The thread page and chat panel work at 390px wide. The map may scroll horizontally on a phone.
6. **No numeric confidence, no editing of tips, no real connectors, no ticket numbers.** Editing tips in the UI is next-steps only.
7. **No secrets.** Only the API URL, via the env file.

## 8. Definition of done

- `npm test` green.
- `npm run dev` with mock data shows: the thread page with the question and notification; the map around TRN-087 with badges, the hunch toggle, tip cards and zoom out; the chat with both exchanges; all four title cards; and beats 1–6.
- Switching to `VITE_DATA_SOURCE=api` needs no code change, and works once the backend's `api/app.py` runs.
- `ui/README.md`: how to run it, how to switch to the backend, which screens exist, and that the mock data is hand-written and not shown in the final video.
