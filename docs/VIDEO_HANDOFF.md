# Demo video handoff: a real-time stage, not a slideshow

Repo `C:\dev\elisa\repo`, branch `main` (GitHub remote `origin`). Team Mikael Salomaa and Abhishek, Since AI 2026, Elisa "hidden knowledge" challenge. Deadline **Sunday 8 Nov 2026, 10:00 EET**. The backend and two front-ends work. The first demo film failed. This is the plan for the second one. Read all of it before you write any code.

## 1. The idea

Mikael's verdict on the first film, verbatim. This is the spec:

> "this sucks really bad, its really terrible. nothing is dynamic or animated. its just screenshots being zoomed into and static images."
>
> "it should read like a proper demo video, almost like an advertisement. Like the teams is a real window we are active inside, messages popping up in real time and the switches being smooth animated to the other sections. not just a still image zoomed in and a lot of text. there is no focus like where are you supposed to look, or anything going on. its a glorified powerpoint with a trash tts. and some random caption on the screen"
>
> "AGAIN NOT BESIDE, its too cluttered, we want focus each time on what is happening and not on just one big screen you're confused. how is the judge supposed to know what's happening?"

His idea, from earlier:

> "keeping them separate, but it bounces back and forth between the two, like the message occurs and this is shown after as the graph growing out, like a visual tree structure, not that side by side overly cluttered view. just teams and then to the graph and linking it visually. Keep it simple, like someone who doesn't know will understand."
>
> "it starts with veikko saying he has an issue, the AI doesn't know this hidden knowledge yet so it listens and when the expert gives it it notes it down and this is where the graph starts to grow (new branch or node etc) and these are classified by type and some other info. Then later also we have another incident, something that is already known, the AI then accesses pathways through and finds the fix and cites it and relays it to the technician. Also need to find some way to incorporate the design choices we made, like we don't know exactly which causes it so it goes in all categories, and is honed as more info comes. and the 'dedup' kind of method where it compares semantics or info that indicates the same thing."
>
> "the tree needs to be clear, maybe named branches by classification (hardware, software, misc. etc.) so it's understandable what this is."
>
> On a radial tree reference picture: "something like this I had in mind, but obviously far more fluid. like adding message animations as they pop in, and the retrieval process."

His storyboard notes (`C:\Users\mikbs\Downloads\ELISA sinceai.pptx`), verbatim: (1) "First starts with the problem, the technician is asking why this doesn't work even though all lights are fine?" (2) "Then contacts expert, maybe cut down the convo length for the demo video, we see the error and it's noted to context, the agent tells that it's saved to memory" (3) "Something like this, a new branch added that is ambiguous or exact depending on context given. We never assume it's only from text, it could be other factors unless stated by expert" (4) "Next time when a technician asks for a problem that we have documented, for this part don't have the reply yet from the agent. But it then begins retrieval" (5) "From the info already known, we visualise the accessing of the branch and leaf or the segment it belongs to. We cite our source and report back with the agent message back in the teams chat. And the case is settled, no experts involved." (6) "Now replied here with the correct info and case settled." (7) "Not exact timing. Highlight the way we handle uncertainty. 'Dedup' process. Other cases like timed knowledge expiring? Needs to fit into 2 min total and show how this one is better."

**In one paragraph:** make an advertisement-grade demo. One thing is on screen at a time, full screen. Teams is a live window where messages arrive in real time. A smooth animated transition turns the screen into the full-screen knowledge tree, where what was just said grows a branch, and another brings it back. Focus is always on the thing that just happened. A judge who knows nothing about the project can follow it.

## 2. Hard rules

