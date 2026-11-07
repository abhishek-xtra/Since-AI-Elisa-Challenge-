# HANDOFF: Elisa "hidden knowledge" challenge (team handoff, merged)

> **For any AI agent or human reading this:** this is the **single handoff for the team (Abhishek and Mikael)**.
>
> - **What it was made from:** `MIKAEL_HANDOFF.md` v6 (commit `a5eeb3c`, Saturday 00:40) and `ABHISHEK_HANDOFF.md` v3, made Saturday 7 November 2026, ~01:00 (Helsinki).
> - **It replaces both.** From now on, **edit this file only**.
> - **Older files are history only:** `MIKAEL_HANDOFF.md`, `ABHISHEK_HANDOFF.md`, `REVIEW_MIKAEL.md` and `REVIEW_ABHISHEK.md`. Where they disagree with this file, this file wins.
> - **What is decided:** sections 1 to 13.
> - **What is not decided:** Abhishek's open proposals in **section 14**. Agents must not build them until a human moves them into the plan.
> - **Claims are tagged** by where they come from: Elisa's brief or deck (reliable), the briefing recording (timestamps refer to `TRANSCRIPT_RECORDING.md`), checked by search (marked verified), or our own reasoning (marked as such).

**Deadline:** Sunday 8 November 2026, **10:00 EET**, via sinceai.app. Elisa reviews 10:00–13:00, **video only**. Finals at 14:00.

---

## 1. Team, roles and submission

### 1.1 Team

| Who | Owns |
|---|---|
| **Mikael** | The pipeline: contracts, extraction, binding, store, `get_context`, the stand-in agent, the eval harness. Claude agents build it and Mikael verifies it. |
| **Abhishek** | Data, surfaces, video and submission: topology sheet, scenario scripts, video script and storyboard, mock Teams page, read-only graph page, recording and editing, Discord questions. He is a digital systems and design student at Aalto, comfortable following technical instructions but not an experienced coder, and prefers short, milestone-based tasks with visible wins. Design taste: clean, minimal, dark, brand purple `#534AB7`, a bit of tasteful whimsy. Works on a Mac. |
| **Claude agents** | README, data card and about five slides, drafted from the repo and the video script. Abhishek reviews them. |

**Event:** Since AI Hackathon 2026, 6–8 November, Turku. **Challenge partner:** Elisa Oyj.

**Elisa contacts:**
- Joni Nuvola, AI architect: `joni.nuvola@elisa.fi`, Discord `jnuvola`. He is at the stand on Saturday.
- Matti Penttilä, Head of Autonomous Network Operations: `matti.s.penttila@elisa.fi`, Discord `mattipenttila_26920`.

### 1.2 Submission facts

Sources: the organiser's builder guide, and sinceai.ai/hackathon checked Saturday 01:00.

- **One entry per team** in **sinceai.app**, due Sunday 10:00 EET. Devpost does not count.
- **IP terms:** every member must personally accept Elisa's IP terms in the app, or the entry does not go through. **Both do this Saturday.**
- **Required fields:** project name, submission URL, "About the project" (up to 5,000 characters), repository or demo link, "Built with", technology feedback, GenAI tools used, and how generative AI is used in the project. Collect these while building.
- **Optional:** demo video (YouTube link or MP4, about **two minutes**, "strongly recommended"), pitch deck (PDF or PPTX), and supporting documents. Markdown is accepted, so this file and the data card can go in. No ZIP files.
- **The organiser's definition of a strong entry:** a working prototype with steps to run it, a repo with a real README, a two-minute video, and a deck "only if it helps; it never replaces a working prototype".
- **No live presentation to Elisa.**
  - Each company evaluates its own challenge "separately, with its own criteria" and picks its top three.
  - The closing ceremony is 13:15 and the top threes are announced from 13:30.
  - The only live presentation is the **14:00 finals**: five teams on stage to the jury. If we win Elisa's track, we need a short spoken version of the video.
- **Participant vote.** Every eligible builder completes 20 pairwise comparisons of submissions by 12:00 on Sunday. The site says in one place that finalists are "the most-voted solutions". So an audience with no telecom knowledge sees the entry for seconds. The **thumbnail, the first sentence of "About the project", and the first ten seconds of the video** are written for them: the locked-gate story, then "the AI was right and still could not finish".
- **The organisers' finals criteria:**
  - what was built during the event
  - whether it works
  - whether it answers the challenge
  - real-world relevance and business value
  - technical quality and feasibility
  - "how well you understand and explain your system"
  - responsible handling of privacy, security and data

  Elisa's own criteria (section 2) apply to the company review.
- **AI-built code is fine** on the condition "understand and verify what you ship, be ready to explain it". The test gates in section 12 are our answer, and the README says so.
- **The repo is private.** Make it public, or share it with the organisers, before submitting on Sunday morning. Check every link while logged out.

---

## 2. The challenge

**Title:** *Capturing and Linking Human-Generated Contextual Metadata for Autonomous Network Operations*

**Guiding question:** *How could we collect silent metadata without creating additional work for our specialists?*

**The problem.**
- Elisa's goal is a highly autonomous network. AI already handles most root-cause analysis, and agents already have tooling for topology and telemetry.
- The blocker is **silent metadata**: knowledge that lives only in experts' heads, Teams chats, emails and calls.
- When it is missing, the autonomous loop stops and a human has to step in.

**Story 1, the locked barrier.**
- A device fails in Northern Finland. The AI diagnoses it correctly and a field engineer is dispatched.
- A locked barrier on a private road stops him. The key's location was only in an email.

**Story 2, node TRN-042.**
- After an SFP (optical module) replacement, the interface is UP, optics are normal and alarms are cleared, but no traffic flows.
- Erkki Expert asks whether it is an older unit (installed around 2019) and says not to trust the green link status on those.
- He asks whether the traffic counters are increasing. They are at zero.
- He says to disable the interface, wait, and enable it again, and not to reboot. Traffic returns.
- Asked "is this documented somewhere?", he says no, they learned it over the years.
- The case exists as a 12-message Teams chat and an email.

**Elisa's reference model.**
- **Layers:** the network is described in time-aware layers: as-designed (intent), as-built (physical), as-running (topology snapshots and telemetry), **as-experienced (context, ours)**, and as-observed (the event stream).
- **Assertions:** each context assertion is **bound to a graph entity** and has `valid_from` / `valid_to`. `valid_to` defaults to "still believed true".
- **Tools suggested:** knowledge graphs, agents, graph databases (Neo4j or Spanner).

**Five hard problems Elisa lists:**
1. The real knowledge is about one sentence in twelve messages.
2. Linking: "these older units" could mean one node, the model or the install year, and **a wrong link is worse than none**.
3. Time: advice expires.
4. Trust: a hunch versus a verified fix, disagreeing experts, and who said it.
5. People: these are colleague conversations.

