# MIKAEL_HANDOFF: Elisa "hidden knowledge" challenge, plan v6

Status as of Saturday 7 November 2026, 00:30. Deadline: Sunday 8 November 2026, 10:00 EET, via sinceai.app. Elisa reviews Sunday 10:00 to 13:00, video only. Finals at 14:00.

This file is the current plan from one team member (Mikael), written to be reviewed by a teammate and by that teammate's Claude (`ABHISHEK_HANDOFF.md`, `REVIEW_ABHISHEK.md`). The comparison is in `REVIEW_MIKAEL.md`. Sections 4 to 10 are the current plan. Sections 11, 14, 16, 17 and 18 record what changed and why. Section 15 is how we build it with Claude agents. Where an older section and section 18 disagree, section 18 wins.

---

## 1. Instructions for the reviewer (human or AI)

Read this whole file, then do the following. Be honest. Do not soften criticism to be polite, and do not defend this plan out of loyalty to it. If the other idea is better, say so.

1. **Check the plan against Elisa's rubric** (section 2). Usability is the primary criterion. Relevance, linking (right entity and right time validity), feasibility and agent-readiness come after.
2. **Fill in the comparison table in section 12** for this plan and for the other idea, with a short justification per cell.
3. **Name the strongest parts** of each idea, and the most likely way each one fails in 38 hours.
4. **Look for combinations.** Say which parts of each idea can be merged without growing the scope, and which cannot.
5. **Recommend one direction**, with a build order for the first 12 hours.
6. **Separate what you know from what you guess.** Do not invent products, papers, quotes or numbers. If unsure whether something exists, say so.
7. **Flag anything in this file that is wrong, unverified or overclaimed.**

Claims in this file fall into three groups: taken from Elisa's deck (reliable), checked by search (marked as verified), and guesses or my own reasoning (marked as such).

---

## 2. The challenge, from Elisa's deck (paraphrased)

- Elisa's goal is a highly autonomous network. AI already handles much root-cause analysis. The blocker is human context that is never captured.
- **Story 1, the locked barrier.** A device fails in Northern Finland, the AI diagnoses it correctly, an engineer is dispatched, and then a locked barrier on a private road stops the work. The key's location was in an email.
- **Story 2, node TRN-042.** A field engineer replaces an SFP. The link is up, optics are normal and alarms are cleared, but no traffic flows. An expert asks whether it is an older unit (about 2019), says not to trust the green link status on those, asks whether counters are increasing (they are at zero), and says to disable the interface, wait, enable it, and not reboot. Traffic returns. Asked whether it is documented, the expert says not that he knows of.
- **Layers.** The network is described as as-designed, as-built, as-running, as-observed, and a missing **as-experienced** context layer that explains why.
- **Reference model.** Every context assertion is bound to a graph entity and has `valid_from` and `valid_to`, with `valid_to` defaulting to "still believed true".
- **Guiding question.** How can silent metadata be collected without creating additional work for specialists? Elisa states that if a solution needs the expert to fill in a form, the expert will not.
- **Five hard problems they list:** (1) the real knowledge is about one sentence in twelve messages of chat; (2) linking, for example "these older units" could mean one node, the model, or the install year, and a wrong link is worse than none; (3) time, because advice expires; (4) trust, meaning hunch versus verified fix, disagreeing experts, who said it; (5) people, because these are colleague conversations.
- **Provided material (small):** `use_case.md`, `teams_chat.json` (the case as a 12-message Teams conversation), `email.txt` (the case as an email), and a reference architecture image. Teams are encouraged to generate more synthetic data and must document what was generated and how. No production data is needed.
- **Evaluation:** primary is **usability** (useful context captured and linked with minimal extra work, ideally from channels specialists already use, such as Teams and email). Secondary: relevance, linking, feasibility, agent-ready.
- **Strong demo (their words, paraphrased):** Erkki's case end to end. Capture from the chat or email with no separate documentation step. Link as a context assertion bound to the right entities with source and validity. Reuse: on a similar case on another old node, an agent proposes checking counters and bouncing the interface before hardware swaps or reboots.
- **Deliverables:** working demo, pitch slides, documentation, code repository.
- **Contacts:** Elisa's AI architect and the autonomous network operations team lead are at the Elisa stand and on the Since AI Discord all weekend.

Other guidance came from a kickoff talk and mentor conversations. Treat it as softer than the deck: Slack alone may be fine for a demo; synthetic site connections are fine; mentors suggested short clarifying questions inside the conversation and said talking may be easier than forms; GDPR is reportedly out of scope for this challenge. The existing network model is a graph of devices, sites and components, physical and logical.

### 2b. Submission facts (from the organiser's builder guide, checked Friday night)

- One entry per team in sinceai.app by Sunday 10:00 EET. Devpost does not count. Every member must personally accept Elisa's IP terms in the app before the entry goes through. Do this Saturday.
- Required fields: project name, submission URL, "About the project" (up to 5,000 characters), repository or demo link, "Built with", technology feedback, GenAI tools used, how generative AI is used in the project. Collect these while building.
- Optional: demo video (YouTube link or MP4, about two minutes, "strongly recommended"), pitch deck (PDF or PPTX), supporting documents (Markdown is accepted, so the handoffs and data card can go in). No ZIP files.
- The organiser's definition of a strong entry: working prototype with steps to run it, a repo with a real README, a two-minute video, a deck "only if it helps; it never replaces a working prototype".
- Elisa picks its top three from its own review 10:00 to 13:00. The top project from each of five challenges presents live at 14:00 to a cross-company jury. **The Elisa review is video only, confirmed Friday 22:20 (see `REVIEW_ABHISHEK.md`).** The video, README and repo carry everything. The organiser guide recommends about two minutes; no hard limit found.
- AI-built code is explicitly fine, with the condition "understand and verify what you ship, be ready to explain it". The test gates in section 15 are the answer to that. Say so in the README.
- Check every link logged out before submitting.

## 3. The plan in one paragraph

A pipeline that reads the conversations people already have (Teams chat and email), notices when someone states a reusable rule, and stores it as a **context assertion** with a trigger (telemetry checks the agent can run itself), a set of candidate scopes over topology attributes (install year, model, firmware, site, region), an action, an `avoid` list, and provenance, trust and validity. It requires no extra step from the expert, and capture never asks a question. One case cannot say which scope is the real one, so the system keeps every candidate, proposes only where all of them hold, and lets later cases eliminate the wrong ones. The first time a real incident lands where the candidates disagree, one short question goes into the expert's own thread, once per assertion. At the next similar failure anywhere in the graph, a thin stand-in agent receives the assertion through one `get_context` tool and proposes "check counters, bounce the interface, don't reboot", citing the source and the number of cases behind it. If the new unit fails a candidate, or the assertion has expired, the system declines deterministically and says why. If two assertions conflict, a deterministic precedence picks one and shows the dispute; only a tie goes to a human with both attached, and the agent never falls back to the default silently. Output to Elisa: one context layer their agents query with one call, filled from chats and email with zero required steps.