1. **Never side by side.** Teams and the tree share the screen only during a transition of about 1.5 s, while one leaves and the other arrives.
2. **One focus per moment.** The newest message is centred and everything else is dimmed. In the tree, the camera leans toward the active sector.
3. **No caption bars and no paragraphs.** At most three or four large words on a cut. The voice tells the story.
4. **Everything from backend output.** Messages, cards, tree nodes and agent sentences come from these files: `out/beat_1..9.json`, `out/thread_*.json`, `out/questions.json`, `out/notifications.json` and `out/video_timeline.json`, or their byte copies in `ui/src/data/mock/` and `frontend-ui/public/out/`. The only fixed UI copy allowed is what `ui/src/model.ts` already has: the capture line "Saved as a tip. Nothing for you to do." and the STATUS template. The tree labels come from `frontend-ui/src/tree/words.ts`. Never write a new agent sentence.
5. **No invented numbers.** You may say: 12 messages, 0 forms, 1 tap (`out/beat_3.json` `data.counters`), 1 tip with 2 sources, 2 engineers on 2 sites, and 1 question that is never repeated. Never mention time saved, percentages or cost.
6. **The judges' rules.** (1) Start with the problem in one or two sentences: who has it and why it matters. (2) Show it working on a recorded screen, not slides. Go step by step through what the user does, what the AI does and the result. Move the cursor deliberately and cut out loading time. (3) Explain the value, claiming only what the prototype supports.
7. **About two minutes** (2:00 to 2:05).

## 3. What exists to build from

