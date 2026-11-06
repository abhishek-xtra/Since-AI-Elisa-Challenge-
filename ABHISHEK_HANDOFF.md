# Abhishek's Handoff

> **For any AI agent reading this (e.g. Mikael's Claude):** this file is Abhishek's side of the shared context for our Since AI 2026 hackathon entry. It holds the challenge summary, Abhishek's raw notes from Elisa's challenge talk, the idea Abhishek and Mikael agreed on, and the current brainstorm. Mikael will add his own handoff file (e.g. `MIKAEL_HANDOFF.md`). Read both before planning or building anything. Where they disagree, ask the humans rather than picking one.

Last updated: Friday 6 November 2026, ~21:00 (Helsinki)

---

## 1. Team and logistics

**Team:** Abhishek Singh and Mikael.

Abhishek is a digital systems and design student at Aalto. He is comfortable following technical instructions but is not an experienced coder, so he prefers step-by-step, milestone-based work with quick visible wins. His design taste is clean, minimal and dark, with brand purple `#534AB7`. He works on a Mac.

**Event:** Since AI Hackathon 2026, 6–8 November, Turku.

**Challenge partner:** Elisa Oyj.

**Deadline:** Submit through the Since AI app (sinceai.app) by **Sunday 8 November 2026 at 10:00**. Elisa reviews Sunday 10:00–13:00.

**What to submit:** a working demo, pitch slides, documentation and the code repository (this repo).

**Elisa contacts:**
- Joni Nuvola, AI architect. He presents the challenge and answers technical questions. `joni.nuvola@elisa.fi`, Discord `jnuvola`.
- Matti Penttilä, Head of Autonomous Network Operations. `matti.s.penttila@elisa.fi`, Discord `mattipenttila_26920`.

---

## 2. The challenge in short

**Title:** *Capturing and Linking Human-Generated Contextual Metadata for Autonomous Network Operations*

**Guiding question:** *How could we collect silent metadata without creating additional work for our specialists?*

Elisa wants a fully autonomous network. AI already does most fault detection and root-cause analysis. The blocker is **silent metadata**: operational knowledge that lives only in experts' heads, Teams chats, emails and calls. When it's missing, the autonomous loop stops and a human has to step in.

They gave two examples.

1. **Expert troubleshooting (TRN-042).** After an SFP swap, the interface is UP, optical levels are OK and alarms are cleared, but traffic doesn't recover. Erkki Expert knows that on older (~2019) transmission units this means a forwarding-state issue. The fix is to check whether the traffic counters stay at zero; if they do, disable and re-enable the interface before replacing hardware or rebooting. This is written down nowhere except one Teams chat and one email.
2. **Access info (locked barrier).** AI correctly found a faulty device in Northern Finland. The engineer was blocked by a locked barrier on a private road. Where to find the key was only in an email.

**Judging:**
- **Primary: usability.** The solution has to capture and connect useful context with minimal extra work for specialists, ideally from channels they already use (Teams, email).
- **Secondary:** relevance of the captured context, correctness of linking (right entity, right time validity), technical feasibility, and suitability for agentic network operations.

**Elisa's example of a strong demo:**
1. Erkki's knowledge is captured from the chat or email without a separate documentation task.
2. It is stored as a **context assertion** linked to the relevant entities (node TRN-042, older transmission units, SFP replacement), with its **source** and **validity period**.
3. When a similar case happens, an AI agent retrieves it and proposes the right next step (check the counters, bounce the interface) **before** hardware is replaced or the unit is rebooted.

**Elisa's reference architecture.** The network is described in time-aware layers:
- Intent/design: as-designed.
- Physical/passive: as-built.
- Runtime/active: as-running. This holds the temporal topology graph and telemetry.
- **Context: as-experienced.** This is the layer we are building.
- Event stream: as-observed.

Each **context assertion is BOUND to a graph entity** and has `valid_from` and `valid_to`. `valid_to` defaults to infinity, meaning "still believed true". Any point in time `t=x` can be cross-referenced across all layers. They suggest knowledge graphs, agents, and graph databases (Neo4j or Google Spanner).

**Data rules:** Everything we use is synthetic or illustrative, with no real data. We are *encouraged* to generate more synthetic chats, emails and network records: other devices, advice that later becomes outdated, and conflicting advice from two experts. **We must document what we generated and how.**

**Source files:** In Abhishek's local folder `Hackathon/Since AI/Elisa_SinceAI2026/`:
- the challenge brief (PDF and DOCX)
- `ELISA_HIDDEN_KNOWLEDGE_EXAMPLE_2026/`, which contains `use_case.md`, `teams_chat.json` (12 messages), `email.txt` and `reference_architecture.png`.

We may want to copy the example folder into this repo under `data/elisa_examples/`.

---

## 3. Abhishek's notes from Elisa's challenge talk

These are transcribed from his handwritten notebook. Spelling is lightly cleaned up, and ★ marks points he starred.

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

## 4. Our idea (agreed by Abhishek and Mikael)

**A background context-capture agent that works as a triage and classification system.**

- It listens to the channels Elisa already uses (Teams, Slack, email, …) and pulls out operational knowledge without anyone doing anything.
- **When the agent is confident** the context is correct, it adds the context to its memory (the graph) on its own, and **deploys it into Elisa's network/agentic system only when it is relevant**.
- **When it needs confirmation**, it sends a short message on Teams/Slack, whichever messaging tool Elisa uses, and the human approves or rejects it.
- **Human interaction should be minimal.** Most of the time the agent silently pushes context only when it relates to Elisa's existing network.

**Side feature, our "edge" to stand out:** an Obsidian-style **tree/graph visualiser** of every context clue the agent has gathered. It has a **search** function so a user can look up what has been collected, and they can **edit or add context only if they want to**. This is *not* the main part of the project, just a differentiator.

---

## 5. Brainstorm so far

This is where we are thinking, not final decisions.

```
Teams / Slack / email
        │  (agent listens, nobody does anything)
        ▼
  1. EXTRACT  ── is there knowledge here? which entity? what time?
        │
        ▼
  2. TRIAGE ──┬── confident ──────────► store in graph silently
              ├── unsure ─────────────► one-tap question in the same thread
              └── chit-chat ──────────► ignore
        │
        ▼
  3. GRAPH  (assertion ─BINDING─► TRN-042 / "2019 transmission units" / site)
        │       with source, valid_from, valid_to, confidence
        ▼
  4. DEPLOY ── new alarm/ticket on a linked entity → agent retrieves the
               assertion and suggests the next step
        │
        ▼
  5. VIEWER ── Obsidian-style graph, search, optional edits, time slider
```

**Triage needs explicit, visible signals, not "the LLM said so".** These are the candidate confidence signals:
- The fix was **confirmed** in the conversation ("Traffic is back 👍").
- The advice comes from someone with an **expert role**.
- The entity resolves to **exactly one** graph node or device class.
- It **doesn't conflict** with an existing valid assertion.

If all signals hold, the assertion is auto-committed. If any is missing (unconfirmed fix, ambiguous device, conflicting advice), it goes to the ask lane. This scoring *is* the "trust component" from the notes, and the score should be shown in the UI.

**Ask lane design.** The agent asks **the person who said it, in the same thread**, with a one-tap reply. Example:

> "Should I remember this for all 2019 transmission units, or just TRN-042? ✅ All / 📍 Just this one / ✖ Don't save"

That costs the expert seconds. It also settles **scope**, which is the hardest part of correct linking. Erkki's tip applies to a *class* of devices, while the barrier key belongs to *one site*.

**Time validity.** `valid_from` is the time the message was sent. When newer advice contradicts older advice, the old assertion gets a `valid_to`; it is never deleted. Our synthetic data should test outdated and conflicting advice on purpose, since the brief explicitly suggests both.

**Deploy is event-driven.** A new alarm or ticket on an entity, or a member of a device class, triggers retrieval of the matching assertions. The agent then posts the suggestion with its source. Example:

> "Before replacing hardware: check traffic counters; if zero, bounce the interface (source: Erkki, Teams, confirmed fix)."

This is step 3 of Elisa's own example demo and should be the climax of our demo.

**Viewer extras that would stand out:**
- A **time slider** that replays what the network "knew" at any time. This is Elisa's `t=x` diagram made interactive.
- Edits create **new versions** rather than overwriting, which keeps an audit trail.

**Possible stack (not decided):**
- Python backend.
- An LLM for structured JSON extraction.
- Neo4j, or a simpler store presented as "Neo4j-ready" if neither of us knows Neo4j.
- A real **Slack bot** for live ask-lane questions, because a Teams bot takes much longer to set up. Teams JSON and email are ingested as files.
- A small web app for the viewer, using Cytoscape.js or react-force-graph.

**Synthetic data to write:**
- The barrier-key email.
- A piece of advice that later becomes outdated.
- Two experts who disagree.
- A chat with no useful knowledge in it, to show the "ignore" lane.
- A few extra devices and sites.

---

## 6. Open questions

- How are Abhishek and Mikael splitting the work?
- Has either of us used Neo4j or built a Slack bot before?
- Which messaging platform should the live demo use: Slack, or a Teams mock?
- Which LLM/API do we have access to?
- Who builds the pitch slides, and when do we freeze features? (Suggestion: freeze around Saturday night and leave Sunday morning for the demo video, slides and README.)

---

## 7. Status

- [x] Read the challenge brief and Elisa's example material
- [x] Transcribed Abhishek's notes
- [x] Agreed on the core idea (triage agent + graph viewer)
- [ ] Mikael adds `MIKAEL_HANDOFF.md`
- [ ] Decide stack and split work
- [ ] Milestone plan
- [ ] Build

The repo was empty before this file.
