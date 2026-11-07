# The demo video

Two minutes and three seconds, 1920x1080, made in the HyperFrames Desktop app (HyperFrames 0.9.19). The project that renders it is in `video/`. The Teams scenes and the context tree are not screen recordings: they are animated HTML rebuilt from the repo's own front-ends (`ui/`, its reveal timings in `ui/src/reveal.ts`; `frontend-ui/src/tree/`, its layout, words and motion), with every chat line, agent sentence, scope label and reason copied from `out/` and Elisa's example data. All voice is recorded by Mikael and Abhishek; no text-to-speech.

## Script

| Time | On screen | Voice |
|---|---|---|
| 0:00–0:07 | The problem (voice only) | The link is up. The alarms are clear. But traffic is still dead. Who knows the fix? |
| 0:07–0:17 | Abhishek on camera | Fixes like this live in one expert's head. When he's away, the team starts from zero. So we built a context layer that learns from the team's normal chats. |
| 0:17–0:19 | Chapter card: Capture | |
| 0:19–0:31 | The Teams chat | Veikko's 2019 unit has a link, but no traffic. Erkki says: restart the port, don't reboot the unit. The layer saves that as a tip: when it applies, what to do, what to avoid. |
| 0:31–0:39 | The email joins the tip | Later, Erkki emails the same advice in other words. It isn't saved twice. The email becomes a second source for the same tip. |
| 0:39–0:41 | Chapter card: Bind | |
| 0:41–0:52 | Every possible fit | But which units does the tip cover? Nobody said. So instead of guessing, it keeps every possible fit: this model, this firmware, this site, this region, or every unit from 2019 or older. |
| 0:52–1:00 | Asking Erkki | Six days later, the same fault shows up at another site. It isn't sure the tip fits, so it asks Erkki one question. One tap: all older units. |
| 1:00–1:04 | Narrowed down | His answer settles it. The other guesses are dropped. |
| 1:04–1:06 | Chapter card: Recall | |
| 1:06–1:17 | Sami gets the fix | The next day, Sami in Helsinki hits the same fault. He's never met Erkki. The layer finds the tip, replies with the fix, and credits Erkki. Nobody gets interrupted. |
| 1:17–1:30 | Knowing its limits (voice only) | It also knows its limits. A 2023 unit is newer than anything Erkki has seen, so it asks instead of guessing. A road closure stops applying on its end date. And a tip Erkki takes back goes to review. It isn't deleted. |
| 1:30–1:42 | Mikael on camera | It plugs into the chat tools you already use. The AI only reads the language. Our code decides where a tip applies and whether to trust it. Every answer shows its source, and it never touches the network. |
| 1:42–1:53 | The numbers | In the demo: fourteen conversations, four tips, eleven incidents, and every test passed. Forms the engineers had to fill in? Zero. (The "0 forms" screen holds in silence.) |
| 1:53–2:03 | End | Capture. Bind. Recall. |

## What each scene draws on

| Time | Scene | Repo data |
|---|---|---|
| 0:00 | Hook, Experts thread | `out/thread_thread-001.json`: "Is this documented somewhere?" and the reply |
| 0:19 | Capture, Experts thread | thread-001, the fix from `out/assertions.json` and `out/beat_2.json` |
| 0:31 | Merge | the email subject from `out/thread_email-001.json`; the tree from `frontend-ui/src/tree` |
| 0:41 | Possible fits | the five candidate scopes in `out/beat_2.json`; labels from `frontend-ui/src/tree/words.ts` |
| 0:52 | Ask, Faults then Experts | the TRN-087 report (`ui/src/data/mock/reports/TRN-087.json`); reason, question and options from `out/beat_3.json` and `out/questions.json` |
| 1:02 | Narrowed down | the tree's fall animation |
| 1:09 | Recall, Faults | Sami's message and the Context layer reply from `out/beat_7.json`; the notice from `out/beat_5.json` and `beat_7.json` |
| 1:19 | Knows its limits | the TRN-101 reason from `out/beat_4.json`; the road closure from scenario `14_road_closed`; the retraction from `out/beat_9.json` |

Titles, chapter subtitles, labels such as "TRN-101 · installed 2023" and the numbers-screen captions were written for the film. Every chat line and every agent sentence is from the data.

## The numbers screen, checked against the repo

| On screen | Caption | Checked |
|---|---|---|
| 14 conversations read | 7 ordinary chats correctly ignored | the 7 captured threads and emails (`out/thread_*.json`) plus the 7 background chats (`ui/src/data/mock/filler/`), which the layer reads and captures nothing from |
| 23 messages | 12 from Elisa's real chat | message counts of the 7 `out/thread_*.json`; thread-001 is Elisa's chat, 12 messages |
| 4 tips stored | from 6 sources | `out/assertions.json`: CA-0001 to CA-0004, six `evidence.sources` |
| 11 incidents and dispatches | across nine beats | eleven `get_context` runs: beats 1, 5, 6, 7 and 9 once each; beats 3, 4 and 8 twice (before and after the answer, or the 15 and 21 Nov dispatches) |
| 2 engineers helped | 3 devices, 2 sites | Veikko (TRN-087) and Sami (TRN-105); TRN-087, TRN-101, TRN-105; OULU-03 and OULU-11 |
| 2 questions to an expert | never repeated | `out/questions.json` |
| 2 taps by Erkki | the only input asked | `out/beat_3.json`, `out/beat_4.json` |
| 5 declines | each with a stated reason | distinct reasons in `out/beat_*.json`: beyond the install-year edge, superseded, wrong site, expired, under review |
| 17 test scenarios | all passing | `py -3.14 -m eval.runner`: 17/17, `docs/CASE_TABLE.md` |
| 49 break tests | run against it | `docs/BREAK_TESTS.md`: 19 extractor cases plus 30 rule cases |

"Every test passed" in the voice: 454 passed, 7 skipped (need live cloud access), 6 expected failures that document a known limit (concurrent writes to one JSON store, `docs/BREAK_TESTS.md` B15).

Numbers that are not said, on purpose: hours saved, incidents prevented, cost, accuracy, or anything about Elisa's real network.