**Judging (Elisa's company review).**
- **Primary: usability.** Useful context is captured and linked with minimal extra work, ideally from channels specialists already use, such as Teams and email. Elisa states that if a solution needs the expert to fill in a form, the expert will not do it.
- **Secondary:** relevance, correct linking (right entity, right time validity), feasibility, and suitability for agentic operations.

**Elisa's "strong demo":**
1. Capture from the chat or email with no documentation task.
2. Store it as a context assertion bound to the relevant entities, with source and validity.
3. On a similar case on another old node, an agent proposes checking counters and bouncing the interface before hardware is swapped or the unit is rebooted.

**Data rules.**
- All data is synthetic or illustrative, and no production data is needed.
- We are encouraged to generate more data: other devices, outdated advice, conflicting experts.
- We **must document what we generated and how**.

**Elisa's provided files:**
- `use_case.md`
- `teams_chat.json` (12 messages, times but no date)
- `email.txt`
- `reference_architecture.png`

They are in Abhishek's local folder `Hackathon/Since AI/Elisa_SinceAI2026/`, and go in the repo under `data/elisa_examples/`.

---

## 3. What Elisa told us

### 3.1 Abhishek's notes from the challenge talk

Transcribed from his notebook, with spelling lightly cleaned. ★ marks points he starred.

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

### 3.2 From the briefing recording

Sources:
- `TRANSCRIPT_RECORDING.md`, cleaned. `TRANSCRIPT_RECORDING_raw.md` has the confidence flags.
- `elisa_challenge_deck_joni.html`, Joni's deck. Open it in a browser; N shows the speaker notes.

| What Elisa said | Time | What it means for us |
|---|---|---|
| Success = capture the knowledge, bind it to the network entities, recall it when the agent needs it | 22:48 | Our three verbs, and the video's chapters |
| "If we always write facts we grow the knowledge space", so check whether a fact already exists | 14:48 | Merge, never duplicate (5.2 step 2a) |
| The agent may interrupt a human and ask whether something is correct; this is current practice | 17:08 | The one question at first use (5.4) |
| "If we see something, we capture it" | 15:54 | Capture never asks anything |
| For a new problem, the engineer explains it to the agent and it is captured whole, with entities already known | 19:35, 27:18 | The escalation thread is a capture channel (5.1) |
| Two competing facts: "how can we score or detect which one to use?" | 09:58 | Deterministic precedence (5.6) |
| How to tell good knowledge from bad is unsolved at Elisa; ideas welcome | 21:33 | Our answer: trust levels + outcome verification + case counts. Say it in the pitch. |
| Facts go stale; they need a mechanism for that | 06:32, 09:07 | `valid_from` / `valid_to` / `valid_while` (5.5) |
| The agent knows each device's exact model and firmware number | 35:43 | Firmware is a scope candidate; per-device validity is half confirmed |
| Knowledge tied to "a certain software release" | 33:15 | Firmware-scoped candidates and validity |
| "During the summer this happens"; "during the snow, something happens in the [region]" | 33:05, 33:37 | Region as a scope candidate, season as a trigger (stretch). "Lapland" was a transcription guess; it is not Elisa's word. |
| The graph models devices, sites, physical components and logical configuration data | 31:11 | Our topology contract matches |
| Ticketing is legacy: "we want to get rid of these ticketing systems", "we don't want any tickets anymore" | 28:03, 30:57 | Nothing keys on tickets (5.1) |
| Joni's term for the modelled network is "digital master" (raw 31:04; could be a mis-hearing of "digital twin") | 31:04 | Say "your network model in the graph database" when unsure |
| Channels: Teams, emails, phone calls, monitoring; the platform does not matter | 13:19, 13:28 | A mock Teams page and file ingestion are fine |
| Synthetic topology is expected | 26:19 | Our topology sheet |
| Advisory only: no actions on the network; answer back to the engineer | 34:58 | The agent proposes, never acts |
| Later, "some kind of confidence model" might let agents act | 35:30 | Don't pitch "no scores" as being against confidence (pitch notes, 6.4) |
| GDPR is out of scope for the weekend | 33:59 | One README line on data handling |

**Still not answered by the recording:**
- whether IDs survive a hardware replacement
- whether the graph holds link data
- whether config changes are timestamped in the event stream

The questions are in section 10.

---

## 4. The plan

**One sentence for Elisa:** *A context layer your agents query with one call, filled from chats and email with zero required steps.*

**In one paragraph.**
- **Capture.** A pipeline reads the conversations people already have (Teams chat and email), notices when someone states a reusable rule, and stores it as a **context assertion** with:
  - a trigger: telemetry checks the agent can run itself
  - a set of candidate scopes over topology attributes: install year, model, firmware, site, region
  - an action, and an `avoid` list
  - provenance, trust and validity

  It requires no extra step from the expert, and **capture never asks a question**.
- **Bind.** One case cannot say which scope is the real one. So the system keeps every candidate, proposes only where all of them hold, and lets later cases eliminate the wrong ones.
- **The one question.** The first time a real incident lands where the candidates disagree, **one short question goes into the expert's own thread, once per assertion**.
- **Recall.** At the next similar failure anywhere in the graph, a thin stand-in agent receives the assertion through one `get_context` tool. It proposes "check counters, bounce the interface, don't reboot", citing the source and the number of cases behind it.
- **Decline.** If the new unit fails a candidate, or the assertion has expired, the system declines deterministically and says why.
- **Conflict.** If two assertions conflict, a deterministic precedence picks one and shows the dispute. Only a tie goes to a human, with both attached. The agent never falls back to the default silently.

```
Teams chat / email / reply to the agent        (experts do nothing)
        │
        ▼
 1. CAPTURE   is there a reusable rule? → trigger, action, avoid, verbatim evidence quote
        │     words mapped to a fixed vocabulary ("bounce the port", "shut / no shut"
        │     → interface.bounce); same trigger + same action as an existing tip →
        │     merged as a new case, never a duplicate
        ▼
 2. BIND      keep EVERY plausible scope as a candidate:
        │     install year · model · firmware · site · region
        │     (the device itself is the ORIGIN of the case, not a candidate)
        │     one assertion node + one edge per candidate into Elisa's graph
        │     (we add a layer; we never modify their nodes)
        ▼
 3. RECALL    get_context(entity, event, symptoms, time)
              all candidates hold → PROPOSE  ·  none hold → DECLINE (names what failed)
              some hold → AMBIGUOUS → one question in the expert's thread, once, remembered
              competing tips → precedence (verified > stated > hunch, more cases,
              newer); escalate only on a tie
```

**Lines for the video and pitch:**
- *"We don't know if it's the year or the model. Neither does Erkki. We keep both, and only speak where both hold."*
- If a judge asks what the method is: "**candidate elimination over the topology, no scores**" (5.4).

**How Abhishek's original ideas live in the plan:**

| Original idea | Where it is now |
|---|---|
| Triage: confident → store silently; unsure → ask | Candidate elimination: propose, decline or ambiguous. Ambiguous on a real incident produces the one question. |
| "Trust component: determine what is fact" | Trust levels plus case counts. "Traffic is back" counts as verification, with no tap. |
| Ask on Teams/Slack in one tap | In the expert's own thread, at first ambiguous use, at most once per assertion |
| Confidence score in the UI | Dropped. We show candidates and case counts, not a number. |
| Deploy only when relevant | The trigger is telemetry checks the agent runs itself |
| Barrier key ("location situations") | Spine: the trigger is the workflow step `dispatch_created` |
| Obsidian-style graph viewer | A read-only graph page drawing the real store, for the video. Search box is stretch; time slider and editing are next-steps. |
| Live Slack bot | Next-steps only. The review is video only, and the mock Teams page is the capture surface. |
| "Your tip was used today" | Kept, shown on the mock Teams page |

---

## 5. Design

### 5.1 Inputs

- **Primary inputs.** `teams_chat.json` and `email.txt`. Adapters convert them to one message format: author, role, timestamp, channel or thread, text. Slack or any other source can be added later without changing the rest.
- **The agent's own escalation thread is a capture channel** (recording 19:35, 27:18).
  - This is Joni's preferred design for a new problem: the engineer explains it to the agent, and the explanation is captured whole, with the incident's entities already known.
  - Elisa also already lets users flag "this response was bad, the correct solution is X because Y".
  - In both cases binding is unambiguous. The message format carries an optional `incident` field (entity IDs, event, symptoms), and the extractor skips entity resolution when it is present.
  - Stretch (scenario 14). The pitch point holds either way: the same assertion comes out whether the knowledge arrived in Teams, email or a reply to the agent.
- **The ticketing system is legacy and is going away** (recording 28:03, 30:57).
  - Nothing in our design reads from, writes to, or keys on a ticket.
  - The incident anchor is an event in the as-observed stream bound to a graph entity (an alarm, a dispatch, an agent escalation).
  - If a synthetic thread mentions a ticket number the way people do today, the extractor treats it as free text. It is not an entity and never becomes a binding.
  - **Scenario scripts do not use ticket numbers.** Threads name the device (e.g. TRN-042) and, where natural, the site.
- **The demo's capture surface** is the mock Teams thread page (Abhishek's). The first-use question and the "your tip was used" notification appear there. A live Slack bot is next-steps.

