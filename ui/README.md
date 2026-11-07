# Teams chat demo

Local Vite + React 18 + TypeScript implementation of the handoff. Only `ui/` contains implementation changes. The enclosing directory is an extracted ZIP, with no Git repository; no branch was created.

## Run

Use Node 20 or newer, then in `ui/`:

```powershell
npm install
npm run dev
npm test
npm run build
```

Open the local address printed by Vite. Without a query parameter the app is live (using mock by default). Use `/?beat=1` through `/?beat=7` for cumulative replay. Beat 3 opens TRN-087; beat 7 opens TRN-105. The Experts conversation includes the original chat, captured tip, answered cards, and notices available at that beat. Replay disables composition and incident reporting. Use the rail to navigate between conversations. Ctrl+E searches authors and messages. Activity shows mentions; Files shows its empty state. Calendar, calls, meetings, attachments, and team management are informational demo placeholders.

To use the backend, copy `.env.example` to `.env.local` and set:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:8000
```

Restart Vite after changing environment variables. Components use only the `src/data/` adapter. The API adapter reads beats and threads and posts incident/answer requests; it refreshes threads after both mutations. Topology and filler chats remain local as permitted by the handoff. No authentication or secrets are required. Google Fonts is not fetched to respect the handoff's restriction on network calls: Source Sans 3 is used when locally installed, followed by Segoe UI and system fonts.

## Data provenance

Every JSON file directly in `src/data/mock/`, except `topology.json`, is a byte-for-byte copy of the handoff's `out/`; topology is copied unchanged from `data/topology.json`. See the mock README. Refresh these copies from the backend output rather than editing them.

## Mock behavior

Mock starts with the final demo store. Its incident adapter supports the demonstrated closed older-unit scope: matching SFP incidents on units installed through 2019 reuse beat 7's backend proposal with no question. Newer units use beat 4's decline result with the installation year substituted into its deterministic reason. Unsupported events/symptoms use beat 1's no-context text. OULU-03 dispatch uses beat 6's current access fact. API mode is required for full backend predicate evaluation and durable state. Mock answers are held in session memory and question cards collapse after a successful call; no copied fixtures are modified. Locally composed messages last until reload.

## Asked of the backend

- An explicit `answered_option_index` on each question is needed to recover arbitrary live selections after a reload. Replay uses each beat's `answer.option_index`. API questions already answered outside this session display “Answered” when the selected option cannot be known.
- No backend fixture exists for TRN-087/TRN-101 reports; synthetic report lines live in `src/data/synthetic.ts`. The mock README marks their origin.
- There is no backend in this ZIP, only an API reference, so real API verification needs a separately running backend. This implementation does not add or modify backend files.

## Verification

Vitest covers cumulative question/notification/capture filters, the three allowed agent message kinds, successful and failed question answers, and live mock incidents on TRN-019 and TRN-102. Production build runs TypeScript first. All icons are inline SVG and all agent dialogue comes from fixture/API fields. STATUS wraps backend outcome/reason separately from agent posts. Date/time display uses supplied timestamps and the Helsinki timezone. Narrow screens use a conversation drawer; reduced motion and visible focus are supported.