| Piece | What it does today | What it cannot do |
|---|---|---|
| **Teams clone**, `ui/` (Vite, React 18; see `ui/README.md` and `docs/process/TEAMS_CLONE_HANDOFF.md` sections 2–4) | A pixel-close copy of the Teams dark theme. `?beat=N` (1..9) shows the cumulative state after beat N, and `&channel=faults\|experts\|site-access\|field-chat\|general` picks the channel. Data is bundled from `ui/src/data/mock/` (byte copies of `out/`). Without `?beat` it runs in live mode | No message arrival, typing indicator, play mode, cursor or toast: all of a beat's messages appear at once. The beat-3 question renders already answered |
| **Tree**, `frontend-ui/` route `/tree` (`src/pages/TreePage.tsx`, `src/tree/words.ts`, `src/grow/usePlayback.ts`) | A radial filing system. The root is "What the team knows", the branches are Faults / Site access / Other, with sub-branches such as "Optical module swaps". Tips sprout with a fan of scope leaves. An incident sends a pulse down the pathway. Unused scopes fall away after the tap. Expiry and retraction grey a tip. The camera eases toward the active sector. Parameters: `?t=N` start event, `?play=1` autoplay (per-event times from `duration()` in `src/grow/timeline.ts`: message 700 ms, capture 2800 ms, incident 5200 ms), `?clean=1`, `?caption=0`, `?still=ms`, `?src=dispute\|hunch` | Cannot stop at an end event, change its rate, be driven from outside, or report where a node is on screen |
| **Event log** `out/video_timeline.json` (64 events, indices 0–63) | 11 Erkki's fix, 15 "Not that I know of", **16 capture** (5 candidate scopes), 17 Erkki's email, **18 the email merges as a second source**, **26 TRN-087 is ambiguous and a question goes out**, **27 the tap "All older units"**, **28 TRN-087 proposed**, **32 TRN-101 declined (too new)**, **44 Sami's TRN-105 proposed with no question**, 45 the notice, 56 the retraction message, **58 retraction**, 60 forest track proposed, **62 declined as expired**, **63 expire** | On the tree Erkki's tip is CA-0002; in Teams it is CA-0001, because the barrier email is ingested first in the timeline. The tree shows no IDs, so never put both IDs on screen |
| **Elisa's real chat** `data/elisa_examples/teams_chat.json` (+ `email.txt`) | The only real conversation: 12 messages between Veikko and Erkki. In the clone it is thread-001 in Experts, beat 2 | |
| **Agent lines** `docs/DEMO_CHAT.md` | Proposal: `[CA-0001] Disable the interface, wait a little, then enable it again. Avoid: sfp.replace, node.reboot. Source: Erkki Expert (teams, email), 1 case, verified_by_outcome.` Question: `Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site.`, with the options All older units / All TX-200 units / All on firmware 4.1 / All of the north region / Only OULU-07 / No. Notice: `Your tip from 2026-11-01 was proposed for TRN-105 today.` | |
| **Reference frames** `C:\dev\elisa\shots\` | `tree_small_16.png` (capture), `tree_28.png` (pathway lit, source tag), `merged__beat_3.png` (Teams Faults), `film_40s.png` (the failed look) | |

**Why the first film failed (do not repeat this).** It was built with a frame-seeking renderer (HyperFrames, `video/build.mjs`; leave it alone) over iframes of replay pages. The Teams replay pages are static states, so nothing ever arrived. The renderer loads every iframe up front, so the tree had finished animating before each scene began. Every scene became a still image with a camera zoom, plus a caption bar and a TTS voice sped up to 1.4x. Nobody watched it moving before delivery; every check was a still frame. The pages and the data are fine. The approach to motion was wrong.

## 4. The approach (decided)

**One real-time stage page, `/film` in `frontend-ui/`, recorded live by a screen recorder at 1920x1080 and 60 fps.** No frame-seeking renderer. The voice and the music are added afterwards with ffmpeg.

- The stage lives in `frontend-ui` because the tree and the router live there. The Teams clone is served from the same origin, under `/teams/`, through a Vite proxy. The stage can then call both pages directly (`iframe.contentWindow.__teams`, `__tree`) with no message protocol in between. It has three layers: a Teams iframe (`/teams/?beat=N&channel=X&play=1`), a tree iframe (`/tree?clean=1&caption=0&drive=1`), and on top a ghost layer for cards in flight and for cut words.
- The cue list is an async script that runs on a real clock (`await teams.reveal(...)`, `await tree.play(26, 26)`). Each scene lasts at least as long as its voice line. At the end, the stage downloads `film_log.json` with the scene start times, used to place the voice.

### 4.1 Teams play mode (`ui/`)

`?play=1&beat=N` renders the state of beat N-1. The items new in beat N are in the page but hidden. The mode exposes `window.__teams`; each call returns a promise that resolves when its animation ends. Item ids are the ones `buildChannels()` in `ui/src/model.ts` already makes (`teams:thread-001:8`, `beat7:TRN-105:proposal:0`).

| Call | Behaviour |
|---|---|
| `load(beat, channel)` | Switch beat or channel with no animation (only while the layer is hidden) |
| `reveal(id, {typing})` | Show "<Name> is typing…" with Teams' bouncing dots for `typing` ms. The item then slides in (translateY 16px→0, opacity 0→1, 280 ms, `cubic-bezier(0.1,0.9,0.2,1)`) and the list smooth-scrolls it to the vertical centre (500 ms) |
| `burst(ids, gap)` | Quick reveals with no typing. Shortens the chat while every message still appears |
| `capture(msgId)` | The capture line slides in under the message, with one pink pulse (600 ms) |
| `focus(id\|null)` | Everything else dims to 0.35 opacity (300 ms) |
| `cursorTo(target)`, `tap()` | A drawn 28 px cursor (the real mouse is hidden) glides along an eased curve (800 ms, `cubic-bezier(0.65,0,0.35,1)`), hovers 300 ms, then presses (scale 0.9, 120 ms, ripple). Tapping an option collapses the card to "Answered: <label>", using the existing render |
| `toast(noticeId)` | A Teams notification slides in at the bottom right (400 ms) and holds 2.5 s. The Activity badge goes up by 1 |
| `slot(id)` / `land(id)` / `rect(id)` | Reserve an item's space and return its rect / make the item visible / measure a post. All three serve the flights |

The beat-3 question stays unanswered until `tap()`. The rail, the header and the compose box are unchanged. Self-test URL: `?beat=2&channel=experts&play=1&demo=1` reveals every new item with default timing.

### 4.2 Tree range play (`frontend-ui/`)

Add `?to=B` and `?rate=R` to `usePlayback`. With `?drive=1`, expose `window.__tree` with four calls:

- `set(t)` jumps to event t with transitions off for one frame.
- `play(a, b, {rate})` plays from a to b and resolves when event b's animation is done.
- `rect(kind, id)` returns where a branch (such as `sfp_replaced`), a tip or a leaf is on screen.
- `overview()` runs the existing 2.6 s ease out to the whole wheel.

Keep the radial layout and the `words.ts` branch names. They are the backend vocabulary in plain words, and they already show "classified by type".

### 4.3 Transitions (`frontend-ui/src/film/`)

| Name | Choreography | Timing |
|---|---|---|
| **Lift** (Teams → tree) | A ghost card (initials and text, `#292929`, radius 8) appears over the active message and rises 12 px. Teams scales to 0.94 and fades out. The tree, already `set()` to the event before, fades in from scale 1.04. The ghost flies in an arc to the target branch and shrinks to a dot. When it lands, `tree.play()` sprouts the tip from that dot | Lift 250 ms; layers 600 ms `cubic-bezier(0.22,1,0.36,1)`; flight 900 ms `cubic-bezier(0.65,0,0.35,1)`; about 1.5 s in all |
| **Reply** (tree → Teams) | The lit tip's source tag grows into a Context layer card holding the verbatim `agent_text`. The tree fades out and Teams arrives from scale 0.96. The card flies into `teams.slot(id)`, then `land(id)` swaps it for the real post | About 1.5 s, same easings |
| **Plain** | Nothing travels (a new incident): one layer recedes, the other arrives | 600 ms |
| **Teams camera** | The stage scales the Teams iframe: 1.0 for one establishing second, then about 1.35 on the posts column, following the centred item. Rects from inside the iframe are mapped through this scale | Push-in 1.2 s; follow 500 ms |
| **Cut words** | 72 px white, centred, only where section 5 marks them | 250 ms fade, 1.2 s hold |