### 5.2 Pipeline

1. **Detect.**
   - Decide whether a conversation contains a reusable rule. Most messages produce nothing.
   - Extract trigger, `applies_to`, action and avoid.
   - The trigger is written as **checks the agent can evaluate against telemetry** (`counters_zero`, `link_up`, `optics_normal`), not as prose, so the agent verifies the precondition itself.
   - There are two kinds of trigger:
     - an incident pattern: event plus symptoms
     - a workflow step: `dispatch_created` for the barrier key, because access knowledge is needed at dispatch time, not at diagnosis time
2. **Evidence check.** Every extracted field must be supported by an excerpt that actually appears in the source. Otherwise drop the assertion.
   - **2a. Merge, never duplicate** (recording 14:48).
     - Symptoms and actions are extracted into a controlled vocabulary (`contracts/vocabulary.md`), so "disable and enable", "bounce the port" and "shut / no shut" all become `interface.bounce`.
     - The merge key is trigger plus canonical action, matched exactly.
     - **Same key:** the new case is added to the existing assertion, and its entity's attributes vote on the candidates (5.4).
     - **Same trigger, different action:** a conflict, both `disputed` (5.6).
     - **Different trigger, same action:** separate assertions.
     - No fuzzy matching, and no human review of near-duplicates.
     - A **case** is a distinct incident (entity plus time); a **source** is a document. Erkki's chat and email are one case with two sources, and `support` counts cases.
   - **2b. Corroborate (first stretch task).** Search the existing corpus for the same merge key and run 2a on each match. Earlier cases vote on the candidates, and the earliest sets `valid_from`. Erkki says "several cases I've seen"; the system should find them.
3. **Bind.**
   - Resolve the entities mentioned (explicit IDs, nicknames, typos) against the topology.
   - Record the device as the **origin of the case** (`evidence.cases`).
   - Build the candidate set from the condition stated in the text plus that device's attributes: model, firmware, install year, site, region.
   - **The device ID is not a scope candidate**, unless the text limits the rule to that unit ("only this one").
   - Do not rank candidates.
   - **Capture never asks a question.**
   - If the text refers to attributes the topology lacks, the candidate is recorded as unresolvable and never matches.
4. **Time.**
   - `valid_from` comes from the conversation date; `recorded_at` from ingestion.
   - `valid_to` defaults to null ("still believed true").
   - A stated end condition (e.g. a firmware fix) is stored as text in `valid_while` (see 5.5).
5. **Trust.** Record the speaker's role and a trust level (5.3). Outcome verification comes from the thread or from telemetry, never from a tap.
6. **Store.**
   - The assertion is a node, with one edge per candidate scope into the topology, plus edges to its sources.
   - Neo4j in Docker. If it is not running within 45 minutes, fall back to JSON plus a pyvis HTML export.
   - We write only to this layer and never modify Elisa's nodes.
7. **Serve** through `get_context` (5.7).

### 5.3 Assertion shape (illustrative, synthetic)

```json
{
  "id": "CA-0001",
  "trigger": {
    "event": "sfp_replaced",
    "symptoms": ["link_up", "optics_normal", "counters_zero"]
  },
  "applies_to": {
    "entity_type": "transmission_node",
    "candidates": [
      {"predicate": "install_year <= 2019", "support": 1, "against": 0, "basis": "expert: 'older units, around 2019'"},
      {"predicate": "model == 'TX-200'", "support": 1, "against": 0, "basis": "attribute of TRN-042"},
      {"predicate": "firmware == '4.1'", "support": 1, "against": 0, "basis": "attribute of TRN-042"},
      {"predicate": "site == 'OULU-07'", "support": 1, "against": 0, "basis": "attribute of TRN-042"},
      {"predicate": "region == 'north'", "support": 1, "against": 0, "basis": "attribute of TRN-042's site"}
    ],
    "decided": null
  },
  "action": "interface.bounce",
  "action_text": "disable the interface, wait, enable it",
  "avoid": ["node.reboot", "sfp.replace"],
  "evidence": {
    "cases": [{"entity": "TRN-042", "at": "2026-11-01T09:25:00Z", "outcome": "recovered"}],
    "sources": ["teams:thread-001", "email:001"],
    "excerpt": "Disable the interface, wait, enable it. Don't reboot.",
    "said_by_role": "expert"
  },
  "trust": "verified_by_outcome",
  "status": "open",
  "recorded_at": "2026-11-06T00:00:00Z",
  "valid_from": "2026-11-01T00:00:00Z",
  "valid_to": null,
  "valid_while": null
}
```

Attribute values are placeholders for whatever the synthetic topology gives TRN-042. The conversation date is synthetic, because `teams_chat.json` has no date; document it.

