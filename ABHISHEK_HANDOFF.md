# Abhishek's Handoff

> **For any AI agent reading this (e.g. Mikael's Claude):** this is Abhishek's side of the shared context for our Since AI 2026 entry. It is **aligned with `MIKAEL_HANDOFF.md` v5**. Both files describe the same plan in the same vocabulary.
>
> - **`MIKAEL_HANDOFF.md`** is the source of truth for the pipeline, data model, contracts and build gates.
> - **This file** holds Abhishek's notes from Elisa's talk, the plan in plain language, and everything in Abhishek's lane: data, surfaces, video and submission.
> - **`REVIEW_ABHISHEK.md`** and **`REVIEW_MIKAEL.md`** record how we got here.
>
> If this file and Mikael's ever disagree on the pipeline, Mikael's wins. Flag the difference to the humans.

Last updated: Friday 6 November 2026, ~23:45 (Helsinki). Version 2, aligned to Mikael v5.

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
- **Before submitting:** check every link while logged out.
- **Our demo for Elisa is video only** (confirmed). Elisa reviews 10:00–13:00 and picks its top three. **The top project from each challenge presents live at 14:00** to a cross-company jury. If we win Elisa's track, we need a short spoken version of the video too.
- **AI-built code is fine** if we "understand and verify what we ship". The test gates in Mikael v5 §15 are our answer, and the README should say so.

**Elisa contacts:**
- Joni Nuvola, AI architect: `joni.nuvola@elisa.fi`, Discord `jnuvola`.
- Matti Penttilä, Head of Autonomous Network Operations: `matti.s.penttila@elisa.fi`, Discord `mattipenttila_26920`.

**Briefing transcript:** Mikael is adding a transcript of Elisa's briefing to the repo. Check it before asking Elisa anything (see section 7).

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

```
Teams chat / email  (experts do nothing)
        │
        ▼
 1. EXTRACT    is there a reusable rule? → trigger, action, avoid, evidence quote
        │      (words mapped to a fixed vocabulary: "bounce the port",
        │       "shut / no shut" → interface.bounce)
        ▼
 2. MERGE      same trigger + same action as an existing tip? → add as a new case,
        │      never a duplicate. Same trigger, different action → conflict.
        ▼
 3. BIND       keep EVERY plausible scope as a candidate:
        │      install year · model · firmware · site · the device itself
        │      if candidates disagree on real devices → ONE tap in the expert's thread
        ▼
 4. STORE      one assertion node + one edge per candidate into Elisa's graph
        │      (we add a layer; we never modify their nodes)
        ▼
 5. SERVE      get_context(entity, event, symptoms, time)
               all candidates hold → PROPOSE  ·  none → DECLINE (says which failed)
               some → AMBIGUOUS (ask or escalate)  ·  two tips disagree → ESCALATE
```

**How Abhishek's original ideas map into the merged plan:**

| Abhishek's original idea | Where it lives now |
|---|---|
| Triage: confident → store silently; unsure → ask | Candidate elimination: propose, decline or ambiguous. Ambiguous on real devices produces the one-tap question. |
| "Trust component: determine what is fact" | Trust levels `hunch` / `stated` / `verified_by_outcome`. One case is still a hunch until another backs it up. "Traffic is back" in the thread counts as verification, with no tap needed. |
| Ask on Teams/Slack in one tap | In the expert's **own thread**, at most once per conversation, only when candidates disagree on real devices. Shown on Abhishek's mock Teams page. |
| Confidence score shown in the UI | **Dropped.** No numeric confidence anywhere. We show the candidates and the case counts instead. |
| Deploy only when relevant | The trigger is a set of telemetry checks the agent runs itself (`link_up`, `optics_normal`, `counters_zero`). If counters are rising, the tip doesn't apply and nobody is asked. |
| Barrier key | The trigger is the workflow step `dispatch_created`, not an alarm, so the key surfaces when the engineer is dispatched. |
| Obsidian-style graph viewer with search | **Back in, as stretch item 2 in Abhishek's lane:** a searchable graph page with a time slider, reading the real store's JSON export. Neo4j Browser is the fallback. Editing is next-steps only. |
| Live Slack bot | **Never built.** The demo is video only. The mock Teams page is the capture surface. |
| "Your tip was used today" for the expert | Kept, shown on the mock Teams page. |

**Line for the video:** *"We don't know if it's the year or the model. Neither does Erkki. We keep both, and only speak where both hold."*

**If a judge asks what the method is:** "candidate elimination over the topology, no scores". It starts with every scope the first case allows, removes the ones each new case contradicts, and proposes only on what survives. Every answer is one sentence, e.g. "declined because install year 2023 fails `install_year <= 2019`." Details are in Mikael v5 §4.4.

---

## 5. Abhishek's lane

| Priority | Task | Notes |
|---|---|---|
| 1 | **Read the briefing transcript** when Mikael adds it | Note any answer that changes the plan (see section 7) |
| 2 | **Topology sheet** | ~20 nodes and 3 sites. Each node has `id`, `type`, `model`, `install_year`, **per-node `firmware`**, `site`. Each site has `access` notes, including the barrier site. It must include TRN-042, TRN-087 (2018, same model), TRN-101 (2023), and a 2018 unit of a *different* model for the ambiguous case. Links with far-end attributes only if Elisa confirms link data exists. |
| 3 | **Scenario scripts** | Short scripts (who, what rule, what trap) for Mikael v5 Appendix A. Spine rows come first: 1–10 and 7b. A different model expands them into threads, and Abhishek reads every generated thread for realism. |
| 4 | **Video script and storyboard** by Saturday ~10:00 | About **2 minutes**, fast cuts, bright colours, voiceover. Locked before screens are built, so the build produces what the edit needs. |
| 5 | **Mock Teams thread page** | Shows the conversation, the one-tap scope question landing, Erkki's tap, and later "Erkki, your tip from 3 Nov was used on TRN-087 today". |
| 6 | **Searchable graph page** (stretch) | Search box and time slider. Reads the store's JSON export. Styled to match the brand. Cut first if late. |
| 7 | **Record and edit the video** | Every shot comes from `demo.py` (cached model calls). Recording happens after the Saturday 20:00 freeze, editing Saturday night. |
| 8 | **Submission** | Accept the IP terms. Fill in the required fields. Short README and `docs/DATA_CARD.md`, which Claude can draft from the repo. ~5 slides at most, since the video carries the pitch. Check links logged out. |

---

## 6. The 2-minute video (draft beats)

Mikael's demo plan is written for about 3 minutes. For the video these beats need trimming to fit about 2:00.

| Time | Beat | What's on screen |
|---|---|---|
| 0:00–0:12 | **Hook** | "Elisa's AI was right. The engineer drove there. A locked gate stopped everything." The problem is clear in 10 seconds. |
| 0:12–0:25 | **Failure without context** | The agent on an old node says "reboot / swap the SFP". |
| 0:25–0:55 | **Capture and link** | Erkki's Teams thread. 12 messages become 1 assertion. Candidate edges light up on the graph, with the "year or model?" line. The question lands in the thread, Erkki taps once. Counter on screen: **0 forms · 1 tap**. |
| 0:55–1:20 | **Reuse** | TRN-087: "check counters, bounce, don't reboot — Erkki, Teams". Shown before and after, side by side. |
| 1:20–1:35 | **Decline** | TRN-101 (2023): "not in scope: install year 2023 fails ≤ 2019". |
| 1:35–1:50 | **Barrier** | The key email bound to the site, surfaced when the dispatch is created. "Your tip was used today." |
| 1:50–2:00 | **Close** | "One context layer. One call. Zero required steps." |

---

## 7. Open questions

**Check the briefing transcript first. Ask Elisa on Discord only about what it leaves open.**

- Is there a video length limit beyond "about two minutes"?
- What do Elisa's graph entities look like (types, ID format)?
- Is one in-thread question acceptable under "no additional work"?
- Does Elisa not want duplicates? (Mikael recalls they don't.)
- Do node IDs survive a hardware replacement?
- Does firmware roll out per device over time?
- Are config changes logged with timestamps in the event stream?
- Does their graph have link data?

**Still argued from Abhishek's side** (see `REVIEW_ABHISHEK.md`):
- The barrier case should be core, not stretch. It is one of only two examples Elisa gave, and it's the "location situations" point from the notes.
- The spine has grown again (predicate module, 17 scenario rows). Hold the Saturday 20:00 freeze.

---

## 8. Status

- [x] Challenge read, notes transcribed
- [x] Both plans reviewed; merged plan agreed (Mikael v5 is the spine)
- [x] This handoff aligned with Mikael v5
- [ ] Briefing transcript added (Mikael) and checked (Abhishek)
- [ ] Both members accept Elisa's IP terms in sinceai.app (Saturday)
- [ ] Topology sheet and spine scenario scripts (Abhishek)
- [ ] Contracts frozen, spine built and gated (Mikael and agents)
- [ ] Video script by Saturday ~10:00; mock Teams page; graph page (stretch)
- [ ] Saturday 20:00 feature freeze → record from `demo.py` → edit
- [ ] Submit well before Sunday 10:00