## 5. Storyboard

The film runs about 2:00. Each row has one focus. The voice script is about 233 words, about 90 s at a calm pace.

| # | Time | Screen | What moves (where the eye goes) | Voice | Data |
|---|---|---|---|---|---|
| 1 | 0:00–0:11 | Teams, Experts | Fade from black. The whole window shows for 1 s, then the camera pushes in. Veikko's 09:14 message arrives after typing dots. Then Erkki's "Is this one of the older units?" and Veikko's "installed around 2019". Messages 4–7 come in a quick, dimmed burst | "A field engineer swaps an optical module. The link is up, the alarms are clear, and traffic is still dead. So he asks Erkki." | beat 2, thread-001 msgs 1–7 (events 4–10) |
| 2 | 0:11–0:18 | Teams, Experts | Erkki's 09:22 fix arrives in focus, then "Traffic is back 👍". "Is this documented somewhere?" and "Not that I know of 😄 We've just learned it over the years." come in focus and hold | "Erkki knows the fix from years of experience. It's written down nowhere." | msgs 8–12 (events 11–15) |
| 3 | 0:18–0:24 | Teams, Experts | The view scrolls back to 09:22. The capture line slides in under it with a pink pulse | "The context layer was listening. It saves the fix in Erkki's own words. No form, no tagging." | `captured` on `teams:thread-001:8`, event 16 |
| T1 | 0:24–0:26 | Lift | The 09:22 text flies to the "Optical module swaps" branch | (none) | `tree.set(15)` |
| 4 | 0:26–0:37 | Tree | The tip "Bounce the port, don't reboot · Erkki" sprouts. Five leaves fan out one by one: older units ↗ open, TX-200, firmware 4.1, Oulu 07, the north. Cut words: **Every scope it might be** | "It files it as a fault fix after a module swap. Nobody said which units it covers, so it's filed under every scope it might be." | event 16 `candidates` |
| 5 | 0:37–0:44 | Tree | An email card (subject line of event 17) slides in from the right and merges into the same tip. A second source pip appears. Cut words: **Same meaning. One tip.** | "Erkki's email says the same thing in other words. Same meaning, one tip, two sources." | events 17–18 (`how: new_source`) |
| T2 | 0:44–0:45 | Plain | Over to Teams, Faults | | `load(3, 'faults')` |
| 6 | 0:45–0:50 | Teams, Faults | Veikko's TRN-087 report arrives. "Context layer is typing…" stays on, with no reply yet | "Six days later, same fault, another site." | beat 3, `reports/TRN-087.json` msg 1 |
| 7 | 0:50–0:56 | Tree | A pulse runs root → Faults → Optical module swaps → tip. The site leaf fails, the others hold | "The layer finds Erkki's tip, but this unit sits at a different site. Which scope applies is unclear," | event 26 |
| 8 | 0:56–1:03 | Teams, Experts | The question card slides in. The cursor glides to "All older units" and taps. The card collapses to "Answered: All older units" | "so it asks Erkki once. One tap: all older units." | `out/questions.json` [0], `beat_3.data.answer` |
| 9 | 1:03–1:08 | Tree | Four leaves fall away and "older units" stays. Cut words: **Honed by one answer** | "The other scopes fall away. The tip gets sharper." | event 27 |
| 9b *opt.* | +6 s | Tree, rate 2 | TRN-087 proposed, then TRN-101 declined: "built in 2023, newer than anything Erkki has seen" | "A 2023 unit is newer than anything Erkki has seen, so the tip is declined, and Erkki sets the edge." | events 28–32 |
| T3 | 1:08–1:09 | Plain | Over to Teams, Faults | | `load(7, 'faults')` |
| 10 | 1:09–1:14 | Teams, Faults | Sami's message arrives. "Context layer is typing…" | "Next day, Helsinki. Sami has never spoken to Erkki." | beat 7, thread-13 msg 1 (event 46) |
| 11 | 1:14–1:22 | Tree | The pulse runs the same path. "older units" lights up, the tip glows and the source tag "Erkki · Teams, 1 Nov" appears. No question | "The layer follows the same path. An older unit: it fits. No question this time." | event 44 |
| T4 | 1:22–1:24 | Reply | The source tag becomes the proposal card and flies under Sami's post | | `slot('beat7:TRN-105:proposal:0')` |
| 12 | 1:24–1:33 | Teams, Faults | The proposal is in focus (verbatim). Sami: "That did it, counters moving. Who's Erkki?" The notice toast slides in. Cut words: **No expert needed** | "It replies with Erkki's fix and cites him. Fixed. No expert pulled in. Erkki just sees his tip travelled." | `beat_7.data.agent_text`, events 47, 45 |
| 13 | 1:33–1:46 | Tree | `set(55)`, then `play(56,58)`: the tip greys, "Taken back". Then `set(61)` and `play(62,63)`: the forest-track tip greys, "Expired on its own". Cut words: **Stays true** | "It also knows when to stop. A tip its expert takes back goes under review. A road closure expires on the date the engineer gave." | events 56–58, 62–63 |
| 14 | 1:46–1:58 | Tree | `overview()`: the camera eases out to the whole wheel. Optional line: `12 messages · 1 tap · 0 forms` | "Twelve messages the team was writing anyway. One tap from the expert. No forms. Every answer carries its source and its scope, and nothing touches the network." | `beat_3.data.counters` |
| 15 | 1:58–2:02 | Black | The project name, then fade out | | |

