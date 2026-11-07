# Video script: two minutes, Mikael's storyline

Every shot is a URL that replays a deterministic state. Teams clone: `http://localhost:8090/?beat=N` (static copy) or `ui/` dev server. Context map and title cards: `frontend-ui/` dev server, `?clean=1` hides controls. Growth animation: `/grow?t=<event>&clean=1` on the same server (branch `video`). Nothing on screen is typed by hand: every agent sentence is a backend string, and the tree is drawn from stored assertions (the footer on `/grow` says so).

Voiceover is about 290 words, which is two minutes at a calm pace. Captions are the bold lines. Chapter cards are Abhishek's `/title/<chapter>` pages.

| Time | Shot | Voiceover | On screen / caption |
|---|---|---|---|
| 0:00 | Screen, not a slide: the Teams clone Experts channel at `?beat=1&channel=experts`, Erkki's last two messages in view ("Is this documented somewhere?" / "Not that I know of. We've just learned it over the years.") | "Have you had this one? The link is up, everything looks fine, and traffic is still dead. The person who knows the fix is one expert, and it is written down nowhere. Every time he leaves, retires, or is on holiday, the network team starts from zero." | **Hidden knowledge. One expert. Nothing written down.** |
| 0:10 | Teams clone, Experts, `?beat=1&channel=experts`, scroll Veikko's 09:14 message into view | "Veikko is at a site. He swapped an optical module, the link is up, alarms are clear, and traffic is still dead." | Veikko's message, Elisa's real example |
| 0:18 | Teams clone, Faults, `?beat=1` | "The layer is listening. It knows nothing about this yet, so it says nothing." | Context layer: *No captured context applies to this incident; nothing to add.* (verbatim) |
| 0:24 | Teams clone, Experts, continue scroll to Erkki 09:22 and the capture line | "Erkki answers from experience: bounce the interface, don't reboot. He says it in chat, and again in an email. The layer notes it. One tip, two sources, his words kept verbatim." | **Saved as a tip. Nothing for you to do.** |
| 0:36 | `/grow?t=16&clean=1` (capture), then `t=18` (the email merging as a second source) | "Now the graph starts. The tip is classified: an incident, after an SFP swap, link up and counters at zero. And because nobody said exactly which units this applies to, it is filed under every scope it might be: this model, this firmware, this site, this region, and 'older units', with an open edge at 2019. Nothing is decided yet." | **Five candidate scopes. No guess.** |
| 0:52 | One-second chapter sting `/title/recall`, or skip it: the judges asked for screen, not slides | "Recall." | |
| 0:55 | Teams clone, Faults, `?beat=3` | "Six days later, same symptoms on a different site. The layer finds Erkki's tip, but the scope is unclear, so it asks him once, in his own thread." | STATUS card: ambiguous, the backend reason |
| 1:03 | Teams clone, Experts, `?beat=3&channel=experts`, the question card | "One tap: all older units. That answer becomes the source. The other scopes fall away." | *Your TRN-042 tip: does it apply to TRN-087 too?* → **Answered: All older units** |
| 1:10 | `/grow?t=26&clean=1` (question), `t=27` (the tap), `t=28` (proposed, pathway lit) | "On the graph, the pathway lights: trigger, tip, scope, and the four unused candidates are gone." | **Honed by one answer.** |
| 1:16 | Teams clone, Faults, `?beat=7` | "A day later, Sami in Helsinki, never spoke to Erkki. The layer walks the same path, cites Erkki, and relays the fix. Nobody is interrupted." | Context layer: *[CA-0001] Disable the interface, wait a little, then enable it again. Avoid: sfp.replace, node.reboot. Source: Erkki Expert (teams, email), 1 case, verified_by_outcome.* (verbatim) |
| 1:26 | Teams clone, Experts, the notice line | "Erkki just sees that his tip travelled." | *Your tip from 2026-11-01 was proposed for TRN-105 today.* |
| 1:30 | `/grow?t=18&clean=1`, the email merging into the same tip | "Erkki's email says the same thing in different words. It is not a new tip: it merges as a second source on the same one. Same trigger, same action, one key. The eval shows the same with another engineer's 'shut, no shut, came back'." | **Same meaning, one tip.** |
| 1:40 | One-second sting `/title/stay-true`, or skip | "Stay true." | |
| 1:42 | Teams clone, `?beat=4` TRN-101 decline, then `?beat=8&channel=site-access` expiry, then `?beat=9&channel=experts` retraction, quick cuts | "It also knows when to stop. A 2023 unit is beyond anything Erkki has seen, so it declines and asks him where the edge is. A road closure expires on the date the engineer gave. And when Erkki takes a tip back, it goes under review, not deleted." | *install year 2023 is beyond the known edge 2019* / *expired 2026-11-20* / *under review* (all verbatim reasons) |
| 1:50 | Teams clone `?beat=7`, then the counter overlay from `beat_3.data.counters` | "What it cost the team: twelve messages they were writing anyway, one tap from Erkki, no forms. What they got: two engineers on two sites fixed the fault from one conversation, and every suggestion carries its source, its scope, and the date it stopped being true. The model reads the language; the code decides scope and trust; nothing touches the network." | **12 messages · 1 assertion · 0 forms · 1 tap** |
| 2:00 | `/grow?t=63&clean=1`, the whole tree, then black | | **Capture. Bind. Recall.** |

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
- `/grow` indices: 16 capture, 18 email merge, 26 question, 27 tap, 28 proposed, 30 edge question, 31 tap No, 32 TRN-101 declined, 44 Sami proposed, 58 retraction, 60 forest track proposed, 62 declined expired, 63 last. `?play=1` autoplays; Space and arrow keys step.
- On `/grow` Erkki's tip is CA-0002 (the 2 Oct barrier email is ingested first, so it took CA-0001); in the Teams clone and the map it is CA-0001. Avoid cutting between the two with the ID in frame, or say so.
- Voiceover can be Windows SAPI or edge-tts; no paid voice. Measure each clip's audio length first and set scene lengths from it.
- Do not add any agent line that is not in `out/`. If a shot needs a sentence the backend does not produce, say it in the voiceover instead.

## The judges' three rules, and how the script meets them

1. **Start with the problem.** The first ten seconds are Erkki's own words from Elisa's example ("Not that I know of. We've just learned it over the years.") and two sentences: one expert, nothing written down, the team starts from zero when he is away.
2. **Show it working, screen not slides.** Every shot is a recorded page: the Teams clone, the growth page, the map. Chapter cards are one-second stings at most, or cut. Each shot says what the user did (wrote in chat, tapped once), what the AI did (captured, asked, relayed, declined), and the result (the fix on another site, no interruption).
3. **Explain the value with evidence only.** Numbers the demo supports and may be said: 12 messages read, 1 tip stored, 0 forms, 1 tap, 2 sources, 2 engineers helped on 2 sites, 1 question asked and never repeated, 3 declines with a stated reason. Claims that are supported without numbers: less manual documentation, the expert is interrupted once instead of every time, every suggestion is sourced and scoped, stale facts expire by themselves, the system never acts on the network. Never say: hours saved, incidents prevented, cost reduced, accuracy percentages, or anything about Elisa's real network.