**Vocabulary, used the same way everywhere in this file and in the code:**

- **`assertion.status`**
  - `open`: candidates undecided
  - `decided`: the expert answered, or evidence left one
  - `disputed`: conflicts with another assertion
  - `review`: an outcome contradicted it
- **`get_context` outcome for one entity**
  - `proposed`
  - `declined`: names the failing candidate or condition
  - `ambiguous`: some candidates hold, some do not
- **`trust`**
  - `hunch`: the speaker hedges, or has no expert role, and there is no outcome
  - `stated`: an expert states it as a rule, with no observed outcome yet
  - `verified_by_outcome`: at least one case whose outcome was observed, such as "Traffic is back" or telemetry recovering after the action
- **Trust and support are separate axes.** The core case is `verified_by_outcome` with support 1, and every proposal shows the case count ("worked once, on TRN-042").

### 5.4 Linking: candidate elimination

- **A wrong link is worse than none.** When in doubt, the outcome is `ambiguous`, never `proposed`. Report accuracy when it proposes, and how often it stays silent.
- **Multi-candidate binding.**
  - The scope is a set of candidate predicates over topology attributes (install year, model, firmware, site, region), not one edge.
  - Region matters because some knowledge is not device-specific at all: seasonal or regional knowledge binds to a region, and its trigger carries a season or weather condition (stretch, scenario 13).
  - **The device ID is the origin of the case, not a candidate.** It becomes the scope only when the text or the expert's answer limits the rule to that unit. If it were a candidate, every other device would fail it and the system would have to ask on every capture.
  - Candidates are not ranked. Each carries `support` and `against` counts.
- **Propose only on the intersection.** On a new incident that matches the trigger:
  - all surviving candidates hold → **propose**
  - none hold → **decline**, naming the failing candidates
  - some hold → **ambiguous**

  Abstention is computed, not judged.
- **Evidence narrows the set.**
  - A corroborating case or a verified outcome adds `support` to the candidates its entity satisfies, and `against` to the ones it doesn't.
  - A candidate with `against` > 0 is eliminated. Three cases usually leave one.
  - A failure where *every* candidate held sends the assertion to `review` rather than deleting anything.
- **Humans override counts.** The expert's answer sets `decided`. Other candidates stay recorded as hypotheses but are not used.
- **No model-reported numeric confidence anywhere.** It is poorly calibrated. Show the candidates and counts instead.
- **The one question.**
  - **When:** at first ambiguous use, never at capture, at most once per assertion.
  - **Where:** when `get_context` returns `ambiguous` for a real incident, the agent posts one question into the original expert's thread, naming the candidate that disagrees: "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site. All older units / only OULU-07 / no." Two or three options plus free text. The answer sets `decided`.
  - **Why it fits:** this is the human interruption Elisa already practises (recording 17:08). It arrives with a real second case, so it doubles as verification. It is the only human action in the whole flow.
- **What this is, and is not (for when a judge asks).**
  - It is candidate elimination, also called version space learning. Start with every hypothesis the first case allows, remove the ones each new case contradicts, and propose only on what survives.
  - It is not a confidence score: nothing is weighted, random or a probability. `support` is a tally kept so it can be shown, not thresholded.
  - **Why this and not a learned model:**
    1. The output is three states (propose, decline, ask), not a number that needs a threshold, and thresholds are where wrong links come from.
    2. Every answer is one explainable sentence: "declined because install year 2023 fails `install_year <= 2019`, supported by three cases."
    3. It works at one case, where statistics have nothing to say.
    4. A human answer is just a hypothesis marked `decided`, not a label to retrain on.
  - **Known weakness:** it is brittle to one wrong case. That is why counts are kept and contradictions go to `review`.

### 5.5 Time

- **Expiry triggers:**
  - a stated end condition
  - a firmware or software change recorded in the topology
  - a newer contradicting assertion
- **Validity may be a condition, not only a date.**
  - Joni's deck says a firmware fix ends a rule. The agent knows per-device firmware (35:43).
  - If firmware is upgraded per device over time, an assertion can carry `valid_while` (e.g. `firmware < 5.0`), evaluated per entity at `at_time`. That is what Elisa's t=x cross-referencing means in practice.
  - **Current plan:** the spine uses dates; `valid_while` is stored as text, pending Elisa's answer on staggered rollout. See proposal 14.1 to build it now on synthetic data.
  - The barrier key would expire the same way when the site's lock attribute changes.
- Keep `recorded_at` (when we learned it) separate from `valid_from` (when it became true).

### 5.6 Trust, conflict and people

- **Show provenance:** who said it (by role by default), where, and whether it was a hunch, an expert statement or verified.
- **Outcome verification, zero taps.** A confirmation in the thread, or counters rising after the action, upgrades trust to `verified_by_outcome`. Nobody taps anything.
- **Notify the expert when their knowledge is used** ("your tip was used today"). This is the positive answer to the "people" problem.
- **Conflict.**
  - When two assertions apply to the same situation and disagree, both become `disputed`.
  - **Precedence is deterministic and shown with its components:**
    1. `verified_by_outcome` over `stated` over `hunch`
    2. more cases over fewer
    3. newer `valid_from` over older
  - The winner is proposed with the dispute visible ("another expert says swap the SFP; not verified").
  - **Only a tie escalates** to a human, with both attached.
  - The agent never silently falls back to the default action, because the default is often what the experts warned against.
  - In the core material, Erkki's verified fix beats "it's always the optic".
- **"Is this knowledge good or bad?"** This is Elisa's open problem (21:33). Our answer is the trust levels, outcome verification from the thread or telemetry, and case counts. Say it explicitly in the pitch.
- **Ingestion policy:**
  - use opted-in channels or resolved threads
  - store the excerpt and the assertion, not the whole thread
  - show only the cited excerpt
  - advisory only: never act on the network
- **GDPR** is out of scope for the weekend. Keep one README line on data handling.

### 5.7 The stand-in agent and its one tool

- **The agent.** One prompt, one tool call.
  - Without context, it proposes a reboot or another SFP swap.
  - With context, it proposes the bounce and cites the source.
  - Pitch it as: "this stands in for your agent; the deliverable is the tool it calls".
- **`get_context(entity_id, event, symptoms, at_time)`** returns assertions with provenance, trust and status, after a **deterministic filter**, in this order:
  1. trigger match on event and symptoms (retrieval is by symptom pattern, not by device, because the same fault can appear anywhere in the graph)
  2. the candidate intersection against the entity's attributes
  3. validity at `at_time`
  4. trust threshold
- **Declines come from the filter**, not from the model's judgment.
- **Edge cases:**
  - Ambiguous outcomes trigger the first-use question.
  - Tied disputes are returned flagged, and the agent escalates.
  - A disputed assertion that wins precedence is proposed with the dispute shown.
- **The demo shows the exact input the agent receives.**

