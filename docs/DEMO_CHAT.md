# Demo chat copy: the agent reads, finds, relays, and does not ask twice

Teams-style copy for the video and for Abhishek's mock Teams page. Four scenes, about 90 seconds of screen time.

**What is verbatim and what is written.** Every line marked `AGENT` is the exact text the backend produces (`out/beat_3.json` `agent_text`, `out/notifications.json`, `out/questions.json`, and a replay on TRN-105 run on 7 Nov morning against the demo store). Lines marked `STATUS` are copy the frontend builds from a `ContextResult` (outcome + reason); the backend gives the fields, not the sentence. Technician and expert lines in scenes 2 to 4 are written for the demo and are synthetic. Scene 1 is Elisa's own example chat, unmodified.

Names: Veikko Vikkelä (field engineer, Oulu), Erkki Expert (network expert), Sami (field engineer, Helsinki; synthetic). Devices: TRN-042 (TX-200, 2019, OULU-07), TRN-087 (TX-200, 2018, OULU-11), TRN-105 (TX-200, 2019, HEL-02, south), TRN-101 (TX-300, 2023, HEL-02).

---

## Scene 1: the conversation that already happened (1 Nov, Elisa's chat)

The agent reads this. It posts nothing. No form, no tag, no "save this" button.

```
09:14  Veikko   Hi Erkki, I'm at the site now. Changed the SFP on transmission node TRN-042.
                Link is up and alarms cleared, but traffic is still not coming back. Have you seen this before?
09:16  Erkki    Yes. Is this one of the older units?
09:16  Veikko   Yes, installed around 2019 I think.
09:18  Erkki    Ok. Don't trust the green link status on those.
                Sometimes after changing the SFP the interface comes up normally, but the forwarding state doesn't recover correctly.
09:18  Veikko   So another SFP?
09:19  Erkki    No. Usually the SFP is fine.
                Check whether the traffic counters are actually increasing. If they stay at zero even though the interface is UP, it's probably the issue I've seen before.
09:21  Veikko   Yes. Link UP. RX power looks normal. Counters basically zero.
09:22  Erkki    That's it.
                Disable the interface, wait a little, then enable it again. Don't reboot the whole unit unless that fails.
09:25  Veikko   Did that. Traffic is back 👍
09:25  Erkki    Good. These old units sometimes behave like this after an optical module replacement.
09:26  Veikko   Is this documented somewhere?
09:27  Erkki    Not that I know of 😄
                We've just learned it over the years.
```

Overlay (from `out/beat_2.json`):

```
Captured CA-0001 · interface.bounce · avoid sfp.replace, node.reboot
Said by Erkki Expert (teams, email) · trust verified_by_outcome · 0 questions asked
Candidates: older units (install_year <= 2019, open edge) · TX-200 · firmware 4.1 · OULU-07 · north
```

Voiceover: "Nobody filled in anything. The layer read the thread and the follow-up email, kept Erkki's sentence word for word, and listed every scope it *might* apply to. It decided nothing."

---

## Scene 2: first reuse, one tap (7 Nov 10:00, Veikko on TRN-087)

Veikko's channel:

```
10:00  Veikko   Same thing on TRN-087 at OULU-11. SFP swapped, link up, alarms cleared, counters at zero.
10:00  STATUS   One captured tip may apply: Erkki, TRN-042, 1 Nov. Scope unclear (same model, installed 2018, different site). Checking with Erkki, one tap.
```

Erkki's original thread, the question lands in it (`out/questions.json`, verbatim):

```
10:00  AGENT    Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site.
                [ All older units ] [ All TX-200 units ] [ All on firmware 4.1 ] [ All of the north region ] [ Only OULU-07 ] [ No ]
10:01  Erkki    taps  All older units
```

Veikko's channel (`out/beat_3.json` `agent_text`, verbatim):

```
10:01  AGENT    [CA-0001] Disable the interface, wait a little, then enable it again. Avoid: sfp.replace, node.reboot. Source: Erkki Expert (teams, email), 1 case, verified_by_outcome.
10:04  Veikko   Counters moving. Thanks.
```

Erkki's thread (`out/notifications.json`, verbatim):

```
10:01  AGENT    Your tip from 2026-11-01 was proposed for TRN-087 today.
```

Overlay: `12 messages · 1 assertion · 0 forms · 1 tap`

Voiceover: "The first time the tip is needed somewhere else, the layer does not guess the scope. It asks Erkki once, in his own thread, one tap. His answer becomes the source."

---

## Scene 3: the second technician, no question (8 Nov 14:00, Sami on TRN-105, Helsinki)

This is the scene the whole thing is for. Sami has never spoken to Erkki. TRN-105 is a 2019 TX-200 in the south region. Replay result: `proposed, all hold: install_year <= 2019`, no question.

Sami's channel:

```
14:00  Sami     TRN-105 not passing traffic after an SFP change. Interface up, optics fine, alarms clear, counters zero. Thinking of swapping the SFP again.
14:00  AGENT    [CA-0001] Disable the interface, wait a little, then enable it again. Avoid: sfp.replace, node.reboot. Source: Erkki Expert (teams, email), 1 case, verified_by_outcome.
14:03  Sami     That did it. Who's Erkki?
```

Erkki's thread:

```
14:00  AGENT    Your tip from 2026-11-01 was proposed for TRN-105 today.
```

Overlay: `Erkki was not asked. Scope decided 7 Nov by Erkki: all older units. 0 taps.`

Voiceover: "A week later, a different engineer, a different region. The layer already knows the scope, because Erkki set it. Nobody is interrupted. Erkki just sees that his tip travelled."

---

## Scene 4: it also knows when to stay quiet (7 Nov, TRN-101, a 2023 unit)

```
10:30  Sami     TRN-101 at HEL-02, same symptoms after an SFP swap.
10:30  STATUS   Erkki's tip does not apply: install year 2023 is beyond the known edge 2019. Nothing proposed.
```

Erkki's thread (`out/questions.json`, verbatim, the edge question):

```
10:30  AGENT    Your TRN-042 tip: does it apply to TRN-101 too? Installed 2023, newer than any unit it has worked on.
                [ Yes ] [ No ]
10:31  Erkki    taps  No
```

Overlay: `No cutoff was invented. 2019 was only the newest unit it had worked on; Erkki set the boundary.`

Voiceover: "Veikko said 'around 2019'. That is not a rule, so the layer never treated it as one. On a 2023 unit it says so, asks once, and Erkki draws the line."

(Order note: in `demo.py` scene 4 runs before scene 3, as beat 4 then a replay. Either order works on screen; if scene 4 goes first, scene 3 runs after the edge is closed and the result is the same, `proposed`.)

---

## What the copy must not claim

- The agent never proposes anything in scene 1 or before the capture; with nothing captured it says "No captured context applies to this incident; nothing to add." (`out/beat_1.json`).
- The STATUS lines are frontend copy. If Abhishek prefers, show the raw `outcome` and `reason` fields instead; they say the same thing in fewer words.
- One honest side effect of "All older units": the decided scope is install year only, so a 2018 **TX-250** (TRN-063) also gets the tip. That is what Erkki chose, and it is visible in the graph. Do not hide it; if asked, it is the answer to "why ask the expert instead of guessing model".
- Erkki gets one notification line per proposal. For the video that is two lines. In production it would be batched; say so if asked.