If the film runs long, cut in this order: scene 9b (already out by default), then the email card in scene 5 (keep its voice over scene 4), then the expiry half of scene 13. Dispute and hunch (`?src=dispute|hunch`) are out by default: they load a different timeline, so the tree would change under the viewer.

## 6. Voice and music

- **Recommended: Mikael records the voice** from the voice column above, 14 lines (about 233 words, about 90 s). Speak calmly and save one file per line, `video/vo/v01.wav` to `v14.wav`, with Windows Sound Recorder or Audacity. Record the voice before step d, so the scenes can be timed to it.
- **Fallback: Kokoro at speed 1.0, never faster.** Set `$env:HYPERFRAMES_PYTHON = "C:\dev\elisa\video-test\.venv\Scripts\python.exe"`, then run `npx --yes hyperframes@0.9.19 tts "<line>" -o video\vo\v01.wav -v am_michael -s 1.0` (from `video/README.md`). If the film runs over 2:05, cut words, not speed.
- **Music: optional.** One royalty-free track (YouTube Audio Library or Pixabay Music), about 24 dB under the voice, fading out over the last 4 s. Credit it in the README.

## 7. Build plan

**No deliverable is done until a human has watched it move.** Still frames prove nothing about motion. If you cannot watch video, record a clip and hand it to Mikael. Frame strips (`ffmpeg -i clip.mp4 -vf fps=10 f_%03d.png`) help you check, but they do not replace watching.

Start two servers and leave them running. Also add `server.proxy: { "/teams": { target: "http://localhost:5174", ws: true } }` to `frontend-ui/vite.config.ts`.

```powershell
cd C:\dev\elisa\repo\ui;          npx vite --base /teams/ --port 5174 --strictPort
cd C:\dev\elisa\repo\frontend-ui; npx vite --port 5183 --strictPort
```

