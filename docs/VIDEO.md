# The demo video

Two minutes, built with HyperFrames from real-time screen recordings of the two front-ends (the Teams clone in `ui/` with `?reveal=1`, the context tree in `frontend-ui/` with `/tree?play=1`), plus two short on-camera pieces. Nothing on screen is typed by hand: every agent sentence is a backend string from `out/`, and the tree is drawn from the stored assertions. The pages were recorded with a real screen recorder, not rendered frame by frame, because they animate on a real clock (`docs/DEMO.md`, "Recording the demo").

## Script

| Time | On screen | Voice |
|---|---|---|
| 0:00–0:07 | The problem (voice only) | The link is up. The alarms are clear. But traffic is still dead. Who knows the fix? |
| 0:07–0:17 | Abhishek on camera | Fixes like this live in one expert's head. When he's away, the team starts from zero. So we built a context layer that learns from the team's normal chats. |
| 0:17–0:19 | Chapter card: Capture | (Step one: capture.) |
| 0:19–0:31 | The Teams chat | Veikko's 2019 unit has a link, but no traffic. Erkki says: restart the port, don't reboot the unit. The layer saves that as a tip: when it applies, what to do, what to avoid. |
| 0:31–0:39 | The email joins the tip | Later, Erkki emails the same advice in other words. It isn't saved twice. The email becomes a second source for the same tip. |
| 0:39–0:41 | Chapter card: Bind | |
| 0:41–0:52 | Every possible fit | But which units does the tip cover? Nobody said. So instead of guessing, it keeps every possible fit: this model, this firmware, this site, this region, or every unit from 2019 or older. |
| 0:52–1:00 | Asking Erkki | Six days later, the same fault shows up at another site. It isn't sure the tip fits, so it asks Erkki one question. One tap: all older units. |
| 1:00–1:04 | Narrowed down | His answer settles it. The other guesses are dropped. |
| 1:04–1:06 | Chapter card: Recall | |
| 1:06–1:17 | Sami gets the fix | The next day, Sami in Helsinki hits the same fault. He's never met Erkki. The layer finds the tip, replies with the fix, and credits Erkki. Nobody gets interrupted. |
| 1:17–1:30 | Knowing its limits (Mikael, voice only) | It also knows its limits. A 2023 unit is newer than anything Erkki has seen, so it asks instead of guessing. A road closure stops applying on its end date. And a tip Erkki takes back goes to review. It isn't deleted. |
| 1:30–1:42 | Mikael on camera | It plugs into the chat tools you already use. The AI only reads the language. Our code decides where a tip applies and whether to trust it. Every answer shows its source, and it never touches the network. |
| 1:42–1:53 | The numbers | In the demo: fourteen conversations, four tips, eleven incidents, and every test passed. Forms the engineers had to fill in? Zero. (The "0 forms" screen holds in silence.) |
| 1:53–2:01 | End | Capture. Bind. Recall. |

## Where each claim comes from

| Said in the video | Shown by | Source |
|---|---|---|
| The tip is saved with when it applies, what to do, what to avoid | beat 2 | `out/assertions.json`, CA-0001: trigger, action `interface.bounce`, avoid `sfp.replace`, `node.reboot` |
| The email is a second source, not a second tip | beat 2 | CA-0001 `evidence.sources`: `teams:thread-001`, `email:email-001` |
| Every possible fit is kept | beat 2 | CA-0001 `applies_to.candidates`: five predicates (model, firmware, site, region, `install_year <= 2019` open) |
| One question, one tap, the other guesses dropped | beat 3 | `out/questions.json`; `decided` set, other candidates eliminated |
| Sami gets the fix with Erkki credited, no question | beat 7 | `out/beat_7.json` `agent_text`, `questions_new` empty, one notification |
| A 2023 unit asks instead of guessing | beat 4 | the edge question; after "No", declined on `install_year` |
| A road closure stops applying on its end date | beat 8 | `valid_to` 2026-11-20; the 21 Nov dispatch declined "expired" |
| A tip taken back goes to review, not deleted | beat 9 | CA-0001 status `review`, still in the store |
| The AI only reads the language; code decides scope and trust | README, "Design decisions" | the whole suite runs with `LLM_OFFLINE=1` |
| Never touches the network | `contracts/get_context.md` | advisory results only; no write path to the topology |
| Fourteen conversations | the Teams clone | the seven captured threads and emails (`out/thread_*.json`) plus the seven background chats (`ui/src/data/mock/filler/`) |
| Four tips | `out/assertions.json` | CA-0001 to CA-0004 |
| Eleven incidents | the nine beats | eleven `get_context` runs: beats 1, 5, 6, 7 and 9 one each, beats 3, 4 and 8 two each (before and after the answer, or the 15 and 21 Nov dispatches); seven distinct faults and dispatches appear in the Teams clone |
| Every test passed | `py -3.14 -m pytest -q` | 454 passed, 7 skipped (need live cloud access), 6 expected failures that document a known limit (concurrent writes to one JSON store, `docs/BREAK_TESTS.md` B15) |
| Zero forms | the whole demo | the only input is chat, email and one tap |

Numbers that are not said, on purpose: hours saved, incidents prevented, cost, accuracy, or anything about Elisa's real network.