### 5.8 Effort accounting (the usability criterion)

- Extra human actions per captured assertion: **zero**, because capture never asks.
- Questions per assertion: **at most one**, at first ambiguous use.
- The share of assertions that never needed a question.

Say it out loud in the video: **"0 forms, 1 tap, once."**

---

## 6. Demo and video

### 6.1 Demo beats

These are what `demo.py` produces. **The video is cut from these and from nothing else.**

1. **The failure without context.** The agent, on an old node, proposes a reboot or another SFP swap.
2. **Capture and link.**
   - Feed in the Teams chat and the email. 12 messages become 1 assertion: one case, two sources, trust `verified_by_outcome` from "Traffic is back".
   - Candidate scope edges appear in the graph.
   - Line: "We don't know if it's the year or the model. Neither does Erkki."
   - Nobody fills in anything, and nobody is asked.
3. **First use and the one question.**
   - A new fault on TRN-087 (2018, same model, different site). `get_context` returns `ambiguous` on the site candidate.
   - One question lands in Erkki's thread, and he taps "All older units".
   - The agent proposes "check counters, bounce, don't reboot", citing Erkki and showing 1 case.
   - On screen: **12 messages · 1 assertion · 0 forms · 1 tap**.
4. **Decline.** On TRN-101 (2023), the system declines and names the failing candidate.
5. **Barrier.**
   - The locked-barrier email goes through the same pipeline and is bound to a site.
   - A dispatch to that site is created, and the key location surfaces before anyone drives.
   - Then Erkki's "your tip was used today" notification.

Expiry (firmware fix) and conflict (two experts) go on slides with screenshots if built, not into the video, unless proposal 14.1 is adopted. The replay runs offline from the cached model calls, so the demo never depends on live calls.

### 6.2 Video brief

- **Length:** about **2 minutes**. It is the only thing Elisa reviews, so it carries the whole pitch. The participant vote (1.2) means the first ten seconds and the thumbnail must work for non-experts.
- **Style:**
  - fast cuts, bright colours, and a voiceover that never lets attention drop
  - no dead air, no lingering on terminal output
  - brand: dark background, purple `#534AB7`, clean and minimal, with a little tasteful whimsy
- **Structure: chapters.**
  - A short intro, then **one chapter per thing Elisa asked for**, then a short outro.
  - Each chapter opens on a **big, bold title screen** in one consistent template. Keep it short on screen, so it adds energy without eating demo time.
  - The chapter names are Joni's own definition of success (22:48).

| Chapter | Shows | Demo beat |
|---|---|---|
| Intro | Hook: the locked-gate story ("the AI was right and still could not finish"), then Erkki's "we learned it over the years" | 1 (and setup for 5) |
| 01 Capture | Knowledge pulled out of a normal conversation with zero extra work | 2 |
| 02 Bind | The assertion landing in the network graph, with its candidate edges | 2 (graph page) |
| 03 Recall | The agent's advice flipping from "reboot" to the right fix, credited to Erkki; the one tap; the decline on TRN-101; the barrier key surfacing at dispatch | 3, 4, 5 |
| 04 Stay true | Stale knowledge stops being used | Only if a beat for it is added to `demo.py` (proposal 14.1); otherwise drop the chapter |
| Outro | "Capture. Bind. Recall." The one-sentence pitch | — |

- **Must show:**
  - zero forms and at most one tap
  - the decline with its reason
  - the agent's advice flipping from reboot to the real fix, credited to the expert
- **Honesty rule:** every shot comes from `demo.py` with the cached `llm.py`. If the code can't produce it, it isn't in the video. A judge who opens the repo must find exactly what the video shows.
- **Not decided yet:** the shot-by-shot plan, voiceover text and timings. These are written Saturday morning, once the spine's outputs are known, and locked by 12:00.

### 6.3 Graph page and mock Teams page (Abhishek)

- **Mock Teams thread page.** Shows:
  - the conversation
  - the first-use question and Erkki's tap
  - "Erkki, your tip from 1 Nov was used on TRN-087 today"
  It must render by Saturday 20:00.
- **Read-only graph page.**
  - Draws the real store's JSON export, brand-styled, for the video.
  - The search box is stretch. The time slider and editing are next-steps.
  - Neo4j Browser is the fallback.

### 6.4 Pitch notes

- **Name the network carefully.** Say "your network model in the graph database". If using Joni's term, "digital master", treat it as his word from the transcript.
- **"No scores" is not anti-confidence.** Joni mentioned a future "confidence model" before agents may act (35:30). Our trust levels and case counts are the foundation such a model would need.
- **Be honest about prior art.** The general problem is known (section 11). The pitch focuses on linking, time and trust.
- **Explain the stand-in agent.** It stands in for their agent; the deliverable is the tool.

---

## 7. Data and evaluation

### 7.1 Data

- **Topology.** Start from Elisa's provided case and add a small synthetic topology (Abhishek's sheet):
  - about 3 sites and 20 nodes
  - each node: `id`, `type`, `model`, `install_year`, per-node `firmware`, `site`
  - each site: `id`, `name`, `region`, `access` notes, including the barrier site
  - it must include TRN-042, TRN-087 (2018, same model, other site), TRN-101 (2023), and a 2018 unit of a *different* model
  - links between devices are pending Elisa and are not in the contract
- **Dates.** Assign a synthetic date to Erkki's chat and document it.
- **Scenarios.** About twelve spine scenarios plus one per stretch item (Appendix A).
  - Abhishek writes short scripts (who, what rule, what trap, no ticket numbers).
  - **A different model from the extractor** expands them into threads or emails.
  - Abhishek reads every generated thread for realism.
  - This makes every row a held-out test.
- **No dev/test split.** At this sample size it means nothing.
- **Document everything generated** in `docs/DATA_CARD.md`: what, how, which model, which prompt.
- **State plainly:** this tests whether the mechanisms hold up under messy synthetic conversations, not real-world accuracy.

### 7.2 Metrics (in Elisa's criteria order)

1. **Usability:** extra actions per assertion, questions per assertion, and the share captured with zero human input.
2. **Relevance:** noise rejected (no-rule threads produce nothing), and whether the planted rules were captured.
3. **Linking:** right entity and level, validity correctness, abstention rate. Report per trap, including failures.
4. **Agent-ready:** correct proposals, wrong or out-of-scope proposals (target zero), correct declines, correct escalations.
5. **Feasibility:** latency and cost per conversation, and whether a local model could run it.

Report results as a **generated case table** (pass or fail, and why), not percentages.

### 7.3 Baselines

- **A: no context.** The demo opener.
- **B: raw chats and emails in RAG.** Stretch only, and one slide if built. Its expected failures:
  - applying advice to a newer unit
  - using expired advice
  - treating a hunch as verified
  - binding to a device mentioned in passing
- **C: this system.**

The headline is Elisa's three steps plus the decline, not C versus B.

---

## 8. Scope

