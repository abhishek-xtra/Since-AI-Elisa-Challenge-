# The demo: nine beats, live mode, recording

Everything the judges see comes from `demo.py` output in `out/`. `py -3.14 demo.py` prints the beats below and writes `out/beat_N.json`, `out/graph.json`, `out/graph.html`, `out/assertions.json`, `out/thread_<id>.json`, `out/questions.json`, `out/notifications.json`. `--beat N` runs one beat on the state the previous beats left; `--clean` wipes `out/`. Teams-style copy for the screen: `docs/DEMO_CHAT.md`.

## The nine beats

1. **No context.** Empty store: `get_context` on TRN-087 returns `[]`; the stand-in agent says no captured context applies and adds nothing, and the beat data carries `prior_knowledge: "none"`, an explicit signal that the agent is falling back to standard procedure. It never invents a procedure; the real agent's own runbook is out of scope.
2. **Capture and link.** Erkki's chat and email become one assertion CA-0001 (`interface.bounce`, avoid `sfp.replace`, `node.reboot`) with five candidates and their support/against/edge, trust `verified_by_outcome`, 0 questions asked.
3. **First use and the one question.** TRN-087 is `ambiguous` on site; Erkki is asked once and taps "All older units"; the re-run is `proposed` and the agent says to disable and enable the interface, avoid `node.reboot`, citing Erkki, 1 case. 12 messages · 1 assertion · 0 forms · 1 tap.
4. **Decline.** TRN-101 (installed 2023) is `ambiguous`: 2023 is beyond the known edge 2019, so Erkki gets one edge question; he taps "No", the boundary becomes `install_year <= 2019`, closed, and the re-run is `declined` on install_year. No cutoff was invented: Erkki set it.
5. **Barrier.** The 2 Oct barrier email is ingested; a dispatch to OULU-03 proposes the key location (at the neighbouring farm, ask for Mäkelä) before the drive; Erkki's notification from beat 3 is shown.
6. **Update.** Veikko's 7 Nov Teams message supersedes the old fact: the farm assertion gets `valid_to` 2026-11-07 and `superseded_by` CA-0003; the next dispatch proposes the site cabinet and declines the farm as superseded; no question.
7. **Second technician, no question.** Sami (Helsinki, synthetic thread `data/scenarios/13_second_technician/`) hits the same fault on TRN-105, a 2019 TX-200 in the south region, a day after Erkki's tap. `get_context` proposes CA-0001 (all hold: `install_year <= 2019`), no question, the proposal is relayed with Erkki as the source, and Erkki gets one notification line. His thread is shown, not ingested. Script for the screen: `docs/DEMO_CHAT.md`.
8. **Stale by itself.** Kalle's 9 Nov Teams message (hand-written, `data/scenarios/14_road_closed/`): the access road to OULU-11 is closed for roadworks until 20 Nov, use the forest track from the north side. The binder turns "until 20 Nov" into `valid_to` 2026-11-20 23:59 (code, not the model). A dispatch to OULU-11 on 15 Nov proposes the forest track; the same dispatch on 21 Nov is `declined`, "expired 2026-11-20". Nobody retracted it; it expired on the date the engineer gave.
9. **Retracted.** Erkki writes in the experts channel (`data/scenarios/15_retraction/`): "ignore what I said about the bounce on the older units, that was a different issue, don't rely on it". The extractor marks it a retraction (`retracts: true`); CA-0001, his own assertion with the same key, goes to status `review` and gains the thread as a source; nothing is deleted or superseded. TRN-087 is then `declined`, "under review".

## Running the front-ends against the API

Full sequence from a clean clone (PowerShell):

```powershell
py -3.14 -m pip install -r requirements.txt
$env:LLM_OFFLINE="1"; py -3.14 -m pytest -q; py -3.14 -m eval.runner
$env:LLM_OFFLINE="1"; py -3.14 demo.py                       # writes out/
$env:LLM_OFFLINE="1"; py -3.14 -m uvicorn api.app:app        # API on :8000 (leave running)
# second window, either front-end, against the API:
$env:VITE_DATA_SOURCE="api"; $env:VITE_API_URL="http://localhost:8000"; npm run dev
```

Without the two `VITE_` variables each front-end runs on its own byte-for-byte copy of `out/` (see `ui/src/data/mock/README.md` and `frontend-ui/src/data/mock/real-out/README.md`), which looks identical. Live mode (reporting a new fault, answering a question) needs the API.

## Recording the demo

Both front-ends have hidden controls for screen recording; nothing on screen shows them.

| Page | URL | Controls |
|---|---|---|
| Teams clone, messages arriving one by one | `http://localhost:5173/?beat=3&reveal=1` (any beat, add `&channel=experts\|faults\|site-access`) | Space or Right arrow reveals the next item (typing row, slide-in, the agent's card expanding, a cursor tapping the answer, the notice dropping in); Left hides the last; clicking the invisible 40 px strip at the right edge of the posts also advances. `&reveal=auto&every=1400` plays hands-free. Timings in `ui/src/reveal.ts`. |
| Context tree, growing in real time | `http://localhost:5183/tree?from=14&to=28&play=1&clean=1` (`&gap=` ms between events; `?t=N` alone is a still) | Space or Right steps forward, Left back, the right-edge strip advances. The camera moves once per event (420 ms) and holds; a new tip holds at least 2.5 s. `?src=dispute\|hunch\|all` loads the other timelines. Timings in `frontend-ui/src/tree/motion.ts`. |

Record with a real screen recorder at 1920x1080 (for example `ffmpeg -f gdigrab -framerate 30 -i desktop -t 20 out.mp4`), never with a frame-seeking renderer: the pages animate on a real clock. The video script is `docs/VIDEO.md`; the video itself was made in HyperFrames from rebuilt scenes, not from recordings.

## Live mode for a judge

Clicking "Report fault" or a question button. Live calls rewrite the files under `out/`, which are committed and are what the replay reads, so serve a copy instead. Also, after beat 9 Erkki's tip is under review, so an old unit is declined "under review"; for a live proposal serve the state after beat 7:

```powershell
$env:LLM_OFFLINE="1"; $env:OUT_DIR="C:\dev\elisa\out-live"
1..7 | ForEach-Object { py -3.14 demo.py --beat $_ }          # beats 1-7 into out-live (beat 1 wipes it)
py -3.14 -m uvicorn api.app:app --port 8001                   # a second API on :8001 serving out-live
# ui/: $env:VITE_DATA_SOURCE="api"; $env:VITE_API_URL="http://localhost:8001"; npm run dev
```

The form has a time field: validity, expiry and supersession are evaluated at that time, so a dispatch to OULU-11 dated 15 Nov proposes the forest track and one dated 21 Nov is declined "expired". Unseen incidents get the proposal text built in code (`LLM_OFFLINE=1`), identical wording to the model's. To reset the live state, run the seven beats again.

