# Video script: two minutes, Mikael's storyline

Every shot is a URL that replays a deterministic state. Teams clone: `http://localhost:8090/?beat=N` (static copy) or `ui/` dev server. Context map and title cards: `frontend-ui/` dev server, `?clean=1` hides controls. Growth animation: `/grow?t=<event>&clean=1` on the same server (branch `video`). Nothing on screen is typed by hand: every agent sentence is a backend string, and the tree is drawn from stored assertions (the footer on `/grow` says so).

Voiceover is about 290 words, which is two minutes at a calm pace. Captions are the bold lines. Chapter cards are Abhishek's `/title/<chapter>` pages.

| Time | Shot | Voiceover | On screen / caption |
|---|---|---|---|
| 0:00 | Title card `/title/capture` style, black, the one line | "Every network team has knowledge that lives in people, not documents. Here is how an AI layer learns it without anyone writing anything down." | **Hidden knowledge. Zero forms.** |
| 0:10 | Teams clone, Experts, `?beat=1&channel=experts`, scroll Veikko's 09:14 message into view | "Veikko is at a site. He swapped an optical module, the link is up, alarms are clear, and traffic is still dead." | Veikko's message, Elisa's real example |
| 0:18 | Teams clone, Faults, `?beat=1` | "The layer is listening. It knows nothing about this yet, so it says nothing." | Context layer: *No captured context applies to this incident; nothing to add.* (verbatim) |
| 0:24 | Teams clone, Experts, continue scroll to Erkki 09:22 and the capture line | "Erkki answers from experience: bounce the interface, don't reboot. He says it in chat, and again in an email. The layer notes it. One tip, two sources, his words kept verbatim." | **Saved as a tip. Nothing for you to do.** |
| 0:36 | `/grow?t=<capture of CA-0001>` the branch sprouting | "Now the graph starts. The tip is classified: an incident, after an SFP swap, link up and counters at zero. And because nobody said exactly which units this applies to, it is filed under every scope it might be: this model, this firmware, this site, this region, and 'older units', with an open edge at 2019. Nothing is decided yet." | **Five candidate scopes. No guess.** |
| 0:52 | Card `/title/recall` with counter | "Recall." | **0 forms · 1 tap** |
| 0:55 | Teams clone, Faults, `?beat=3` | "Six days later, same symptoms on a different site. The layer finds Erkki's tip, but the scope is unclear, so it asks him once, in his own thread." | STATUS card: ambiguous, the backend reason |
| 1:03 | Teams clone, Experts, `?beat=3&channel=experts`, the question card | "One tap: all older units. That answer becomes the source. The other scopes fall away." | *Your TRN-042 tip: does it apply to TRN-087 too?* → **Answered: All older units** |
| 1:10 | `/grow?t=<incident TRN-087 after answer>` pathway lighting up | "On the graph, the pathway lights: trigger, tip, scope, and the four unused candidates are gone." | **Honed by one answer.** |
| 1:16 | Teams clone, Faults, `?beat=7` | "A day later, Sami in Helsinki, never spoke to Erkki. The layer walks the same path, cites Erkki, and relays the fix. Nobody is interrupted." | Context layer: *[CA-0001] Disable the interface, wait a little, then enable it again. Avoid: sfp.replace, node.reboot. Source: Erkki Expert (teams, email), 1 case, verified_by_outcome.* (verbatim) |
| 1:26 | Teams clone, Experts, the notice line | "Erkki just sees that his tip travelled." | *Your tip from 2026-11-01 was proposed for TRN-105 today.* |
| 1:30 | `/grow` at a later event: the reworded fix from another thread merging as a second case dot | "When someone else describes the same fix in different words, 'shut, no shut, came back', it is not a new tip. It merges as a second case on the same one. Same trigger, same action, one key." | **Same meaning, one tip.** |
| 1:40 | Card `/title/stay-true` | "Stay true." | |
| 1:42 | Teams clone, `?beat=4` TRN-101 decline, then `?beat=8&channel=site-access` expiry, then `?beat=9&channel=experts` retraction, quick cuts | "It also knows when to stop. A 2023 unit is beyond anything Erkki has seen, so it declines and asks him where the edge is. A road closure expires on the date the engineer gave. And when Erkki takes a tip back, it goes under review, not deleted." | *install year 2023 is beyond the known edge 2019* / *expired 2026-11-20* / *under review* (all verbatim reasons) |
| 1:54 | `/grow` final frame, whole tree, then black | "The model reads the language. The code decides the scope, the trust, and whether to ask. No confidence scores, no invented rules, nothing touches the network." | **Capture. Bind. Recall.** |

## Where each design choice is shown

| Choice | Shot | Evidence on screen |
|---|---|---|
| Unknown cause goes in every category, honed later | 0:36 and 1:10 | five candidate leaves at capture, one left after the tap |
| Open edge, no invented cutoff | 0:36 and 1:42 | "open edge at 2019"; decline reason names the edge |
| Dedup by meaning, not wording | 0:24 and 1:30 | chat + email = one tip, two sources; the reworded fix = a second case (scenario 07 in the growth log) |
| One question, never twice | 1:03 and 1:16 | the question card once; Sami gets no question |
| Silence with no context | 0:18 | the verbatim "nothing to add" line |
| Expert's time | 1:03, 1:26 | one tap; one notice line; "0 forms · 1 tap" |
| Stale by itself, retraction, decline | 1:42 | the three verbatim reasons |
| Model reads, code decides | 1:54 | said once, plainly |

## Recording notes

- Record each URL at 1920x1080 with controls hidden; the Teams clone has no controls, the map and `/grow` take `clean=1`.
- The `/grow` event indices (`t=`) come from `out/video_timeline.json` once the `video` branch lands; replace the placeholders in the table.
- Voiceover can be Windows SAPI or edge-tts; no paid voice. Measure each clip's audio length first and set scene lengths from it.
- Do not add any agent line that is not in `out/`. If a shot needs a sentence the backend does not produce, say it in the voiceover instead.