**Spine (must pass before the Saturday 20:00 freeze):**
- Teams and email adapters
- extraction with the evidence check and telemetry-check triggers
- the controlled vocabulary and merge-by-key
- multi-candidate binding
- the first-use question in the expert's thread
- validity dates and trust fields
- the predicate evaluator
- Neo4j storage with one edge per candidate
- `get_context` with the deterministic filter
- deterministic precedence on conflict
- the thin stand-in agent
- the decline on a newer unit, and ambiguous on a different model
- **the barrier case on a dispatch trigger**
- the generated case table and the data card
- the mock Teams page and the read-only graph page

**Stretch, in this order, after the spine passes.** Each is one agent task that does not touch the spine. Proposal 14.2 suggests reordering.
1. corroboration search (5.2, step 2b)
2. search box on the graph page
3. marker-phrase pre-filter (13.8)
4. split diagnostic from remedy (13.3)
5. regional and seasonal scope (scenario 13)
6. capture from the agent's escalation thread (scenario 14)
7. blast radius on the avoid list (13.6)
8. conflict escalation on a tie (scenario 16)
9. baseline B

**Next-steps slides only:**
- live Slack and other connectors
- voice narration for field technicians
- runbook-versus-actual-action deviation detection
- question-value scoring
- tree-descent retrieval over channel maps
- editing assertions in the graph UI
- the time slider on the graph page

**Cut order if behind, inside the spine:**
1. the graph page (fall back to Neo4j Browser)
2. Neo4j (fall back to JSON + pyvis HTML)
3. the mock Teams page (fall back to a text log)
4. the barrier case, last

**Pending Elisa's answers (section 10), not built until confirmed:**
- per-device `valid_while` (13.5; see proposal 14.1)
- one-hop neighbour candidates and link data (13.2)
- event-stream corroboration (13.7)

---

## 9. Who does what, and when

| When | Mikael (and agents) | Abhishek |
|---|---|---|
| **Fri night (done)** | Plan merged into this file. Discord questions drafted (section 10). | Notes transcribed, briefing read, video brief written |
| **Sat 08:00–10:00** | Contracts frozen (12.1). Adapters and extractor on Elisa's chat and email. **Gate:** one assertion; `avoid` has `node.reboot`; excerpt is verbatim; trust `verified_by_outcome`. | Topology sheet (7.1). Spine scenario scripts. Accept Elisa's IP terms in sinceai.app. |
| **Sat 10:00–14:00** | Predicate evaluator (tested alone first), binder, Neo4j store, `get_context`, stand-in agent. **Gate:** TRN-087 → ambiguous → question → bounce; TRN-101 declined naming the candidate; a 2018 unit of another model is ambiguous. | Review the generated threads. **Video script and storyboard locked by 12:00.** Mock Teams page. |
| **Sat afternoon** | Eval harness over all scenarios, case table, fix what it reveals. Stretch only if the spine is green. | Graph page. **Check at 14:00: a storyboard exists. If not, stop building features and write it.** |
| **Sat 20:00** | **Feature freeze** | **Check: the mock Teams page renders** |
| **Sat 20:00–23:00** | Rehearse `demo.py`. Agents draft the README, data card and ~5 slides from the video script. | Record every beat from `demo.py` with the cached `llm.py`. Edit the video. |
| **Sun morning** | Bug fixes only; final case table run | Final cut. Review README, slides and submission fields. Make the repo public or shared. Check links logged out. **Submit well before 10:00.** |

---

## 10. Risks and questions

### 10.1 Risks

- **The extractor may fail on messy threads.** This is the biggest technical unknown.
- **Self-generated synthetic data may flatter the results**, even with a separate generator.
- **The pitch may look like "RAG with extra steps"** unless the video opens on the failure and shows the decline.
- **The stand-in agent is a simplification.** Say so.
- **The real graph schema is unknown**, so our topology may not match it.
- **Is one in-thread question "additional work"?** Capture never asks, and there is at most one question per assertion, at first use. The recording at 17:08 suggests this is acceptable.
- **Verification is the bottleneck.** With agents building, the human verifying is the bottleneck. Untested agent output that "looks done" is the main way the weekend is lost.
- **The video gets squeezed into the last hours.** Mitigation: storyboard by 12:00, and the 14:00 check.

### 10.2 Questions for Elisa (Discord, drafted Saturday 00:45)

Ordered by what the answer changes. Questions 1–4 decide demo beats; 5–8 decide pending items only.

```
Hi Joni, thanks for the briefing. We're building a context layer that binds assertions from Teams/email into a synthetic copy of your network graph. A few short questions so our topology and demo match how things actually work at Elisa. One-line answers are plenty.

1. Does a device in your graph carry its installation date (or year)? And do sites carry a region or location? Erkki's "older units, around 2019" only works for an agent if that attribute exists somewhere it can read.

2. When a field engineer is dispatched, is that visible to the agent as an event (something it can react to), or does dispatch happen in a system outside the graph? We'd like access knowledge like the barrier key to surface at dispatch time.

3. Our capture needs zero steps by default. The first time a rule is about to be reused on a device where its scope is unclear ("these older units": the model, the install year, or just that site?), we'd post one tap-to-answer question into the expert's own Teams thread, once per rule. Does that count as "no additional work" for you?

4. Entity IDs: what does a node ID look like in your graph (TRN-042 style, or longer), and are links between devices modelled with their own attributes (far-end device, SFP vendor)?

5. When a chassis is physically replaced, does the node keep its ID in the graph, or does the new hardware get a new ID?

6. Do firmware upgrades roll out gradually, so two "older units" can be on different firmware for a while?

7. Are configuration changes on a device (e.g. an interface shut / no shut) visible in the event stream with a timestamp?

8. Can we include your example files (teams_chat.json, email.txt, use_case.md) in our submission repo?

We'll be at the stand today with a running version. Thanks!
```

| # | Answer (fill in) | What it changes |
|---|---|---|
| 1 | | If there is no install date, the "older units" candidate becomes firmware or model, and beat 2's text and the TRN-101 decline change |
| 2 | | If there is no dispatch event, the barrier beat fires on a mocked workflow step, and the video says so |
| 3 | | If no, capture stays silent and ambiguous cases escalate without a question |
| 4 | | The ID format in the synthetic topology; link data unlocks 13.2 |
| 5 | | Only the wording about origin devices (13.1) |
| 6 | | Unlocks `valid_while` (13.5) |
| 7 | | Unlocks event-stream corroboration (13.7) |
| 8 | | Where the fixtures live |

---

## 11. Prior art

- **Graphiti and Zep (verified by search).**
  - An open-source temporal knowledge graph engine for agent memory.
  - Facts are graph edges with validity windows (`valid_at`, `invalid_at`) and provenance. A contradicted fact is marked invalid, not deleted.
  - Time validity is therefore **not novel**. Our alignment with Elisa's model is a scoring point, not a novelty claim.
