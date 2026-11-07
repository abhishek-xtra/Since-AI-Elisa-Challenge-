# Frontend UI: context layer

The screens the video uses to show the backend at work. The backend is the product; this only shows what its data says. Build spec: `FRONTEND_PROMPT.md`.

## Run it

Node 20 or newer.

```bash
cd frontend-ui
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build    # static build in dist/
```

## Switch to the backend

One setting, no code changes. Copy `.env.example` to `.env` and set:

```
VITE_DATA_SOURCE=api            # default: mock
VITE_API_URL=http://localhost:8000
```

Then start the backend (`uvicorn api.app:app`) and restart `npm run dev`. The UI calls `GET /graph`, `GET /threads/{id}`, `GET /assertions`, `POST /incident` and `POST /answer`, and, only if they exist, `GET /context/{entity}` (B3), `POST /chat` (B4) and `GET /beats/{n}`. When `/beats/{n}` doesn't exist, beat replay reads the backend's `out/beat_N.json` copied into `frontend-ui/public/out/`.

If the backend's optional extras are missing, the UI fills the gaps itself (`src/data/derive.ts`): network edges from node attributes, short labels from a fixed template, context lookup from the graph, and a plain chat reply with no model.

## Screens

| URL | What |
|---|---|
| `/thread/thread-001` | The team chat: Erkki's 12 messages, the quiet "Saved as a tip" line, the one question, the one-tap answer and the "your tip was used" notice. |
| `/thread/thread-002` | Veikko's "the key moved" message, the source of the barrier update. |
| `/` | Context map around TRN-087 (`?focus=OULU-03` for another device or site). Hunch toggle, tip cards, site badges that expand. Chat panel at the bottom right. |
| `/?zoom=out` | A wireframe map of Finland split into its regions (maakunnat). Regions with sites are lit, with their tip count and a soft glow; individual tips only appear after zooming in, so it stays calm however many there are. Click a region to zoom into its diagram. Region borders are approximate (each region is the part of Finland nearest its centre). The topology's `region` can be a key like `north_ostrobothnia`, or the English or Finnish name; unknown values are listed under the map. |
| Zoom and drag | On the map and on Finland: scroll or pinch to zoom around the pointer, drag anywhere (also from a node) to move around, or use the +, − and Fit buttons. A drag never opens what it ends on. |
| `/title/capture`, `/bind`, `/recall`, `/stay-true` | 1920×1080 chapter title cards. `?counter=1` adds "0 forms · 1 tap". |
| `?beat=1` … `?beat=6` | On `/` or a thread: shows the UI in that demo beat's state. Add `&clean=1` to hide the beat buttons for recording. |

## Mock data

`src/data/mock/` is hand-written to match the backend's `out/` shapes, so the UI could be built before the backend existed. It is **not** shown in the final video: every shot is recorded with `VITE_DATA_SOURCE=api` against the backend's real `demo.py` output. See `src/data/mock/README.md` for what was generated and how.

## Layout

```
src/
  data/        types.ts (mirrors the backend contracts), mockSource, apiSource, derive.ts, index.ts (the switch)
  map/         view.ts (what's in view, badge counts), layout.ts (d3-force, fixed ticks, focus pinned; tries
               several starts and keeps the one with no crossing wires), usePanZoom.ts, FinlandMap, regions.ts
  pages/       ThreadPage, MapPage, TitleCard
  components/  TipCard, ChatPanel, BeatControls, Icons
  test/        vitest + Testing Library
```

When the backend's `contracts/` folder exists, re-check `src/data/types.ts` against it. If they differ, change the types and the adapter here, never the backend.