## 4. Design

### 4.1 Inputs

- `teams_chat.json` and `email.txt` are the primary inputs. Adapters convert them to one message format: author, timestamp, channel or thread, text. Slack or any other source can be added later without changing the rest.
- **The agent's own escalation thread is a capture channel (recording 19:35, 27:18).** Joni's preferred design for a new problem: the engineer explains it to the agent, and the explanation is captured whole with the incident's entities already known. Elisa also already lets users flag "this response was bad, the correct solution is X because Y". In both, binding has no ambiguity because the incident context is attached. The message format carries an optional `incident` field (entity IDs, event, symptoms) for this case; the extractor skips entity resolution when it is present. Demo it only if time allows; the point for the pitch is that the same assertion comes out whether the knowledge arrived in Teams, in email, or in a reply to the agent.
- **The ticketing system is legacy and is going away (recording 28:03, 30:57, 32:22).** Today discussions start from a ticket, but Joni said plainly: "we want to get rid of these ticketing systems", "we don't want any tickets anymore", "we don't want to fetch from legacy systems". So nothing in our design reads from, writes to, or keys on a ticket. The incident anchor is an event in the as-observed stream bound to a graph entity (an alarm, a dispatch, an agent escalation), never a ticket ID. In the synthetic threads, people may mention a ticket number the way they do today, and the extractor treats it as free text: it is not an entity and it never becomes a binding. The pitch line: the context layer attaches to the digital master (Joni's term for the modelled network, recording 31:04), not to the system they are retiring.
- The capture surface in the demo is a mock Teams thread page (Abhishek's), where the first-use scope question and the "your tip was used" notification appear. A live Slack bot is next-steps: the Elisa review is video only (2b).

### 4.2 Pipeline

1. **Detect.** Decide whether a conversation contains a reusable rule. Most messages produce nothing. Extract the rule in structured form: trigger, applies_to, action, avoid. The trigger is written as checks the agent can evaluate against telemetry (`counters_zero`, `link_up`, `optics_normal`), not as prose, so the agent verifies the precondition itself before proposing. Triggers are of two kinds: an incident pattern (event plus symptoms) or a workflow step (`dispatch_created` for the barrier key), because access knowledge is needed at dispatch time, not at diagnosis time.
2. **Evidence check.** Every extracted field must be supported by an excerpt that actually appears in the source. Otherwise drop the assertion.
2a. **Merge, never duplicate.** Symptoms and actions are extracted into a small controlled vocabulary (`contracts/vocabulary.md`), so "disable and enable", "bounce the port" and "shut / no shut" all become `interface.bounce`. The merge key is trigger plus canonical action, matched exactly. Same key: add the new case to the existing assertion, no second assertion, and let the new entity's attributes vote on the candidates (4.4). Same trigger, different action: not a duplicate, a conflict, both `disputed` (4.6 decides which is proposed). Different trigger, same action: separate assertions. No fuzzy matching and no human review of near-duplicates. A case is a distinct incident (entity plus time); a source is a document. Erkki's chat and email are one case with two sources, and `support` counts cases. Elisa confirmed they do not want the knowledge space to grow with duplicates (recording 14:48).
2b. **Corroborate (first stretch task).** Search the existing corpus (other threads, emails) for the same merge key and run 2a on each match, so earlier cases vote on the candidates and the earliest sets `valid_from`. Erkki says "several cases I've seen"; the system should find them.
3. **Bind.** Resolve the entities mentioned (explicit IDs, nicknames, typos) against the topology. Record the device as the origin of the case (`evidence.cases`). Build the candidate scope set (4.4) from the condition stated in the text plus the attributes of that device: model, firmware, install year, site, region. The device ID is not a scope candidate unless the text limits the rule to that unit ("only this one"). Do not choose between candidates or rank them. **Capture never asks a question.** If the text refers to attributes the topology does not have, record the candidate as unresolvable; it never matches.
4. **Time.** Set `valid_from` from the conversation date and `recorded_at` from ingestion. `valid_to` defaults to null ("still believed true"). If the text states a condition under which the rule stops applying (for example a firmware fix), store it as text in `valid_while`. Whether `get_context` evaluates it per device is pending Elisa's answer (4.5).
5. **Trust.** Record the speaker's role, and a trust level: `hunch`, `stated`, or `verified_by_outcome`. Outcome verification comes from the thread or from telemetry, never from a tap (4.6).
6. **Store.** Save the assertion as a node with one edge per candidate scope into the topology, plus edges to its sources. Neo4j in Docker; if it is not running within 45 minutes, JSON plus a pyvis HTML export. We write only to this layer and never modify Elisa's nodes.
7. **Serve** through `get_context` (4.7).

### 4.3 Assertion shape (illustrative, synthetic)

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

Vocabulary, used the same way everywhere in this file and in the code:

- `assertion.status`: `open` (candidates undecided), `decided` (expert answered or evidence left one), `disputed` (conflicts with another assertion), `review` (an outcome contradicted it).
- Query outcome from `get_context` for one entity: `proposed`, `declined` (with the failing candidate or condition), `ambiguous` (some candidates hold, some do not).
- `trust`: `hunch` (speaker hedges, or no expert role, and no outcome), `stated` (an expert states it as a rule, no observed outcome yet), `verified_by_outcome` (at least one case whose outcome was observed: a confirmation in the thread such as "Traffic is back", or telemetry recovering after the action). Trust and support are different axes: the core case is `verified_by_outcome` with support 1, and the proposal always shows the case count.

Note on scope: one case cannot say whether the rule is about the install year, the model, the firmware, the site or the region, and Erkki does not know either. So the assertion binds to every plausible attribute at once as a candidate edge with a support count, and evidence narrows the set (4.4). The device itself is the origin of the case, not a candidate. Attribute values above are placeholders for whatever the synthetic topology gives TRN-042.

### 4.4 Linking and abstention

- A wrong link is worse than none, so when in doubt the outcome is `ambiguous`, never `proposed`. Report both accuracy when it proposes and how often it stays silent.
- **Multi-candidate binding.** The scope is a set of candidate predicates over topology attributes (install year, model, firmware, site, region), not one edge. Region matters because some knowledge is not device-specific at all: "during the summer this happens", "during the snow, something happens in the region" (recording 32:59, 33:37). Such an assertion binds to a region and its trigger carries a season or weather condition. The device ID is not a candidate: it is the origin of the case, kept in `evidence.cases`. It becomes the scope only when the text or the expert's answer limits the rule to that unit. (If it were a candidate, every other device would fail it and the system would ask on every capture.) Candidates are not ranked; the intersection decides. Each candidate carries `support` and `against` counts. The stated condition from the text ("older units") is one candidate among the attributes of the device in the case. One open question for Elisa changes how far this goes, not whether it works: whether their graph has link data so that one-hop neighbour attributes can be candidates too (16.2, pending).
- **Propose only on the intersection.** On a new incident that matches the trigger, check which surviving candidates the entity satisfies. All: propose. None: decline with the failing candidates as the reason. Some: ambiguous, so ask the one-tap question or escalate. Abstention is computed, not judged.
- **Evidence narrows the set.** A corroborating case (4.2 step 2b) or a verified outcome adds `support` to the candidates its entity satisfies and `against` to the ones it does not. A candidate with `against` > 0 is eliminated. Three cases usually leave one. This replaces the contrast-based inference that v3 moved to next steps; it is counting, not inference.
- **Humans override counts.** The expert's one-tap answer sets `decided`. Other candidates stay recorded as hypotheses but are not used.
- No model-reported numeric confidence anywhere. It is poorly calibrated. Show the counts and the candidates instead.
- **What this is, and is not (for when a judge asks).** It is candidate elimination, also called version space learning: start with every hypothesis the first case allows, remove the ones each new case contradicts, propose only on what survives. It is not a random forest and not a confidence score. Nothing is weighted, nothing is random, nothing is a probability. `support` is a tally kept so it can be shown, not a score anything is thresholded on. Why this and not a learned model: (1) the output is three states, propose, decline, ask, not a number that needs a threshold, and thresholds are where wrong links come from; Joni's "a wrong link is worse than none" asks for silence under uncertainty, not a best guess. (2) Every answer is one explainable sentence: "declined because install year 2023 fails `install_year <= 2019`, supported by three cases." (3) It works at one case; statistics have nothing to say at n = 1. (4) A human answer is just a hypothesis marked `decided`, not a label to retrain on. Known weakness: it is brittle to one wrong case, since a single mislabelled failure can eliminate a true candidate. That is why a failure where every candidate held sends the assertion to `review` instead of deleting anything, and why counts are kept so a human sees "eliminated by one case against three". In the pitch call it "candidate elimination over the topology, no scores".
- **The question is asked at first ambiguous use, never at capture, at most once per assertion.** When `get_context` returns `ambiguous` for a real incident (some candidates hold for this device, some do not), the agent posts one question into the original expert's thread, naming the candidate that disagrees: "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site. All older units / only OULU-07 / no." Two or three options plus free text. The answer sets `decided`. This is the human interruption Elisa already practises (recording 17:08), it arrives with a real second case so it doubles as verification, and it is the only human action in the whole flow. Adopted from Abhishek's plan, which asked at first use from the start.

### 4.5 Time

- Expiry triggers: a stated end condition, a firmware or software change recorded in the topology, or a newer contradicting assertion.
- **Validity may be a condition, not only a date (pending).** Joni's deck says a firmware fix ends the rule. If Elisa confirms firmware is upgraded per device over time, an assertion can carry `valid_while` (a predicate such as `firmware < 5.0`) that `get_context` evaluates per entity at `at_time`, which is what their t=x cross-referencing would mean in practice. Until confirmed, the spine uses dates only and `valid_while` is stored as text. The barrier key would expire the same way when the site's lock attribute changes.
- Keep `recorded_at` (when we learned it) separate from `valid_from` (when it became true).

### 4.6 Trust, conflict and people

- Show who said it (by role by default), where, and whether it was a hunch, an expert statement, or verified.
- **Outcome verification, zero taps.** A confirmation in the thread ("Traffic is back") or counters rising after the action upgrades trust to `verified_by_outcome`. Nobody taps anything. (v3 had a use-time "worked / did not work" tap; cut, see section 14.)
- Notify the expert when their knowledge is used. This is the positive answer to Elisa's "how does it feel on the other side" point.
- **Conflict:** when two assertions apply to the same situation and disagree, mark both `disputed`. Joni asked directly how to "score or detect which one to use" (recording 09:58), so escalation alone is the floor, not the answer. Precedence is deterministic and shown with its components: `verified_by_outcome` over `stated` over `hunch`; more cases over fewer; newer `valid_from` over older. The winner is proposed with the dispute visible ("another expert says swap the SFP; not verified"). Only if still tied, **escalate to a human with both attached**. The agent never silently falls back to the default action, because the default is often what the experts warned against. No learned score. In the core material, Erkki's verified fix beats "it is always the optic".
- **"Is this knowledge good or bad" is an open problem for Elisa (recording 21:33).** They said they have no solution and asked for ideas. Our answer is the three trust levels, outcome verification from the thread or telemetry, and case counts. Say this explicitly in the pitch.
- **Ingestion policy:** use opted-in channels or resolved threads, store the excerpt and the assertion rather than the whole thread, and show only the cited excerpt. The system is advisory and never acts on the network.
- GDPR is reportedly out of scope for this challenge. Keep one line in the README on the data-handling policy.

### 4.7 The stand-in agent and the tool it uses

- The agent is one prompt with one tool call. Without context it proposes a reboot or another SFP swap; with context it proposes the bounce and cites the source. Pitch it as "this stands in for your agent; the deliverable is the tool it calls".
- It has one tool: `get_context(entity_id, event, symptoms, at_time)`. It returns a list of assertions with provenance, trust and status, after a **deterministic filter**: trigger match on event and symptoms first (the same fault can appear anywhere in the graph, so retrieval is by symptom pattern, not by device), then the candidate-set intersection against the entity's attributes, then validity at `at_time`, then trust threshold.
- The decline ("this unit is not in scope", "this assertion expired") comes from the filter, not from the model's judgment.
- The demo shows the exact input the agent receives.
- Ambiguous outcomes trigger the first-use question (4.4). Tied disputes are returned flagged and the agent escalates to a human. A disputed assertion that wins precedence is proposed with the dispute shown.

### 4.8 Effort accounting (the usability criterion)

Report honestly: extra human actions per captured assertion (zero, capture never asks), questions per assertion (at most one, at first ambiguous use), and the share of assertions that never needed a question. Say the number out loud in the video ("0 forms, 1 tap, once").

## 5. Demo beats (what `demo.py` produces; the two-minute video is cut from these and from nothing else)

1. **The failure without context.** The agent, on an old node, proposes a reboot or another SFP swap.
2. **Capture and link.** Feed in the Teams chat and the email. Twelve messages become one assertion with one case and two sources, trust `verified_by_outcome` from "Traffic is back", and several candidate scope edges into the graph. Say the line: "We don't know if it's the year or the model. Neither does Erkki. We keep both and only speak where both hold." Nobody fills in anything and nobody is asked.
3. **First use and the one question.** A new fault on TRN-087 (2018, same model, different site). `get_context` returns ambiguous because the site candidate disagrees. One question lands in Erkki's thread; he taps "All older units". The agent then proposes check counters, bounce, don't reboot, citing Erkki, one case. On screen: 12 messages, 1 assertion, 0 forms, 1 tap.
4. **Decline.** On a newer unit (TRN-101, 2023), the system declines and names the failing candidate.
5. **Barrier.** The locked-barrier email handled by the same pipeline, bound to a site. A dispatch to that site is created and the key location surfaces before anyone drives. Then Erkki's "your tip was used today" notification.

Expiry (firmware fix) and conflict (two experts) go on slides with screenshots if built, not into the video. Abhishek's video chapters must map onto these five beats; if a chapter needs a shot `demo.py` does not produce, add the beat to `demo.py` or drop the chapter.

The replay runs offline from stored results, so the demo never depends on live model calls.

## 6. Data and evaluation

### 6.1 Data

- Start from Elisa's provided case. Add a small synthetic topology (about 3 sites and 20 elements with model, install year, firmware version and site). `teams_chat.json` has times but no date, so assign a synthetic date for `valid_from` and document it.
- About twelve spine scenarios plus one per stretch item, listed in Appendix A with a lane column. Each has a hidden rule and is written as a Teams-style thread or an email. The topology needs per-node firmware and a region per site. Links between devices are pending Elisa (16.2) and are not in the contract.
- **Generate the threads with a different model from the extractor**, from scenario scripts. Abhishek writes the scripts and reads every generated thread, which also makes them the held-out test of the extractor.
- No dev/test split. At this sample size it means nothing.
- Document in the repo what was generated, how, with which prompts and models (`docs/DATA_CARD.md`).
- State plainly: this tests whether the mechanisms hold up under messy synthetic conversations, not real-world accuracy.

### 6.2 Metrics (ordered by Elisa's criteria)

1. **Usability:** extra actions per assertion, questions per conversation, share captured with zero human input.
2. **Relevance:** how much noise is rejected (messages with no rule produce nothing), and whether the planted rules were captured.
3. **Linking:** right entity and right level, validity correctness, abstention rate. Report per trap, including failures.
4. **Agent-ready:** correct proposals, wrong or out-of-scope proposals (target zero), correct declines, correct escalations on conflict.
5. **Feasibility:** latency and cost per conversation, and whether a local model could run it.

Report results as a case table (pass or fail, and why), not as percentages. At this sample size, percentages are noise.

### 6.3 Baselines

- **A: no context.** The demo opener (beat 1).
- **B: raw chats and emails in RAG.** Stretch task only, after the core passes. If built, one slide: expected failures of B are applying advice to a newer unit, using expired advice, treating a hunch as verified, binding to a device mentioned in passing.
- **C: this system.**

The headline is Elisa's own three steps (capture, link, reuse) plus the decline. Not C versus B.

## 7. Scope

**In scope (the spine):** Teams and email adapters, structured rule extraction with an evidence check and telemetry-check triggers, multi-candidate binding with the one first-use question in the expert's thread, validity dates and trust fields, a predicate evaluator over the topology, storage in Neo4j with one edge per candidate, `get_context` with a deterministic filter, deterministic precedence on conflict, thin stand-in agent, decline on a newer unit and ambiguous on a different model, **the barrier case on a dispatch trigger** (one of Elisa's two named examples; one email, one site record, the workflow-step trigger type already in 4.2), the generated case table, the data card, the mock Teams page (Abhishek), and a read-only graph page that draws the real store for the video (Abhishek; Neo4j Browser is the fallback).

**Stretch, after the spine passes, in this order:** corroboration search (4.2 step 2b, it strengthens the core demo), search box on the graph page (time slider is next-steps), marker-phrase pre-filter (16.8), split diagnostic from remedy (16.3), regional and seasonal scope (scenario 13), capture from the agent's escalation thread (scenario 14), blast radius on the avoid list (16.6), conflict escalation (scenario 16), baseline B. Each is one agent task that does not touch the spine.

**Next-steps slides only:** live Slack and other connectors, voice narration for field technicians, runbook-versus-actual-action deviation detection, question-value scoring and calibration, tree-descent retrieval over channel maps, editing assertions in the graph UI.

**Cut order if behind, inside the spine:** the graph page (fall back to Neo4j Browser), Neo4j (fall back to JSON + pyvis HTML), mock Teams page (fall back to a text log), the barrier case last. Stretch and pending items are already optional.

**Pending Elisa's answers (section 9), not built until confirmed:** per-device `valid_while` validity (16.5), one-hop neighbour candidates and link data (16.2), event-stream corroboration (16.7). The ID question (16.1) changes no code; the ID is not a scope candidate either way.

## 8. Build order and timeline

Code is written by Claude agents (section 15). Owners below are the humans who verify.

| Workstream | Owner |
|---|---|
| Contracts, extraction, binding, store, `get_context`, stand-in agent, eval harness | Mikael |
| Topology sheet, scenario scripts, video script and storyboard, mock Teams page, read-only graph page, video recording and edit, Discord questions | Abhishek |
| README, data card, five slides built from the video script | Claude agents, from the repo; Abhishek reviews |

| When | Focus |
|---|---|
| Fri night (now 23:00) | Plan agreed between the two handoffs. Post the section 9 questions on Discord. Contracts drafted (15.1) if awake, otherwise first thing Saturday |
| Fri night | Sleep |
| Sat 08:00 to 10:00 | Contracts frozen. Adapters and extractor on Elisa's chat and email, gate: one assertion, `avoid` has `node.reboot`, excerpt is verbatim, trust `verified_by_outcome`. Abhishek: topology sheet with per-node firmware and a region per site, scenario scripts |
| Sat 10:00 to 14:00 | Predicate evaluator (tested alone first), binder with candidates, Neo4j store, `get_context`, stand-in agent. Gate: TRN-087 gets the bounce, TRN-101 declined naming the candidate, a 2018 unit of another model is ambiguous. Abhishek: generated threads reviewed, mock Teams page |
| Sat afternoon | Eval harness over all scenarios, case table, fix what it reveals. Stretch tasks only if the spine is green. Abhishek: video script and storyboard locked by 12:00, graph page. **Check at 14:00: a storyboard exists. If not, stop building features and write it.** |
| Sat 20:00 | Feature freeze |
| Sat 20:00 to 23:00 | **Check at 20:00: the mock Teams page renders.** Record every beat from `demo.py` with the cached `llm.py`; nothing in the video comes from anywhere else. Abhishek edits the video. Agents draft README, data card and five slides from the video script |
| Sat night | Sleep |
| Sun morning | Bug fixes only, final case table run, submit well before 10:00 |

## 9. Risks and questions

### Risks

- The extractor may fail on messy threads. This is the biggest technical unknown, and it is untested.
- Evaluation on self-generated synthetic data may flatter the results, even with a separate generator.
- The pitch may look like "RAG with extra steps" unless the demo opens on the failure and the decline is shown.
- The stand-in agent is a simplification. A judge may question its realism. Say so in the pitch.
- The real graph schema is unknown, so the topology may not match it.
- Whether one in-thread question counts as "additional work" is uncertain. Capture never asks; at most one question per assertion, at first ambiguous use, in the expert's own thread. The recording at 17:08 suggests this is acceptable.
- With agents building, the human verifying is the bottleneck. Untested agent output that "looks done" is the main way the weekend is lost.

### Questions for Elisa (Discord, drafted Saturday 00:45; the sent text is below so answers can be recorded next to it)

Ordered by what the answer changes in the spine. 1 to 4 decide demo beats; 5 to 8 decide pending items only.

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

Answers (fill in as they arrive):

| # | Answer | Changes |
|---|---|---|
| 1 | | If no install date: the "older units" candidate becomes firmware or model; demo text in beat 2 and the TRN-101 decline change |
| 2 | | If no dispatch event: barrier beat fires on a mocked workflow step and the video says so |
| 3 | | If no: capture stays silent and ambiguous cases escalate without a question |
| 4 | | ID format in the synthetic topology; link data unlocks 16.2 |
| 5 | | Wording about origin devices only (16.1) |
| 6 | | Unlocks `valid_while` (16.5) |
| 7 | | Unlocks event-stream corroboration (16.7) |
| 8 | | Where the fixtures live |

Earlier questions now answered by the recording: platform does not matter (13:28); entity types in the graph (31:11); advisory only (34:58); GDPR out of scope (33:59). "Should historical conversations be ingested" is dropped: the recording at 14:06 says capture once we see it, and corroboration search (4.2 step 2b) covers history anyway.

## 10. Prior art

- **Graphiti and Zep (verified by search).** An open-source temporal knowledge graph engine for agent memory. Facts are graph edges with validity windows (`valid_at`, `invalid_at`) and provenance, and when a new fact contradicts an old one the old one is marked invalid rather than deleted. Time validity is therefore **not novel**. Our alignment with Elisa's own model is a scoring point, not a novelty claim.
- **Task-mining and demonstration-based tools** record screen actions and turn them into automations. They capture what people do, not why.
- **Entity linking with abstention** (the NIL idea) is standard in research. Applying it at cohort granularity over a network topology is a sensible application, not a new technique.
- **AIOps and incident-management tools:** I believe they offer similar-incident search and AI summaries, but I have **not checked any product**. Please say what you know.

What may still differ: capture with no required step, multi-candidate scope that evidence narrows instead of one guessed link, validity as a per-device condition, triggers as telemetry checks the agent runs itself, trigger and `avoid` in the assertion, a deterministic decline, outcome-based trust upgrades, and an honest per-trap case table. The pitch should say plainly that the general problem is known and focus on linking, time and trust.

## 11. Decision log: v2 to v3 (historical)

Rows marked † were reversed or replaced later: see section 14 (v3 to v4) and section 16 (v4 to v5). The current plan is sections 4 to 10.

| Change | Why | Source |
|---|---|---|
| Elisa's deck is the source of truth, usability first | The deck states the evaluation order | Elisa's deck |
| Teams and email are the main inputs, Slack optional | Provided data and stated preference | Elisa's deck |
| Elisa's assertion model with `valid_from` and `valid_to` | Matches their reference architecture | Elisa's deck |
| Trigger, `applies_to` predicate, action and `avoid` in the schema | A bound entity alone would match any failure on that device, and `avoid: reboot` is the strongest demo line | AI review of v2 |
| † Headline is C versus B, not C versus no context | Beating "no context" is nearly tautological | AI review of v2 |
| Test the extractor on messy threads first | Biggest unknown, cheapest to test | AI review of v2 |
| Discrete outcomes instead of numeric confidence | Model self-reported confidence is poorly calibrated | AI review of v2 |
| † Use-time outcome tap and expert notification | Upgrades trust with no extra work for the expert, and addresses "people" | AI review of v2 |
| Escalate on conflict instead of "propose neither" | Avoids silently reverting to the default the experts warned against | AI review of v2 |
| One `get_context` tool and a deterministic filter | Makes "agent-ready" concrete and the decline credible | AI review of v2 |
| † 12 to 16 scenarios, case table, frozen test split, hand-written threads | Smaller, less circular evaluation | AI review of v2 |
| † Contrast-based scope inference moved to next steps | The stated condition already gives the predicate, and inference from few cases looks contrived | AI review of v2 |
| † Dropped: value-of-information scoring, tree-descent retrieval, source maps, anchoring audits, voice, deviation detector, graph database | Not rewarded by the criteria, and too much for 38 hours | Both reviews |

## 12. Comparing this plan with another idea

Filled in: see `REVIEW_MIKAEL.md`. Abhishek's reviewer should fill it again independently, then compare. Template:

| Criterion (priority order) | This plan | The other idea |
|---|---|---|
| Usability: extra work for experts, works from Teams and email | | |
| Relevance of what is captured (noise rejected, rules found) | | |
| Linking: right entity, right level, right time validity, abstention | | |
| Agent-ready: how an agent consumes it, declines, escalates | | |
| Feasibility in about 38 hours with this team | | |
| Demo clarity in three minutes, including Erkki's case end to end | | |
| Evidence it works (evaluation honesty) | | |
| Biggest way it fails | | |

Then answer:

1. Which idea would score higher with Elisa's rubric, and why?
2. Which parts of each can be combined without growing the scope?
3. What would you cut from each?
4. Recommend one direction and a build order for the first 12 hours.
5. What would change your recommendation?

## 13. Repository hygiene

- Elisa's provided files (`teams_chat.json`, `email.txt`, `use_case.md`, the image) are the extractor's fixtures. Their README says names and IDs are illustrative with no personal data, and the deck calls them "your material", so the risk of committing them is low. Ask on Discord anyway; until answered, keep them in `data/elisa_examples/` and commit them.
- The repo is private. The organiser guide requires judges to open the repository link logged out, so make it public or share it with the organisers before submitting on Sunday morning. Put it on the Saturday night checklist.
- Joni's briefing deck with his speaker notes is in the repo as `elisa_challenge_deck_joni.html`. Open it in a browser; N shows the notes.
- Layout: `contracts/`, `data/` (Elisa's examples, synthetic scenarios, topology, data card), `adapters/`, `extractor/`, `binder/`, `store/`, `agent/` (stand-in agent and `get_context`), `eval/` (case table and harness), `ui/` (mock Teams page, graph page), `docs/` (handoffs, review, README).
- Document every generated dataset: what, how, with which model and prompts.
- No secrets or API keys in the repo.

---

## Appendix A: scenario catalogue

Spine rows must pass before the feature freeze. Stretch rows belong to the stretch item named and are built only if that item is. All generated threads are written as scripts by Abhishek and generated by a different model from the extractor, which makes every row a held-out test.

| # | Trap | Expected behaviour | Lane |
|---|---|---|---|
| 1 | Core case: Erkki's SFP rule on TRN-042, chat and email | One assertion, not two; one case with two sources; trust `verified_by_outcome` from "Traffic is back"; candidates are the stated condition plus model, firmware, install year, site, region; no question at capture. Then a fault on TRN-087 (2018, same model, other site): `ambiguous` on site, one question in Erkki's thread, answer "all older units" sets `decided`, proposal follows | spine |
| 2 | Same rule, newer unit (TRN-101, 2023) | Declined, naming the failing candidate | spine |
| 3 | Question not yet answered, same symptoms on a 2018 unit of a different model | Ambiguous, not proposed, escalated | spine |
| 4 | Chat with no reusable rule | Nothing extracted | spine |
| 5 | A device mentioned in passing, not the subject | Not bound to that device | spine |
| 6 | Hunch rather than verified fix | Trust `hunch`; returned flagged, never as a proposal | spine |
| 7 | Same fix worked on a 2018 unit of a different model, described in different words ("shut / no shut on the port, came back") | Merged into the existing assertion by key, no second assertion; model candidate eliminated, install-year candidate supported; now proposes on any 2019-or-older unit without a question | spine |
| 8 | Same symptoms, a different remedy stated by another expert ("swap the SFP again, it is always the optic"), no outcome | Not merged; both `disputed`; precedence (4.6) selects Erkki's assertion, verified over stated; proposal shows the dispute; no escalation because it is not a tie | spine |
| 9 | Same symptoms on a 2016 unit, fix did not work | Install-year candidate gets `against`; assertion status `review`, not silently kept | spine |
| 10 | Typos or nicknames in a device ID | Resolved to the right entity, or no binding | spine |
| 11 | Symptoms match but counters are rising | Trigger check fails; assertion not proposed, nobody asked (16.4) | spine |
| 12 | Barrier key email, then a dispatch to that site | Bound to the site; surfaced on the dispatch workflow step, not on an alarm | spine |
| 13 | Regional, seasonal knowledge ("every winter the Lapland sites lose power for a few hours, don't dispatch before checking the grid") | Bound to a region, trigger carries the season condition; surfaced on any incident in that region in winter, nowhere else | stretch: regional scope (recording 32:59) |
| 14 | Knowledge arrives as a reply to the agent's own escalation, entities already attached | Same assertion as from a chat, no entity resolution step, no question needed | stretch: escalation capture (recording 19:35) |
| 15 | Firmware upgraded on one old node | No longer proposed on that node, still proposed on its unpatched siblings (`valid_while`) | pending Elisa (16.5), then stretch |
| 16 | Two experts disagree, both `stated`, one case each, same week | Tied on every precedence component; both `disputed`; escalated to a human with both attached, nothing proposed | stretch: conflict |
| 17 | Earlier threads about TRN-019 and TRN-033 with the same symptoms | Attached as sources; source count 3; earliest sets `valid_from` | stretch: corroboration |
| 18 | Config-change event followed by recovery, no chat | Remedy recovered from the event stream alone; a later chat merges into the same assertion | pending Elisa (16.7), then stretch |
| 19 | All affected links share a far-end SFP vendor | Peer attribute is a candidate; node-only candidates eliminated by row 7-style evidence | pending Elisa (16.2), then stretch |

Include a mix of Teams-style and email-style, and at least two scenarios outside the optical-module family to show generality.

---

## 14. Cuts after review (Friday 6 November, 22:30)

Applied inline in sections 4 to 10 and Appendix A. This table is the record of what changed from v3. Reasoning is in `REVIEW_MIKAEL.md`.

| Cut | Was in | Replacement |
|---|---|---|
| Baseline B (raw-chat RAG) | 6.3, 5 | Keep the no-context opener as demo beat 1. B is a stretch task after the core passes, one slide at most. |
| Frozen dev/test split | 6.1 | None. Meaningless at 8 to 10 scenarios. |
| v3 scenarios "near-duplicate merge" and "later narrowing" | Appendix A | Dropped. Chat + email becoming one assertion stays, it is the provided material (now part of row 1). Appendix A was renumbered in v5. |
| Use-time "worked / did not work" tap | 4.6 | Auto-verify from outcome: a confirmation message in the thread ("Traffic is back") or counters rising after the action upgrades trust to `verified_by_outcome`. Zero taps. |
| Full default runbook in the stand-in agent | 4.7 | One prompt, one tool call. Without context it says reboot; with context it says bounce and cites the source. Pitch it as "stands in for your agent; the deliverable is the tool". |
| "Applies to N of M devices" indicator, question-count logging | 4.4 | Dropped. |
| Interloom prior art | 10 | Dropped, unverified. One line on Graphiti/Zep stays. |
| Custom linked view | 7 | Cut in v4. Came back in v5 as a read-only graph page drawing the real store, for the video only (section 7); Neo4j Browser or a pyvis export is the fallback. |

Kept because each is a scoring line in Elisa's rubric: assertion schema with `trigger` and `avoid`, evidence check, binding with abstention, `valid_from` / `valid_to`, trust levels, deterministic `get_context`, decline on a newer unit, conflict handling (precedence, escalation on a tie), the barrier case (spine since v5).

Added from Abhishek's plan: the one-tap scope question appears inside a mock Teams thread page, and the expert gets a "your tip was used today" notification. That page is Abhishek's.

## 15. Building with Claude: contracts, gates and tests

We build with Claude (Fable orchestrating, Opus 5.5 building). The bottleneck is no longer typing. It is one human verifying what agents produce. So every task must end in a check the human can run in under a minute.

### 15.1 Contracts first (hour 0 to 1, human-approved, then frozen)

Agents build against these and never edit them.

- `contracts/assertion.schema.json`: the shape in section 4.3.
- `contracts/topology.schema.json`: node with `id`, `type`, `model`, `install_year`, `firmware`, `site`; site with `id`, `name`, `region`, `access`. Links with far-end attributes are added only if Elisa confirms link data exists (16.2, pending).
- `contracts/predicates.md`: the small predicate language used by candidates (`attr op value`, `id == value`; `peer.attr` reserved, pending 16.2), and the evaluator's signature. Tested alone before anything uses it.
- `contracts/get_context.md`: `get_context(entity_id, event, symptoms, at_time) -> list[Assertion]` plus the filter order (trigger match on event and symptoms, candidate intersection against the entity, `valid_while` and dates at `at_time`, trust threshold) and the per-entity outcome vocabulary from 4.3 (`proposed`, `declined`, `ambiguous`).
- `contracts/message.schema.json`: the one message format adapters produce (author, role, timestamp, channel, thread, text).
- `contracts/vocabulary.md`: the controlled lists the extractor must map into: events (`sfp_replaced`, `dispatch_created`), symptoms (`link_up`, `optics_normal`, `counters_zero`, `alarms_cleared`), actions (`interface.bounce`, `node.reboot`, `sfp.replace`, `counters.check`, `site.access_key`). Free text is kept alongside in `action_text`. Anything outside the list is extracted as `other` with its text and never merges. Extend the list by editing the contract, not by letting the model invent entries.

### 15.2 One module per agent task, one test per module

Build order is sequential on the spine because each module consumes the previous one's output. Only data writing, the mock Teams page and slides run in parallel.

| Order | Module | Input fixture | Test asserts | Human gate (1 minute) |
|---|---|---|---|---|
| 1 | `adapters/` | Elisa's `teams_chat.json`, `email.txt` | 12 messages and 1 message in contract shape | Skim the output |
| 2 | `extractor/` | the two above, plus a reworded thread ("shut / no shut") | exactly one assertion from chat plus email, with one case and two sources; `action` is `interface.bounce` for both wordings; `avoid` contains `node.reboot`; `evidence.excerpt` is a verbatim substring of the source; chit-chat fixture yields nothing | Read the assertion |
| 3 | `predicates/` | fixture topology + a table of (predicate, entity, expected) | every row evaluates as expected, including `id ==` | Read the table |
| 4 | `binder/` | assertion + topology | explicit ID resolves to the node and lands in `evidence.cases`; candidate set is the stated condition plus the device's model, firmware, install year, site and region; the ID is not a candidate; no question is generated at capture | Read the candidates |
| 5 | `store/` | bound assertions | round trip; query by entity returns them; one edge per candidate; Neo4j Browser shows the graph | Look at the graph |
| 6 | `agent/` | store + incidents on TRN-087 (2018, same model, other site) and TRN-101 (2023) | 087 first returns `ambiguous` with a question string naming the site candidate; after `decided` the proposal contains "counters" and "disable" and not "reboot" and shows "1 case"; 101 is declined naming the failing candidate; a 2018 unit of a different model is `ambiguous`, not proposed | Read all outputs |
| 7 | `eval/` | all scenarios | parametrized test per scenario; writes `docs/CASE_TABLE.md` | Read the table |
| 8+ | stretch modules | per Appendix A row | the row's expected behaviour; for corroboration also that a chit-chat thread about TRN-042 is not attached | Read the output |

Definition of done for every task: the test passes, the agent reports the exact command to run, the human runs it and looks at the output. An agent's claim that it works does not count.

### 15.3 Rules that keep this cheap

- **All LLM calls go through one `llm.py` with a disk cache keyed by a hash of the prompt.** Tests are then repeatable, reruns cost nothing, and the demo runs offline from the cache. This is the single most important rule.
- Generate the synthetic threads with a different model from the extractor. It is one model string, so it is free. Abhishek reads every thread anyway.
- Scenarios live in `data/scenarios/<nn>_<trap>/` with `thread.json` or `email.txt`, `expected.json` (which fields the assertion must contain, what the agent must and must not say, expected bind outcome). The eval test is one parametrized function over that folder. The case table is generated, never hand-written.
- `make demo` (or `python demo.py`) runs the five beats in order and prints or renders each. Rehearse from that, and **record the video only from that**, with the cached `llm.py`. If a shot cannot be produced by `demo.py`, it is not in the video. A judge who opens the repo must find exactly what the video shows.
- Agents do not edit `contracts/`. If a contract is wrong, the human changes it and reruns the affected tests.
- One agent per module. Parallel agents on the same module produce drift the human then has to reconcile, which is slower than sequential.
- Every generated dataset gets a line in `docs/DATA_CARD.md`: what, how, which model, which prompt. The brief requires this.

### 15.4 Does Claude as builder change the cuts?

Mostly no. The cuts in section 14 were made for scope and judgment reasons, not typing time: a judge has three hours for every team, the use-time tap is a design choice, Interloom is unverified. Two things change:

- The evaluation harness comes back, but as the test suite in 15.2, not as a research artefact. With agents it is cheap and it is the only way the human keeps up.
- Baseline B and the expiry and conflict scenarios become stretch tasks that one agent can take after the core passes, because they do not touch the spine. They still do not get demo time beyond a slide.

What does not get cheaper: deciding what Erkki taps in the demo, reading synthetic threads for realism, the pitch narrative, Discord questions to Elisa, and verifying every agent's output. Those are the human's hours. Budget them first.
## 16. Relations and assumptions most teams will miss

Added Friday night from Mikael's notes and discussion. Each item names where it lands: model (in the spine now), stretch (one agent task after the spine passes), or pitch (a sentence, no code). The source column follows the rule in section 1: what the material supports, and what is my own reasoning. Items 16.1 and 16.5 rest on practices I believe are standard but have not verified for Elisa; they are on the question list in section 9.

| # | Assumption or missed relation | What we do instead | Lands | Source |
|---|---|---|---|---|
| 16.1 | Bind to the device ID because it is in the text | The device is the origin of the case, not a scope candidate. Whether an ID survives a hardware replacement at Elisa is unknown; it affects only how we talk about origin devices. | model (4.4); the claim is pending Elisa | Deck asks whether the scope is TRN-042, the model or the install year. Everything about hardware swaps is my reasoning, unverified. |
| 16.2 | Scope is an attribute of the node | Scope might be one hop away (far-end SFP vendor, upstream node). If Elisa's graph has link data, neighbour attributes become candidates like any other. | pending Elisa, then stretch (scenario 19) | Mentor notes: the model is a graph of devices, sites and components. That a far-end attribute could be the real scope is a hypothesis; nothing in the data shows it. |
| 16.3 | Erkki's rule is one piece of knowledge | It is two: a diagnostic (UP + optics OK + counters zero means forwarding state, not SFP) with wide scope, and a remedy (bounce, do not reboot) with narrow scope. Stored together, the narrow scope hides the wide one. Split them. | stretch | use_case.md states the diagnostic and the remedy as separate sentences. That their scopes differ is my reasoning. |
| 16.4 | The trigger is a sentence to match | The trigger is a set of telemetry checks the agent runs itself. If counters are rising, the assertion does not apply and nobody is asked. | model (4.2), scenario 11 | Chat gives observable states; deck says agents read topology and telemetry. |
| 16.5 | Validity is a date | Joni's deck says a firmware fix ends the rule. If firmware is upgraded per device over time, validity is better expressed as a condition evaluated per entity at t=x (`valid_while`). Until confirmed, the spine uses dates. | pending Elisa, then stretch (scenario 15) | Deck: "Firmware fixes the bug, when does it stop being true?" Recording 35:37: the agent knows each device's exact model and firmware number, and 33:15 names "a certain software release" as a hidden-knowledge example. Half confirmed. Whether rollout is staggered per device is still unverified. |
| 16.6 | `avoid` is a list of words | Each avoided action has a blast radius computable from the graph: rebooting a transmission node affects every downstream site. The decline shows the number. | stretch | Erkki: "Don't reboot the whole unit unless that fails." Downstream computation is my reasoning. |
| 16.7 | Knowledge comes only from chat | If config changes are timestamped in the event stream, the fix itself (shutdown at 09:24, recovery at 09:25) is recoverable from telemetry, and the chat supplies the reasoning. | pending Elisa, then stretch (scenario 18) | Diagram: as-observed layer, record time = event time, runtime layer holds CM data. That config changes are logged with timestamps is my assumption, unverified. |
| 16.8 | Every message needs a model call to detect knowledge | Tacit knowledge announces itself: "not documented", "learned over the years", "those older ones", "usually", "seen this before". A marker pre-filter is cheaper, explainable, and the brief's own chat ends with the strongest marker. | stretch | The phrases are in the chat and email. That they are high precision in general is untested. |
| 16.9 | Reuse is triggered by alarms | The barrier key is needed when a dispatch is created. Triggers are incident patterns or workflow steps. | model (4.2), scenario 12 | use_case.md: engineer dispatched, then blocked at the barrier. |
| 16.10 | A verified fix is knowledge | Trust and support are separate axes. One verified case is `verified_by_outcome` with support 1, and the proposal always shows the case count ("worked once, on TRN-042"). Corroboration raises support. A single-case basis is never hidden. | model (4.3, 4.6) | Erkki relies on count himself: "several cases I've seen". The coincidence argument is mine. |
| 16.11 | We build a knowledge base | We build one layer with edges into Elisa's graph and never modify their nodes. | pitch | Abhishek's notes, and recording 30:57 to 32:38: a graph database modelling the whole network (devices, sites, physical components, logical configuration data) is the thing to bind to; they want to get rid of ticketing systems; workflows rely on that model. |

## 17. From the recording (transcribed Friday night, see `TRANSCRIPT_RECORDING.md`)

Confirmed: no duplicates, check whether a fact already exists (14:48, now 4.2 step 2a). Advisory only, no actions on the network (34:58). Human interruption by the agent is acceptable and is current practice (17:08). The agent knows each device's model and firmware (35:37). The graph holds devices, sites, physical components and logical configuration data (31:11). Platform does not matter (11:37, 13:28). Synthetic topology is expected (26:19). GDPR out of scope for the weekend (33:59). Joni is at the stand Saturday (36:08).

Changed the plan: capture inside the agent's escalation thread as a channel (4.1). Deterministic precedence for competing facts before escalation (4.6). Region and season as scope and trigger (4.4, scenario 13). "Good or bad knowledge" named as Elisa's open problem and answered in the pitch (4.6). The ticketing system is legacy and nothing keys on it; incidents are anchored to graph entities and events (4.1).

Still pending, not in the recording: ID across hardware replacement (16.1), link data (16.2), timestamps on configuration changes (16.7).

## 18. Resolved contradictions (Saturday 00:30, from Abhishek's second review)

These decide what the core tests expect. Where an older section still disagrees, this section wins.

| # | Contradiction | Decision |
|---|---|---|
| 18.1 | Is Erkki's tip `stated` or `verified_by_outcome`, and is one verified case still a hunch? | Trust and support are separate axes. "Traffic is back" is an observed outcome, so the core case is `verified_by_outcome` with support 1. The proposal always shows the case count. 16.10 reworded; 4.3 JSON fixed. |
| 18.2 | Conflict: precedence rule in 4.6 versus "always escalate" in Appendix A and "conflict-ranking rule" in next-steps | Precedence wins. Erkki's verified fix beats "always the optic" and is proposed with the dispute shown. Escalate only on a tie. Rows 8 and 16 rewritten, next-steps entry removed. |
| 18.3 | The device ID as a candidate forces a question on every capture; question at capture (Mikael) versus at first use (Abhishek) | The ID is the origin of the case, not a scope candidate, unless the text limits the rule to that unit. Capture never asks. The one question is asked at first ambiguous use, in the expert's thread, at most once per assertion. Abhishek's version adopted. Sections 3, 4.2, 4.3, 4.4, 4.8, 5, Appendix A row 1, 15.2 rows 4 and 6 updated. |
| 18.4 | 6.1 wanted links; 15.1 said links are pending; region was used but not in the contract | Links are pending and out of 6.1. Region added to the site in the topology contract and to the candidate list everywhere. |
| 18.5 | Section 5 was a three-minute demo with the barrier as a closer; the video is two minutes in chapters; `demo.py` must produce every shot | Section 5 is now the five `demo.py` beats, with the barrier as a full beat and the first-use question inside beat 3. Abhishek's chapters map onto these beats or add a beat. |
| 18.6 | "How low to rank the ID candidate" versus "candidates are not ranked" | Resolved by 18.3; the ID is not a candidate. |
| 18.7 | Stale lines | Live Slack bot is next-steps outright (video confirmed). Duplicates confirmed from the recording. "Digital master" is Joni's term. The duplicated intro before section 16 removed. Region added to section 3. Section 14 marks the graph view as returned. The Slack question removed from section 9. |