- **Task-mining and demonstration tools** capture what people do, not why.
- **Entity linking with abstention** (the NIL idea) is standard in research. Applying it at cohort level over a network topology is a sensible application, not a new technique.
- **AIOps and incident-management tools** probably offer similar-incident search and AI summaries. **No product has been checked.**

**What may still differ:**
- capture with no required step
- multi-candidate scope that evidence narrows
- validity as a per-device condition
- triggers as telemetry checks the agent runs itself
- `avoid` in the assertion
- a deterministic decline and precedence
- outcome-based trust
- an honest per-trap case table

---

## 12. Building with Claude: contracts, gates and tests

We build with Claude (Fable orchestrating, Opus 5.5 building). The bottleneck is one human verifying what agents produce, so every task ends in a check the human can run in under a minute.

### 12.1 Contracts (frozen at the start; agents never edit them)

- **`contracts/assertion.schema.json`:** the shape in 5.3.
- **`contracts/topology.schema.json`:**
  - node: `id`, `type`, `model`, `install_year`, `firmware`, `site`
  - site: `id`, `name`, `region`, `access`
  - links only if Elisa confirms link data exists (13.2)
- **`contracts/predicates.md`:** the small predicate language (`attr op value`, `id == value`; `peer.attr` reserved, pending 13.2) and the evaluator's signature. Tested alone first.
- **`contracts/get_context.md`:** the signature, the filter order (5.7) and the outcome vocabulary (5.3).
- **`contracts/message.schema.json`:** author, role, timestamp, channel, thread, text, and the optional `incident`.
- **`contracts/vocabulary.md`:**
  - events: `sfp_replaced`, `dispatch_created`
  - symptoms: `link_up`, `optics_normal`, `counters_zero`, `alarms_cleared`
  - actions: `interface.bounce`, `node.reboot`, `sfp.replace`, `counters.check`, `site.access_key`
  - free text is kept in `action_text`
  - anything outside the list is `other` and never merges
  - extend the list by editing the contract, never by letting the model invent entries

### 12.2 One module per agent task, one test per module

Sequential on the spine. Only data writing, the UI pages and the slides run in parallel.

| Order | Module | Input fixture | Test asserts | Human gate (1 min) |
|---|---|---|---|---|
| 1 | `adapters/` | Elisa's `teams_chat.json`, `email.txt` | 12 messages and 1 message in contract shape | Skim the output |
| 2 | `extractor/` | the two above, plus a reworded thread ("shut / no shut") | one assertion from chat + email, with one case and two sources; `action` is `interface.bounce` for both wordings; `avoid` has `node.reboot`; the excerpt is verbatim; a chit-chat fixture yields nothing | Read the assertion |
| 3 | `predicates/` | fixture topology + a table of (predicate, entity, expected) | every row as expected | Read the table |
| 4 | `binder/` | assertion + topology | the ID resolves and lands in `evidence.cases`; candidates are the stated condition + model, firmware, install year, site, region; the ID is not a candidate; no question at capture | Read the candidates |
| 5 | `store/` | bound assertions | round trip; query by entity; one edge per candidate; Neo4j Browser shows it | Look at the graph |
| 6 | `agent/` | store + incidents on TRN-087 and TRN-101 | 087 first `ambiguous` with a question naming the site candidate; after `decided`, the proposal has "counters" and "disable", has no "reboot", and shows "1 case"; 101 declined naming the candidate; a 2018 different-model unit is `ambiguous` | Read all outputs |
| 7 | `eval/` | all scenarios | parametrized test per scenario; writes `docs/CASE_TABLE.md` | Read the table |
| 8+ | stretch modules | per Appendix A row | the row's expected behaviour | Read the output |

**Definition of done:** the test passes, the agent reports the exact command, and the human runs it and looks at the output. An agent saying "it works" does not count.

### 12.3 Rules that keep this cheap

- **All LLM calls go through one `llm.py`**, with a disk cache keyed by a hash of the prompt. Tests repeat, reruns are free, and the demo runs offline. This is the single most important rule.
- **Scenario folders.** Scenarios live in `data/scenarios/<nn>_<trap>/`, with the thread or email plus `expected.json`. One parametrized test runs over the folder, and the case table is generated, never hand-written.
- **`python demo.py`** (or `make demo`) runs the five beats in order. Rehearse and record only from it.
- **One agent per module.** Parallel agents on the same module produce drift.
- **Contracts are human-owned.** Agents never edit `contracts/`. If a contract is wrong, the human changes it and reruns the affected tests.
- **Data card.** Every generated dataset gets a line in `docs/DATA_CARD.md`.
- **The human hours.** What does not get cheaper with agents: deciding what Erkki taps, reading synthetic threads for realism, the pitch, Discord questions, and verifying every agent's output. Budget these first.

---

## 13. Relations and assumptions most teams will miss

| # | Assumption | What we do instead | Lands | Source |
|---|---|---|---|---|
| 13.1 | Bind to the device ID because it is in the text | The device is the origin of the case, not a scope candidate. Whether an ID survives a hardware replacement affects only how we describe origin devices. | model (5.4); claim pending | Deck asks: TRN-042, the model, or the install year? Hardware-swap reasoning is ours. |
| 13.2 | Scope is an attribute of the node | Scope might be one hop away (far-end SFP vendor, upstream node). If link data exists, neighbour attributes become candidates. | pending, then stretch (row 19) | Hypothesis; nothing in the data shows it |
| 13.3 | Erkki's rule is one piece of knowledge | It is a diagnostic (wide scope) plus a remedy (narrow scope). Split them so the narrow scope doesn't hide the wide one. | stretch | `use_case.md` states them separately; the scope difference is our reasoning |
| 13.4 | The trigger is a sentence to match | Telemetry checks the agent runs itself. If counters are rising, the rule doesn't apply and nobody is asked. | model (5.2), row 11 | Chat states; agents read telemetry |
| 13.5 | Validity is a date | `valid_while` evaluated per entity at t=x, if firmware rolls out per device | pending, then stretch (row 15); see 14.1 | Deck: "firmware fixes the bug"; 35:43 per-device firmware is known |
| 13.6 | `avoid` is a list of words | Each avoided action has a blast radius from the graph; the decline shows the number | stretch | "Don't reboot the whole unit"; the computation is ours |
| 13.7 | Knowledge comes only from chat | If config changes are timestamped, the fix itself is recoverable from the event stream, and the chat supplies the reasoning | pending, then stretch (row 18) | Architecture diagram; timestamps are our assumption |
| 13.8 | Every message needs a model call | Tacit knowledge announces itself ("not documented", "learned over the years", "seen this before"); a marker pre-filter is cheap and explainable | stretch | Phrases are in the material; precision untested |
| 13.9 | Reuse is triggered by alarms | Triggers are incident patterns *or* workflow steps (`dispatch_created`) | model (5.2), row 12 | `use_case.md` |
| 13.10 | A verified fix is knowledge | Trust and support are separate axes; a single-case basis is never hidden | model (5.3, 5.6) | Erkki: "several cases I've seen" |
| 13.11 | We build a knowledge base | We build one layer with edges into Elisa's graph and never modify their nodes | pitch | Abhishek's notes; recording 30:57 |

