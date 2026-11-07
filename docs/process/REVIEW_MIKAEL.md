# Review of both handoffs against Elisa's brief

Written Friday 6 November 2026, ~22:30, against ABHISHEK_HANDOFF.md and MIKAEL_HANDOFF.md v3. Sources read: challenge brief (docx), the AI architect's pitch deck with speaker notes (now in the repo as `challenge/briefing_deck.html`), use_case.md, teams_chat.json, email.txt, reference_architecture.png. The audio recording was transcribed later; see `TRANSCRIPT_RECORDING.md`.

**Status, updated Friday 23:55.** The merged direction below still holds and `REVIEW_ABHISHEK.md` independently agreed with it. Since this review was written, `MIKAEL_HANDOFF.md` moved to v5 and is the current plan. The comparison table and the critiques are kept as the record of why; the "Recommended final idea" section has been rewritten to match v5. What changed after 22:30:

- Scope binding became a candidate set that evidence narrows (candidate elimination, no scores), instead of one predicate plus abstention. Handoff 4.3, 4.4.
- Duplicates are prevented by an exact merge key over a controlled vocabulary; cases and sources are counted separately. Handoff 4.2 step 2a, `contracts/vocabulary.md`.
- Triggers are telemetry checks, of two kinds: incident pattern or workflow step. Handoff 4.2.
- Competing facts get a deterministic precedence before escalation, because the AI architect asked for one in the briefing. Handoff 4.6.
- Claims about Elisa's network that the material does not support are in a "pending Elisa" lane, out of the spine. Handoff section 16.
- From the recording: no duplicates confirmed, advisory only, agent interruption acceptable, agent knows model and firmware per device, region and season as scope, capture inside the agent's escalation thread. Handoff section 17.
- From Abhishek's review: the Elisa review is video only (confirmed), the barrier case is in the spine, a read-only graph page replaces the searchable one for now, video-first timeline with two hard checks. Handoff 2b, 7, 8.
- From Abhishek's second review (Saturday 00:30): the device ID is the origin of a case, not a scope candidate, so capture never asks; the one question is asked at first ambiguous use in the expert's thread; trust and support are separate axes and Erkki's case is verified; precedence decides conflicts and only a tie escalates; region is in the topology contract. Handoff section 18.

## Verdict

The two plans are the same product with different emphasis. Both do capture, then an assertion with source and validity, then binding to an entity, then agent reuse. That is exactly Elisa's three-step "strong demo". The real difference is where each one spends Saturday:

- Mikael's plan spends it on correctness and evidence (predicates, abstention, deterministic filter, a 14-scenario evaluation, a RAG baseline).
- Abhishek's plan spends it on presence and surface (live Slack bot, Neo4j, Obsidian-style viewer, time slider, edit UI).

Neither fits in 36 hours with one experienced coder. The right final idea is Mikael's data model and pipeline as the spine, with Abhishek's in-thread one-tap question as the abstention path and a graph you can look at. Cut the evaluation harness to a small case table, cut the RAG baseline, cut the custom viewer.

## Comparison (Mikael's section 12)

| Criterion | Mikael v3 | Abhishek |
|---|---|---|
| Usability | Zero steps by default, at most one scope question, optional use-time tap. Strong on paper, but all input is file ingestion, so "no extra work" is told rather than shown. | Same zero-step default, plus the question appears live in the thread with a one-tap reply. The most convincing demonstration of the primary criterion, if the bot works. |
| Relevance | Explicit evidence check (every field must quote the source), "nothing extracted" is a tested outcome. Strong. | "Chit-chat, ignore" lane exists but there is no evidence check. Relies on the LLM. Medium. |
| Linking | Trigger + symptoms + `applies_to` predicate over topology attributes, abstain when ambiguous. The strongest part of either plan. | Entity binding plus a scope question. The question is good. But there is no trigger, so Erkki's advice would fire on any alarm on TRN-042, including a power fault. Weaker. |
| Agent-ready | One `get_context` tool, deterministic filter, decline with reason, escalate on conflict. Concrete, and matches "feed it back to our own agentic system". | "Deploy only when relevant" is undefined. Retrieval is by entity only. Vague. |
| Feasibility in 36h | Core pipeline: yes. Eval harness + baseline B + 14 scenarios + dev/test split: no, not with one coder. | Slack bot + Neo4j + custom viewer + time slider + edit UI are four integrations. Each is a known time sink. Not in full. |
| Demo clarity | The four beats (fail, capture, reuse, decline) are the right story. Risk: it is terminal output with no picture. | Visual, live, memorable. Risk: a pretty graph with thin assertions behind it. |
| Evidence it works | Case table is the right idea and rare at a hackathon. Overbuilt. | None planned. |
| Biggest failure | Saturday goes into evaluation; Sunday's demo looks like a script. | Saturday goes into integrations; the reuse step, which is the climax, is weak. |

Answers to Mikael's five questions:

1. Mikael's plan scores higher on the rubric as written. Linking and agent-ready are where the two differ most, and both are listed secondary criteria. Abhishek's scores higher on the primary criterion as demonstrated, because a judge sees the question land in a chat. Merge them and you cover both.
2. Combine without growing scope: Abhishek's ask lane IS Mikael's abstention path. They are one mechanism. Abhishek's confidence signals (fix confirmed, expert role, single entity, no conflict) ARE Mikael's discrete trust and binding outcomes. Abhishek's "notify the expert when used" is already in Mikael's 4.6. These are not two ideas.
3. Cut from Mikael: baseline B, dev/test split, separate generator model, scenarios 12 and 13, the use-time tap (see below). Cut from Abhishek: live Slack, custom viewer, time slider, edit UI.
4. See the build order below.
5. If Elisa confirms a live presentation at the stand, upgrade the mock Teams thread to a real Slack bot. If they say video only, never build it.

## What each plan gets wrong, specifically

Mikael's plan:

- It has grown through two AI review rounds. The decision log is almost all additions. It needs a cut pass, not a third review. The eval section alone (frozen test split, separate generator model, per-trap reporting, three baselines) is a paper, not a hackathon.
- The stand-in agent with a "default runbook" is a straw man a judge can poke at. Elisa already has agents. Keep it, but say in the pitch "this stands in for your agent; the deliverable is the tool it calls".
- The use-time tap ("worked / did not work") adds a human step. Drop it and auto-verify from outcome instead. In Erkki's own thread, "Traffic is back" is the verification. In production, the counters increasing after the bounce is the verification. Zero taps, and it uses Elisa's own event stream layer. Better story.
- No picture. Elisa's whole reference architecture is a diagram. A judge should see the assertion sitting on the graph.

Abhishek's plan:

- Assertions bound to an entity with no trigger will be retrieved for the wrong fault. The brief says a wrong link is worse than none. Adopt Mikael's `trigger` and `avoid` fields.
- Four integration surfaces for a team with one coder. Neo4j is the only one worth keeping, and only because it gives a viewer for free (Neo4j Browser), matches the brief's named technology, and matches the note "they want it to just connect to their graph DB".
- The viewer as "edge": judges review all teams in three hours. The edge is the climax, where the agent proposes "check counters, bounce, don't reboot" with Erkki's name on it. The viewer supports that. It is not the differentiator.
- A numeric "confidence score shown in the UI" contradicts the better instinct in the same section (explicit, visible signals). Show the signals, not a number.

Both plans:

- The showcase case itself is ambiguous ("older units, around 2019"), so the demo will hit the ask lane on the core case. That is good, it shows the mechanism. But decide now what Erkki answers in the demo (for example "all units of this model installed 2019 or earlier") so the reuse beat on a second old node works.
- teams_chat.json has times but no date. `valid_from` needs one. Assign a synthetic date and document it.
- Neither plan states the output to Elisa in one sentence. Suggest: "a context layer your agents query with one call, filled from chats and email with zero required steps".

## Recommended final idea (rewritten to match MIKAEL_HANDOFF.md v5)

Spine (Mikael, built by Claude agents against frozen contracts): Teams JSON and email adapters, one LLM extraction into the assertion schema with symptoms and actions mapped to a controlled vocabulary, evidence check, merge by exact key so the same knowledge in other words never becomes a second assertion, binding as a candidate set over the device's attributes and ID that later cases narrow, trust levels with outcome verification from the thread or telemetry, Neo4j store with one edge per candidate, `get_context(entity, event, symptoms, at_time)` with a deterministic filter that returns proposed, declined or ambiguous, deterministic precedence for competing facts before escalation, a thin stand-in agent, and the barrier case on a dispatch trigger.

Surface (Abhishek): a mock Teams thread page where the one-tap scope question lands and where the expert later sees "your tip from 3 Nov was used on TRN-087 today", and a read-only graph page drawing the real store for the video. Neo4j Browser is the fallback for the graph.

Demo, a video of about two minutes, every shot recorded from `demo.py`:

1. Agent with no context proposes a reboot.
2. Feed the chat and email. One assertion appears on the graph with several candidate scope edges, trust verified from "Traffic is back". The line: "We don't know if it's the year or the model. Neither does Erkki. We keep both and only speak where both hold." Nobody is asked anything.
3. New fault on TRN-087 (2018, same model, different site): the site candidate disagrees, so one question lands in Erkki's thread, he taps "All older units", and the agent proposes check counters, bounce, don't reboot, citing Erkki, one case. On screen: 12 messages, 1 assertion, 0 forms, 1 tap.
4. Same fault on TRN-101 (2023): declined, naming the failing candidate.
5. The barrier email bound to a site. The next dispatch to that site gets the key location.

Expiry, conflict, regional knowledge and capture inside the agent's own thread go on slides if built, not into the video.

Evidence: a generated case table over Appendix A of the handoff, 19 rows with a lane column, about 12 of them spine. Abhishek writes short scenario scripts, a different model expands them, Abhishek reads every thread. That is the held-out test.

Cut, in order, if behind: the graph page (Neo4j Browser), Neo4j (JSON + pyvis), the mock Teams page (text log), the barrier case last. Stretch and pending items are already optional.