| Step | Files | Time | Gate |
|---|---|---|---|
| a. Teams play mode | `ui/src/play.ts` (new), `ui/src/App.tsx`, `ui/src/Thread.tsx`, `ui/src/app.css`; test `ui/src/play.test.ts` (hidden items stay out of the DOM until revealed) | 2.5 h | `http://localhost:5183/teams/?beat=2&channel=experts&play=1&demo=1`, watched in Chrome: messages arrive one at a time with typing dots. `npm test` passes and the replay without `play=1` is unchanged |
| b. Tree range play | `frontend-ui/src/grow/usePlayback.ts`, `frontend-ui/src/pages/TreePage.tsx`; one vitest (playback stops at `to`) | 1.5 h | `/tree?t=25&to=27&play=1&clean=1&caption=0` plays the question and the tap, then stops. Watched |
| c. Stage and two transitions | `frontend-ui/src/pages/FilmPage.tsx`, `src/film/cues.ts`, `src/film/ghost.ts`, `src/film/film.css`, route `film` in `src/router.ts` and `App.tsx` | 3 h | Scenes 1–4 (the first 37 s) at `http://localhost:5183/film?start=space`, recorded as in step e. **Mikael approves this clip before you go on** |
| d. Full cue list | `src/film/cues.ts`: scenes 5–15, each scene's minimum length is its voice clip plus 0.4 s; `film_log.json` downloaded at the end | 2 h | A full run with no stalls, watched end to end |
| e. Recording | (none) | 1 h | Commands below |
| f. Voice and music | `video/mix.mjs` (new): reads `film_log.json` and `video/vo/*.wav` and builds the ffmpeg command | 1 h | Each line lands on its scene within ±0.3 s |
| g. Final check | (none) | 0.5 h | Mikael watches `C:\dev\elisa\video\elisa_demo.mp4` full screen with sound. Nothing is side by side, nothing is static for more than 3 s, every agent line is verbatim, and the length is 2:00–2:05 |

**Recording.** Set the display to 1920x1080 at 100 % scale and turn off Windows notifications. Load the page once beforehand so fonts and data are cached.

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --force-device-scale-factor=1 --user-data-dir="$env:TEMP\elisa-film" "http://localhost:5183/film?start=space"
ffmpeg -y -f gdigrab -framerate 60 -draw_mouse 0 -i desktop -c:v libx264 -preset ultrafast -crf 14 -pix_fmt yuv420p C:\dev\elisa\video\film_raw.mp4
# press Space in Chrome (the stage stays black 2 s, then starts); press q in ffmpeg after the final black
ffmpeg -i C:\dev\elisa\video\film_raw.mp4 -vf blackdetect=d=0.5 -an -f null -     # find where it starts
ffmpeg -ss <start> -i C:\dev\elisa\video\film_raw.mp4 -t 125 -c:v libx264 -crf 18 -preset slow -r 60 C:\dev\elisa\video\film_trim.mp4
```

- If gdigrab drops frames, use OBS instead (Display Capture, 1920x1080, 60 fps).
- Playwright `recordVideo` is the last resort, because its frame rate is low.
- The mix has this shape:

```
ffmpeg -i film_trim.mp4 -i vo/v01.wav … -i music.mp3 -filter_complex "[1]adelay=<ms>:all=1[a1];…;[a1]…[a14]amix=inputs=14:normalize=0[vo];[15]volume=0.06,afade=t=out:st=118:d=4[m];[vo][m]amix=inputs=2:normalize=0[out]" -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 192k elisa_demo.mp4
```

Work on a branch `film` and merge it to `main` after step g. Never commit WAV or MP4 files.

## 8. Open decisions for Mikael

| Decision | Recommended default |
|---|---|
| Who records the voice | Mikael. Kokoro at 1.0x only if time runs out |
| Dispute and hunch clips | Cut. Add scene 9b (the TRN-101 decline) only if the film is under 1:55 |
| Music | One quiet royalty-free track; none is also fine |
| Counter at the end | Show `12 messages · 1 tap · 0 forms` once, in scene 14 |
| Cut words | Only the five marked in section 5. No chapter cards |
| Branch names | Keep the tree's Faults / Site access / Other (the backend vocabulary) rather than hardware / software / misc |
| Where dedup goes | Right after the capture (events 17–18), where it happens in the data. Showing it after the retrieval would need the tree to run backwards |
