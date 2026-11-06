# Abhishek's Handoff

> **For any AI agent reading this (e.g. Mikael's Claude):** this is Abhishek's side of the shared context for our Since AI 2026 entry. It is **aligned with `MIKAEL_HANDOFF.md` v5**. Both files describe the same plan in the same vocabulary.
>
> - **`MIKAEL_HANDOFF.md`** is the source of truth for the pipeline, data model, contracts and build gates.
> - **This file** holds Abhishek's notes from Elisa's talk, the plan in plain language, and everything in Abhishek's lane: data, surfaces, video and submission.
> - **`REVIEW_ABHISHEK.md`** and **`REVIEW_MIKAEL.md`** record how we got here.
>
> If this file and Mikael's ever disagree on the pipeline, Mikael's wins. Flag the difference to the humans.

Last updated: Saturday 7 November 2026, ~00:10 (Helsinki). Version 3, aligned to Mikael v5 including section 17 (the briefing recording) and his latest commits.

---

## 1. Team and logistics

**Team:** Abhishek Singh and Mikael.
- **Mikael** owns the pipeline, which Claude agents build and Mikael verifies.
- **Abhishek** owns data, surfaces, the video and the submission. He is a digital systems and design student at Aalto, comfortable following technical instructions but not an experienced coder, and prefers short, milestone-based tasks with visible wins. Design taste: clean, minimal, dark, brand purple `#534AB7`, a bit of tasteful whimsy. Works on a Mac.

**Event:** Since AI Hackathon 2026, 6–8 November, Turku. **Challenge partner:** Elisa Oyj.

**Submission** (organiser's builder guide, via Mikael v5 §2b):
- One entry per team in **sinceai.app**, due **Sunday 8 November 10:00 EET**. Devpost does not count.
- **Every member must personally accept Elisa's IP terms in the app**, or the entry does not go through. Abhishek and Mikael: do this Saturday.
- **Required fields:** project name, submission URL, "About the project" (up to 5,000 characters), repo or demo link, "Built with", technology feedback, GenAI tools used, and how generative AI is used. Collect these while building.
- **Optional:** demo video (about **two minutes**, "strongly recommended"), deck (PDF/PPTX), and Markdown supporting docs (handoffs and data card can go in). No ZIPs.
- **Before submitting:** check every link while logged out. **The repo is private**, so make it public or share it with the organisers on Sunday morning.
- **Our demo for Elisa is video only** (confirmed). Elisa reviews 10:00–13:00 and picks its top three. **The top project from each challenge presents live at 14:00** to a cross-company jury. If we win Elisa's track, we need a short spoken version of the video too.
- **AI-built code is fine** if we "understand and verify what we ship". The test gates in Mikael v5 §15 are our answer, and the README should say so.

**Elisa contacts:**
- Joni Nuvola, AI architect: `joni.nuvola@elisa.fi`, Discord `jnuvola`.
- Matti Penttilä, Head of Autonomous Network Operations: `matti.s.penttila@elisa.fi`, Discord `mattipenttila_26920`.

**Briefing material in the repo:**
- `TRANSCRIPT_RECORDING.md`: the cleaned transcript, with timestamps used below.
- `TRANSCRIPT_RECORDING_raw.md`: raw, with confidence flags.
- `elisa_challenge_deck_joni.html`: Joni's deck. Open it in a browser; N shows the speaker notes.

Check these before asking Elisa anything.

---

## 2. The challenge in short

**Title:** *Capturing and Linking Human-Generated Contextual Metadata for Autonomous Network Operations*

**Guiding question:** *How could we collect silent metadata without creating additional work for our specialists?*

Elisa's AI already finds most faults. The autonomous loop still breaks on **silent metadata**: knowledge that lives only in experts' heads, Teams chats, emails and calls. Elisa gave two examples:

1. **TRN-042.** After an SFP swap the interface is UP, optics are OK and alarms are cleared, but there is no traffic. Erkki knows that on older (~2019) units this is a forwarding-state issue. The fix: check the counters, and if they are zero, disable and re-enable the interface. Don't reboot and don't swap the SFP again. This is written down only in one Teams chat and one email.
2. **Locked barrier.** The AI found the faulty device and an engineer was dispatched, but a locked barrier on a private road stopped him. The key's location was only in an email.

**Judging:**
- **Primary:** usability, meaning minimal extra work for specialists, ideally from Teams or email.
- **Secondary:** relevance, correct linking (right entity, right time validity), feasibility, and suitability for agentic operations.

**Elisa's strong demo:**
1. Capture from chat or email with no documentation task.
2. Store it as a context assertion bound to the right entities, with source and validity.
3. On a similar case, an agent proposes the right step before hardware is swapped or the unit rebooted.

**Elisa's architecture:**
- The network is described in time-aware layers: as-designed, as-built, as-running, **as-experienced (context, ours)** and as-observed (the event stream).
- Each context assertion is bound to a graph entity and has `valid_from` / `valid_to`. `valid_to` defaults to "still believed true".
- Their suggested tools are knowledge graphs, agents, and Neo4j or Spanner.

**Data rules:**
- All data is synthetic or illustrative.
- We are encouraged to generate more, including outdated and conflicting advice, and **must document what we generated and how**.

**Elisa's files:**
- In Abhishek's local folder `Hackathon/Since AI/Elisa_SinceAI2026/`: the brief, `use_case.md`, `teams_chat.json`, `email.txt` and `reference_architecture.png`.
- In the repo they go under `data/elisa_examples/` (Mikael v5 §13).

---

## 3. Abhishek's notes from Elisa's challenge talk

These are transcribed from his notebook, with spelling lightly cleaned. ★ marks points he starred.

**Since AI hackathon notes (Challenge ELISA):**

- Joni Nuvola: AI architect
- Matti Penttilä
- They already use AI a lot in their systems, so a typical implementation is not needed
- The AI does everything right, but there's some info the AI can't get, like location situations
- There are lots of quirks that the AI can't understand

**CONTEXT**

- ★ Allow the AI to find a way to get the context by texting
- They want to bind the context to the right places
- The engineers should not get extra work; the context should be captured automatically
- No manual inputting
- Trust component: determine what is fact
- They are looking for ease of usability, no extra work needed from their side
- Capture (context) → Link (don't forget context) → Re-use
- They want something working in the background
- ★ Could do a triage system: very minimal text that can be approved or not
- So it's basically a context capture system, so that the AI can learn the context and not need to do the work later
- The AI should be able to identify new information that is human-specific
- Have the AI be able to ask questions through Slack or Teams etc.
- There is already an existing knowledge base that the knowledge has access to
- The information needs to be fed back to their own agentic system
- Build our own interface?
- Graph database they already have running: they want the hidden knowledge to just connect to that. It does not do any processing, just gathering and deploying the context when they need it
- Tree network that can be accessed by the engineer optionally, to add context or change up some info or anything of that nature

---


## 4. The plan, in plain language (same plan as Mikael v5)

**One sentence for Elisa:** *A context layer your agents query with one call, filled from chats and email with zero required steps.*

Joni defined success in the briefing (recording 22:48): **capture** the knowledge, **bind** it to the network entities, and **recall** it when the agent needs it. Everything below serves those three words.

```
Teams chat / email / call transcript / reply to the agent   (experts do nothing)
        │
        ▼
 1. CAPTURE   is there a reusable rule? → trigger, action, avoid, evidence quote
        │     words mapped to a fixed vocabulary ("bounce the port",
        │     "shut / no shut" → interface.bounce)
        │     same trigger + same action as an existing tip → merged as a new case,
        │     never a duplicate (Elisa asked for this, recording 14:48)
        ▼
 2. BIND      keep EVERY plausible scope as a candidate:
        │     install year · model · firmware · site · region · the device itself
        │     one assertion node + one edge per candidate into Elisa's graph
        │     (we add a layer; we never modify their nodes)
        ▼
 3. RECALL    get_context(entity, event, symptoms, time)
              all candidates hold → PROPOSE   ·   none hold → DECLINE (says which failed)
              some hold → AMBIGUOUS → one tap to the expert, then remembered
              competing tips → precedence (verified > stated > hunch, more cases,
              newer), escalate only if still tied
              stale (e.g. firmware patched) → no longer proposed on that device
```

**How Abhishek's original ideas map into the merged plan:**

| Abhishek's original idea | Where it lives now |
|---|---|
| Triage: confident → store silently; unsure → ask | Candidate elimination: propose, decline or ambiguous. Ambiguous on a real device produces the one-tap question. |
| "Trust component: determine what is fact" | Trust levels `hunch` / `stated` / `verified_by_outcome`, plus case counts. "Traffic is back" in the thread counts as verification, with no tap. This is our answer to the problem Joni said Elisa hasn't solved ("how do we tell good knowledge from bad", recording 21:33). |
| Ask on Teams/Slack in one tap | In the expert's **own thread**, at most once, only when it changes what the agent does. See suggestion 5.1 on *when* to ask. |
| Confidence score shown in the UI | **Dropped.** No numeric confidence. We show the candidates and the case counts. |
| Deploy only when relevant | The trigger is a set of telemetry checks the agent runs itself (`link_up`, `optics_normal`, `counters_zero`). If counters are rising, the tip doesn't apply and nobody is asked. |
| Barrier key ("location situations") | **Core** (scenario 12). The trigger is the workflow step `dispatch_created`, so the key surfaces when the engineer is dispatched. |
| Obsidian-style graph viewer | **Read-only graph page** in Abhishek's lane, reading the real store. A search box is stretch; the time slider and editing are next-steps. Neo4j Browser is the fallback. |
| Live Slack bot | **Never built.** The demo is video only; the mock Teams page is the capture surface. |
| "Your tip was used today" | Kept, shown on the mock Teams page. |

**Line for the video:** *"We don't know if it's the year or the model. Neither does Erkki. We keep both, and only speak where both hold."*

**If a judge asks what the method is:** "candidate elimination over the topology, no scores". Details are in Mikael v5 §4.4.

---

## 5. Suggestions from the briefing recording (for Mikael's Claude to consider)

Mikael's §17 already covers no duplicates, advisory only, escalation-thread capture, precedence for competing facts, and region/season. These are the further changes Abhishek suggests. Timestamps refer to `TRANSCRIPT_RECORDING.md`.

**5.1 Ask at first use, not at capture.**
- One of the candidates is the device itself (`id == 'TRN-042'`), and every other device fails it. So after one case, nothing is ever proposed elsewhere until a human answers. That makes the question effectively mandatory for every new tip.
- Joni's framing is "if we see something, we capture it" (15:54). The accepted human step is the *agent* interrupting someone when it can't proceed (17:08).
- **Proposed:**
  - Capture stays fully silent.
  - The one-tap question is sent to the expert the first time a real incident lands on a device where the candidates disagree.
  - The answer is remembered.
- The usability claim becomes "0 steps to capture, 1 tap at first use".

**5.2 Put staleness in the spine and the video.**
- Joni raised stale facts twice, unprompted (06:32, 09:07), and "right time validity" is a judging criterion.
- The recording confirms the agent knows each device's firmware (35:43).
- Since our topology is synthetic, build scenario 15 (firmware patched on one node: no longer proposed there, still proposed on its unpatched siblings) without waiting for Elisa's answer on rollout.

**5.3 Escalation-thread capture before the graph search box.**
- Scenario 14 is how Joni said *he* would build it (19:35): the engineer explains to the agent, and the entities are already known.
- It will land better with Joni than the graph search box, so put it first in the stretch order.

**5.4 One phone-call transcript as an input.**
- Joni listed phone calls as an Elisa channel (13:19).
- One scenario written as a call transcript, through the same adapter, shows a third channel at almost no cost.

**5.5 Matti's seasonal example.**
- Matti said "during the summer this happens" (33:05). He's a judge and it's his example.
- If scenario 13 gets built, it gets a short moment in the video.

**5.6 Pitch wording.**
- **"Digital twin":** the raw transcript says "digital master" (31:04), so say "your network model in the graph database".
- **"Lapland":** this was a transcription guess (33:37). Don't present it as Elisa's words.
- **Confidence:** Joni mentioned a future "confidence model" before agents may act on their own (35:30). So don't pitch "no scores" as being against confidence. Say our trust levels and case counts are the foundation such a model would need.

**5.7 Drop ticket IDs from the synthetic threads.**
- Mikael v5 §4.1 says synthetic threads should reference a ticket ID, citing 28:03.
- At 28:03 Joni only explains where discussions come from today. He says to focus on the platforms where humans discuss.
- At 30:57 he is explicit: "in this era of autonomy we want to get rid of these ticketing systems … we don't want any tickets anymore". They bind everything to the network model in the graph database instead.
- **Proposed:** remove the ticket-ID line from §4.1 and §17. The entity hint comes from the device or site named in the conversation. In the escalation-thread channel (scenario 14), it comes from the incident context the agent already holds. Neither depends on a ticket.

---

## 6. Abhishek's lane

| Priority | Task | Notes |
|---|---|---|
| 1 | **Topology sheet** | ~20 nodes and 3 sites. Each node has `id`, `type`, `model`, `install_year`, per-node `firmware`, `site`, **`region`**. Each site has `access` notes, including the barrier site. It must include TRN-042, TRN-087 (2018, same model), TRN-101 (2023), and a 2018 unit of a *different* model for the ambiguous case. |
| 2 | **Scenario scripts** | Short scripts (who, what rule, what trap) for Mikael v5 Appendix A. Spine rows come first. **No ticket numbers.** Threads name the device (e.g. TRN-042) and, where natural, the site, the way engineers actually talk. Elisa wants to get rid of ticketing systems (recording 30:57). Add one **phone-call transcript** script, and the **seasonal** script if 13 is built. A different model expands them; Abhishek reads every generated thread. |
| 3 | **Video brief → script and storyboard**, locked by Saturday 12:00 | See section 7. Mikael's check: if no storyboard exists by 14:00, stop building features and write it. |
| 4 | **Mock Teams thread page** | Shows the conversation, the one-tap question and Erkki's tap, then "Erkki, your tip from 3 Nov was used on TRN-087 today". Must render by Saturday 20:00. |
| 5 | **Read-only graph page** | Reads the real store. Brand-styled. Cut first if late; Neo4j Browser is the fallback. |
| 6 | **Record and edit the video** | Saturday 20:00–23:00 and later. Every shot comes from `demo.py` with the cached model calls. |
| 7 | **Submission** | Accept Elisa's IP terms in sinceai.app (Saturday). Fill in the required fields. Review the README, data card and five slides that agents draft from the video script. Make the repo public or shared. Check links logged out. |

---

## 7. Video brief

**Format:**
- About **2 minutes**. It's the only thing Elisa reviews, so the video carries the whole pitch.

**Style:**
- **Fast cuts and bright colours, with a voiceover that never lets attention drop.** No dead air, no lingering on terminal output.
- **Brand:** dark background, purple `#534AB7`, clean and minimal, with a little tasteful whimsy.

**Structure: chapters.**
- **Intro:** a short hook.
- **One chapter per thing Elisa asked for.** Each chapter opens on a **big, bold title screen** for flair and attention, then shows that step happening on a real use-case example. The chapters follow Joni's own definition of success:
  1. **Capture:** knowledge pulled out of a normal conversation with no extra work.
  2. **Bind:** that knowledge linked to the right places in the network.
  3. **Recall:** an agent using it when the same situation comes back, and declining where it doesn't apply.
  4. **Stay true** (if built): knowledge that goes stale stops being used.
- **Outro:** a short close.

**Examples:**
- Erkki's TRN-042 case carries the chapters.
- The locked-barrier case appears too, ideally set up in the intro and paid off in Recall.

**Title screens:**
- One consistent template for every chapter.
- Short on screen, so they add energy without eating demo time.

**Must show:**
- **Usability:** zero forms for the expert, and at most one tap.
- **Linking:** the decline on a newer unit, with the reason.
- **Agent use:** the agent's advice flipping from "reboot" to the right fix, credited to the expert.

**Honesty rule:**
- Every shot comes from `demo.py`. If the code can't produce it, it isn't in the video.

**Not decided yet:**
- The shot-by-shot plan, voiceover text and timings. These get written Saturday morning, once the spine's outputs are known.

---

## 8. Open questions

The briefing answered most of the earlier ones. Confirmed:
- The platform doesn't matter.
- A synthetic topology is expected.
- The agent knows each device's model and firmware.
- No duplicates.
- Advisory only.
- The graph holds devices, sites, physical components and configuration.
- GDPR is out of scope.

Still open; ask Joni at the stand on Saturday if needed:
- What do entity IDs look like? Does the graph hold link data between devices?
- Is one in-thread question acceptable? (Probably yes, per 17:08.)
- Do IDs survive a hardware replacement? Does firmware roll out per device over time? Are config changes timestamped in the event stream?

---

## 9. Status

- [x] Challenge read, notes transcribed, briefing transcript read
- [x] Merged plan agreed (Mikael v5 is the spine); this handoff aligned to it
- [ ] Both members accept Elisa's IP terms in sinceai.app (Saturday)
- [ ] Topology sheet and spine scenario scripts (Abhishek)
- [ ] Contracts frozen, spine built and gated (Mikael and agents)
- [ ] Video script and storyboard by Saturday 12:00; mock Teams page by 20:00; graph page
- [ ] Saturday 20:00 freeze → record from `demo.py` → edit
- [ ] Repo public or shared; submit well before Sunday 10:00