Split: Mikael verifies everything in the spine. Abhishek does the topology sheet, scenario scripts, video script and storyboard by Saturday 12:00, mock Teams page, graph page, recording and edit, Discord questions. Agents draft README, data card and five slides from the video script. Feature freeze Saturday 20:00. Two hard checks: a storyboard exists by 14:00, the mock Teams page renders by 20:00.

Build order (Saturday, from the handoff section 8 and 15.2):

| When | Who | Task | Gate |
|---|---|---|---|
| 08:00-09:00 | M | Contracts frozen: assertion, topology, message, vocabulary, predicates, `get_context`. Elisa examples into `data/`. | Human-approved, then no agent edits them |
| 09:00-10:00 | M | Adapters and extractor on Elisa's chat and email plus a reworded thread. | One assertion with one case and two sources; both wordings map to `interface.bounce`; `avoid` has `node.reboot`; excerpt verbatim. Fails here: stop and fix. |
| 10:00-11:00 | M | Predicate evaluator, tested alone on a fixture table. | Every row evaluates as expected |
| 11:00-12:00 | M | Binder: candidate set, question text when candidates diverge. | Candidates include stated condition, model, firmware, site, ID; question exists for the core case |
| 12:00-13:00 | M | Neo4j in Docker, one edge per candidate. 45-minute bailout to JSON + pyvis. | Graph visible |
| 13:00-14:00 | M | `get_context` and stand-in agent. | TRN-087 proposed, TRN-101 declined naming the candidate, 2018 other-model ambiguous |
| 08:00-12:00 | A | Topology sheet with a barrier site, scenario scripts, video script and storyboard. | Storyboard exists by 14:00 |
| 14:00-20:00 | M | Barrier case, eval harness, case table, fixes. Stretch only if spine is green. | Table filled |
| 14:00-20:00 | A | Generated threads reviewed, mock Teams page, graph page. | Page renders by 20:00 |
| 20:00-23:00 | both | Record from `demo.py`. Edit. Agents draft README, data card, slides. | Video exists |

## Building with Claude

The team builds with Claude (Fable orchestrating, Opus 5.5 building). That shifts the bottleneck from typing to one human verifying agent output. The full framework is section 15 of `MIKAEL_HANDOFF.md`. The short form:

1. Contracts first, frozen by hour one: assertion schema, topology schema, message schema, the `get_context` signature and filter rules. Agents build against them and never edit them.
2. One module per agent task, built sequentially on the spine (adapters, extractor, binder, store, agent, eval), because each consumes the previous output. Parallel only for data writing, the mock Teams page and slides.
3. Every task ends in a test plus a one-minute human gate. An agent saying "it works" does not count.
4. All LLM calls go through one cached function keyed by prompt hash, so tests repeat, reruns are free, and the demo runs offline.
5. Scenarios are folders with an input and an `expected.json`. One parametrized test writes the case table. Never hand-write it.
6. One `demo.py` runs the five beats. Rehearse from that only, and record the video only from that. A judge who opens the repo must find exactly what the video shows.

Does Claude as builder change the cuts above? Mostly no. They were made for scope and judgment reasons (three hours of judging per team, a design flaw in the use-time tap, an unverified citation), not for typing time. Two things change: the evaluation harness comes back as the test suite, because with agents it is cheap and it is how the human keeps up; and baseline B, expiry and conflict become stretch tasks one agent can take after the spine passes, still with a slide and no demo time. What does not get cheaper: deciding what Erkki taps, reading synthetic threads for realism, the pitch, Discord questions to Elisa, and verifying each agent's output. Those are the human hours. Budget them first.

## For Abhishek's reviewer

`REVIEW_ABHISHEK.md` has landed and was written against v4. Its four main changes are applied in the handoff. Before Saturday morning, re-read `MIKAEL_HANDOFF.md` v5 in full, in particular 4.2 (vocabulary and merge), 4.3 and 4.4 (candidate set), section 16 (what is pending), section 17 (from the recording) and Appendix A (19 renumbered scenarios). Scenario scripts and the mock Teams page must be written against those, not against v4's single predicate. The one remaining disagreement to settle between the humans: a read-only graph page now with search as stretch (Abhishek's review), or search from the start (Mikael's preference).

## Flags

- Graphiti/Zep: real, and the valid_at/invalid_at model is as described. Keep as prior art.
- Interloom / Fortune March 2026: I could not verify this. Drop it from the pitch unless someone checks.
- "Do not commit Elisa's files": the README says names and IDs are illustrative and no personal data is included, and the deck says "in your material". Low risk. A one-line Discord question settles it.
- Is one scope question "additional work"? The deck's word is "form". Mentors reportedly said in-thread questions are fine. Default to zero questions. The question only fires on ambiguity, and the demo should say the number out loud ("one tap, once").
- Questions for Elisa, updated: live versus video is settled (video). Platform does not matter (recording 13:28). Entity types are known (recording 31:11). Still open: ID format and link data; whether IDs survive hardware replacement; whether firmware rolls out per device; whether configuration changes are timestamped in the event stream; whether one in-thread question is acceptable (recording 17:08 suggests yes). The full list is section 9 of the handoff.
