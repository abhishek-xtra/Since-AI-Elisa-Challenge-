# Demo video (HyperFrames)

The two-minute demo film, built from `docs/VIDEO_SCRIPT.md`. Every shot is a live page in an
iframe (the Teams clone, the radial tree view, the context map) with a slow camera move, a caption
bar and one Kokoro voice line. `build.mjs` holds the scene list and writes `index.html`; do not edit
`index.html` by hand.

## Regenerate

1. Start the sources and leave them running during the render:
   - Teams clone on `http://127.0.0.1:8090/` (static build of `ui/`, `?beat=N&channel=...`).
   - `frontend-ui/` dev server on `http://localhost:5183/` (map `?beat=N&clean=1`, `/tree?t=N&clean=1`, `/title/<chapter>`).
2. Point HyperFrames at a Python with Kokoro, in every shell (needed only when a voice line is new or changed):
   ```powershell
   $env:HYPERFRAMES_PYTHON = "C:\dev\elisa\video-test\.venv\Scripts\python.exe"
   ```
3. Build, check, render (from `video/`):
   ```powershell
   node build.mjs                                   # TTS for new lines only, writes index.html, prints the timeline
   npx --yes hyperframes@0.9.19 check
   npx --yes hyperframes@0.9.19 render -o C:\dev\elisa\video\elisa_demo_v1.mp4
   ```
   WAVs are cached in `assets/vo/<hash>.wav` (hash of voice, speed and text), so a rebuild only
   re-speaks changed lines. WAVs, MP4s and `.hyperframes/` are git-ignored. Rendering takes about
   4.5 s per second of video (iframes are captured as screenshots).

Voice: Kokoro `am_michael` at speed 1.4. At 1.0 the script's voiceover runs about 158 s; 1.4 lands
the film near two minutes. Scene length is the line plus 0.6 s (0.2 s lead, 0.4 s tail); scenes
overlap by 0.4 s for the fade or wipe into the next. `min` holds a scene longer when its caption
needs more reading time than its line.

`check` reports two runtime `404 loading beats/10`: the Teams clone probes for a tenth beat to find
the last one. That is the page inside the iframe, not the composition. The lint warnings ask for
sub-compositions per scene (an editing convenience in the desktop app); the film is one generated file on purpose.

## Changing a scene

Edit its entry in `SCENES` in `build.mjs` (`url`, `cam` points `[x, y, scale]` on the 1920-wide
page, `caption`, `vo`, `enter`: fade, wipe or cut), then `node build.mjs`. `url: null` makes a
placeholder (dark frame with the caption only). Tree scenes go through `TREE`, which adds
`clean=1&caption=0` so our caption bar is the only caption. Tree scenes use the static state at an event, not `&play=1`: the render loads all iframes up front, so a playing animation has already finished when its scene comes up (seen in the first render: `t=16&play=1` showed the final wheel). On the tree Erkki's tip is CA-0002, in
the Teams clone CA-0001: do not cut between the two with an ID in frame.

## Scenes (124.3 s)

| # | Scene | Start | Length | Source | Caption | Voice line |
|---|---|---|---|---|---|---|
| 1 | hook | 0.0 | 11.8 | Teams `?beat=2&channel=experts` (2600 px tall, Erkki 09:26/09:27) | Hidden knowledge. One expert. Nothing written down. | Have you had this one? ... the network team starts from zero. |
| 2 | veikko | 11.8 | 5.7 | Teams `?beat=2&channel=experts` (Veikko 09:14) | Elisa's real example | Veikko is at a site. ... traffic is still dead. |
| 3 | silent | 17.5 | 3.7 | Teams `?beat=1` | No captured context applies to this incident; nothing to add. | The layer is listening. It knows nothing about this yet, so it says nothing. |
| 4 | capture | 21.2 | 8.7 | Teams `?beat=2&channel=experts` (09:22, capture line, email) | Saved as a tip. Nothing for you to do. | Erkki answers from experience: ... his words kept verbatim. |
| 5 | scopes | 29.9 | 15.6 | `/tree?t=16` | Five candidate scopes. No guess. | The tip is classified: ... Nothing is decided yet. |
| 6 | status | 45.5 | 7.3 | Teams `?beat=3` (STATUS card) | | Six days later, ... in his own thread. |
| 7 | question | 52.8 | 4.5 | Teams `?beat=3&channel=experts` (question card) | Answered: All older units | One tap: all older units. ... The other scopes fall away. |
| 8 | honed | 57.3 | 4.8 | `/tree?t=28` | Honed by one answer. | On the graph, the pathway lights: ... are gone. |
| 9 | sami | 62.1 | 7.2 | Teams `?beat=7` | [CA-0001] Disable the interface, ... verified_by_outcome. | A day later, Sami in Helsinki, ... Nobody is interrupted. |
| 10 | notice | 69.3 | 3.4 | Teams `?beat=7&channel=experts` | Your tip from 2026-11-01 was proposed for TRN-105 today. | Erkki just sees that his tip travelled. |
| 11 | merge | 72.7 | 7.9 | `/tree?t=18` | Same meaning, one tip. | Erkki's email says the same thing in different words. ... one key. |
| 12 | decline | 80.6 | 7.2 | Teams `?beat=4` | install year 2023 is beyond the known edge 2019 | It also knows when to stop. ... where the edge is. |
| 13 | dispute | 87.7 | 4.2 | `/tree?src=dispute&t=32` | Two experts disagree: kept both, not guessed | Two experts disagree. It keeps both, marks the dispute, and does not pick a winner. |
| 14 | hunch | 91.9 | 5.5 | `/tree?src=hunch&t=28` | Heard second-hand: kept, never relayed | Someone heard the key might have moved. ... what is verified. |
| 15 | expiry | 97.4 | 2.9 | Teams `?beat=8&channel=site-access` | expired 2026-11-20 | A road closure expires on the date the engineer gave. |
| 16 | retract | 100.3 | 3.4 | Teams `?beat=9&channel=experts` | under review | And when Erkki takes a tip back, it goes under review, not deleted. |
| 17 | value | 103.7 | 12.5 | Teams `?beat=7` (zooms out to both engineers) | 12 messages · 1 assertion · 0 forms · 1 tap | What it cost the team: ... the date it stopped being true. |
| 18 | model | 116.2 | 4.6 | Map `?beat=7&clean=1` | 12 messages · 1 assertion · 0 forms · 1 tap | The model reads the language; the code decides scope and trust; nothing touches the network. |
| 19 | end | 120.8 | 2.5 + 1.0 to black | `/tree?t=63` | Capture. Bind. Recall. | (none) |

The full voice text is in `build.mjs`. It is the script's voiceover word for word, split where the
script cuts between shots, with three trims to hold two minutes: the chapter stings ("Recall.",
"Stay true.") are skipped, as the script allows; "Now the graph starts." is dropped from the 0:36
line; and the eval sentence ("The eval shows the same with another engineer's 'shut, no shut, came
back'.") is dropped from the 1:30 line. The dispute and hunch lines are the script's additions for
the tree view, placed before the expiry and retraction.