---

## 14. Open proposals (Abhishek, not yet adopted; do not build until a human moves them into the plan)

**14.1 Staleness in the spine and the video.**
- **Why:** Joni raised stale facts twice, unprompted (06:32, 09:07), and "right time validity" is a judging criterion. The agent knows per-device firmware (35:43).
- **Proposed:** build scenario 15 on our synthetic topology now, without waiting for Elisa's answer on rollout. A node gets a firmware patch; the tip stops being proposed there but still applies to its unpatched siblings. Add it as beat 6 in `demo.py`, and keep the "Stay true" video chapter.
- **Cost:** one predicate in `valid_while`, one scenario, one beat.

**14.2 Escalation-thread capture ahead of the graph search box.**
- **Why:** scenario 14 is how Joni said *he* would build it (19:35), so it will land better with Elisa than a search box.
- **Proposed:** move it to stretch position 2.

**14.3 One phone-call transcript as an input.**
- **Why:** Joni listed phone calls as an Elisa channel (13:19).
- **Proposed:** one scenario written as a call transcript, run through the same adapter. It shows a third channel at almost no cost.

**14.4 Matti's seasonal example on screen.**
- **Why:** Matti, a judge, said "during the summer this happens" (33:05).
- **Proposed:** if scenario 13 is built, it gets a short moment in the video, or a closing slide.

---

## 15. Repository

- **Layout:**
  - `contracts/`
  - `data/` (Elisa's examples in `data/elisa_examples/`, scenarios, topology, data card)
  - `adapters/`, `extractor/`, `predicates/`, `binder/`, `store/`
  - `agent/` (stand-in agent and `get_context`)
  - `eval/` (harness and case table)
  - `frontend-ui/` (mock Teams page, context map, Finland map; see its README)
  - `docs/`
  - **`HANDOFF.md` (this file)**
- **Elisa's provided files** are the extractor's fixtures. Their README says the names and IDs are illustrative, with no personal data. Commit them in `data/elisa_examples/` until Elisa answers question 8.
- **Briefing material in the repo:**
  - `TRANSCRIPT_RECORDING.md`
  - `TRANSCRIPT_RECORDING_raw.md`
  - `elisa_challenge_deck_joni.html`
- **History:** `MIKAEL_HANDOFF.md`, `ABHISHEK_HANDOFF.md`, `REVIEW_MIKAEL.md`, `REVIEW_ABHISHEK.md`. They can move to `docs/history/` once both humans agree.
- **No secrets or API keys in the repo.**

---

## Appendix A: scenario catalogue

Spine rows must pass before the freeze. Stretch rows are built only if their item is. Abhishek writes every script (no ticket numbers), and a different model expands them.

| # | Trap | Expected behaviour | Lane |
|---|---|---|---|
| 1 | Core case: Erkki's SFP rule on TRN-042, chat and email | One assertion: one case, two sources; `verified_by_outcome`; candidates are the stated condition + model, firmware, install year, site, region; no question at capture. Then a fault on TRN-087 (2018, same model, other site): `ambiguous` on site, one question in Erkki's thread, "all older units" sets `decided`, the proposal follows. | spine |
| 2 | Same rule, newer unit (TRN-101, 2023) | Declined, naming the failing candidate | spine |
| 3 | Question not yet answered; same symptoms on a 2018 unit of a different model | Ambiguous, not proposed, escalated | spine |
| 4 | Chat with no reusable rule | Nothing extracted | spine |
| 5 | A device mentioned in passing, not the subject | Not bound to that device | spine |
| 6 | Hunch rather than verified fix | Trust `hunch`; returned flagged, never as a proposal | spine |
| 7 | Same fix worked on a 2018 unit of a different model, different words ("shut / no shut on the port, came back") | Merged by key, no second assertion; model candidate eliminated, install-year candidate supported; now proposes on any 2019-or-older unit without a question | spine |
| 8 | Same symptoms, a different remedy from another expert ("swap the SFP again, it's always the optic"), no outcome | Not merged; both `disputed`; precedence picks Erkki's (verified over stated); the proposal shows the dispute; no escalation | spine |
| 9 | Same symptoms on a 2016 unit, fix did not work | Install-year candidate gets `against`; assertion goes to `review` | spine |
| 10 | Typos or nicknames in a device ID | Resolved to the right entity, or no binding | spine |
| 11 | Symptoms match but counters are rising | Trigger check fails; not proposed, nobody asked | spine |
| 12 | Barrier key email, then a dispatch to that site | Bound to the site; surfaced on the dispatch workflow step, not on an alarm | spine |
| 13 | Regional or seasonal knowledge | Bound to a region; the trigger carries the season; surfaced only there, in season | stretch |
| 14 | Knowledge arrives as a reply to the agent's own escalation | Same assertion as from a chat; no entity resolution; no question | stretch (see 14.2) |
| 15 | Firmware upgraded on one old node | No longer proposed on that node; still proposed on unpatched siblings (`valid_while`) | pending, then stretch (see 14.1) |
| 16 | Two experts disagree, both `stated`, one case each, same week | Tied on every precedence component; both `disputed`; escalated with both; nothing proposed | stretch |
| 17 | Earlier threads about TRN-019 and TRN-033 with the same symptoms | Attached as cases; the earliest sets `valid_from` | stretch: corroboration |
| 18 | Config-change event followed by recovery, no chat | Remedy recovered from the event stream; a later chat merges into it | pending, then stretch |
| 19 | All affected links share a far-end SFP vendor | Peer attribute is a candidate; node-only candidates eliminated | pending, then stretch |

Include a mix of Teams-style and email-style threads, and at least two scenarios outside the optical-module family.

---

## Appendix B: how we got here (short)

- **Two plans.**
  - Abhishek's: a triage agent with a one-tap question and a graph viewer.
  - Mikael's: an assertion pipeline with abstention, a deterministic `get_context` and evaluation.
- **The reviews** (`REVIEW_MIKAEL.md`, `REVIEW_ABHISHEK.md`) agreed they were one product:
  - Mikael's data model and pipeline as the spine
  - Abhishek's in-thread question and visible surfaces on top
- **Mikael's v5** added candidate elimination, merge-by-key and telemetry/dispatch triggers.
- **The briefing recording** confirmed:
  - no duplicates
  - advisory only
  - human interruption is acceptable
  - per-device firmware is known
  - ticketing is legacy
- **Mikael's v6** resolved the remaining contradictions:
  - trust vs support as separate axes
  - precedence on conflict
  - the device ID is not a candidate
  - the question at first use (from Abhishek's plan)
  - region in the contract
  - the demo beats equal `demo.py`
- **This file** merges v6 with Abhishek's notes, video brief, task list and remaining proposals.
