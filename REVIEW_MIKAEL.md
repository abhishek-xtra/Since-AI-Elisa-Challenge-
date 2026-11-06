# Review of both handoffs against Elisa's brief

Written Friday 6 November 2026, ~22:30. Sources read: challenge brief (docx), Joni's pitch deck with speaker notes, use_case.md, teams_chat.json, email.txt, reference_architecture.png, ABHISHEK_HANDOFF.md, MIKAEL_HANDOFF.md. Not read: the audio recording (no transcription tool available).

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

## Recommended final idea

Spine (Mikael): Teams JSON and email adapters, one LLM extraction into the assertion schema (trigger, applies_to, action, avoid, evidence excerpt, speaker role, trust, valid_from, valid_to), evidence check, bind to topology or abstain, store, `get_context(entity, event, symptoms, at_time)` with a deterministic filter, thin stand-in agent.

Surface (Abhishek): a mock Teams thread page showing the conversation, the one-tap scope question appearing in-thread, and later the notification "Erkki, your tip from 3 Nov was used on TRN-087 today". Neo4j Browser as the graph view. Abhishek designs both.

Demo (3 minutes):

1. Agent with no context proposes a reboot.
2. Feed the chat and email. One assertion appears on the graph, bound to the 2019 cohort. The question lands in the thread, Erkki taps "All".
3. New fault on TRN-087 (2018): agent proposes check counters, bounce, don't reboot, and cites Erkki.
4. Same fault on TRN-101 (2023): declined, with the reason.
5. Closer: the barrier email bound to a site. The next dispatch to that site gets the key location.

Expiry (firmware fix) and conflict (two experts) go on two slides with screenshots if built, not live.

Evidence: a case table of 8 scenarios, pass or fail with one line why. Abhishek writes the synthetic threads, which also gives you the held-out "written by someone who hasn't seen the extractor" test for free.

Cut, in order, if behind: conflict escalation, expiry, barrier closer, Neo4j (fall back to JSON + pyvis HTML), mock Teams page (fall back to a text log).

Split: Mikael builds everything in the spine. Abhishek does topology data entry, synthetic threads, the mock Teams page, slides, README, data card, demo video, and runs the Discord questions. Feature freeze Saturday 20:00.

First 12 hours:

| Hour | Who | Task | Gate |
|---|---|---|---|
| 0-1 | M | Repo skeleton. Synthetic topology JSON: about 20 nodes with model, install_year, firmware, site; 3 sites. Copy Elisa examples into `data/`. | File exists |
| 1-3 | M | Extractor: Teams JSON or email in, one assertion JSON out. Run on the provided chat and email. | One assertion, `avoid` contains reboot, excerpt is a real quote. If this fails, stop and fix it before anything else. |
| 3-4 | M | Binder: explicit ID resolves to a node; "older units" resolves to a predicate or `needs_confirmation` plus question text. | Core case abstains with a sensible question |
| 4-5.5 | M | Neo4j in Docker, write assertions and bindings with validity. Screenshot the graph. | Graph visible in the browser. If not running by hour 5, switch to JSON + pyvis. |
| 5.5-7 | M | `get_context` filter + stand-in agent. TRN-087 proposes bounce, TRN-101 declined. | The climax works end to end |
| 0-7 | A | Topology spreadsheet, 8 scenario scripts (barrier email, conflicting experts, firmware expiry, chit-chat, passing mention, typo ID, chat+email duplicate, hunch), mock Teams page design, post questions to Elisa on Discord. | Threads reviewed by M |
| 7-12 | M | Run the 8 scenarios, fill the case table, fix. | Table filled |
| 7-12 | A | Mock Teams page with question + notification, slide skeleton. | Page renders |

## Building with Claude

The team builds with Claude (Fable orchestrating, Opus 5.5 building). That shifts the bottleneck from typing to one human verifying agent output. The full framework is section 15 of `MIKAEL_HANDOFF.md`. The short form:

1. Contracts first, frozen by hour one: assertion schema, topology schema, message schema, the `get_context` signature and filter rules. Agents build against them and never edit them.
2. One module per agent task, built sequentially on the spine (adapters, extractor, binder, store, agent, eval), because each consumes the previous output. Parallel only for data writing, the mock Teams page and slides.
3. Every task ends in a test plus a one-minute human gate. An agent saying "it works" does not count.
4. All LLM calls go through one cached function keyed by prompt hash, so tests repeat, reruns are free, and the demo runs offline.
5. Scenarios are folders with an input and an `expected.json`. One parametrized test writes the case table. Never hand-write it.
6. One `demo.py` runs the five beats. Rehearse from that only.

Does Claude as builder change the cuts above? Mostly no. They were made for scope and judgment reasons (three hours of judging per team, a design flaw in the use-time tap, an unverified citation), not for typing time. Two things change: the evaluation harness comes back as the test suite, because with agents it is cheap and it is how the human keeps up; and baseline B, expiry and conflict become stretch tasks one agent can take after the spine passes, still with a slide and no demo time. What does not get cheaper: deciding what Erkki taps, reading synthetic threads for realism, the pitch, Discord questions to Elisa, and verifying each agent's output. Those are the human hours. Budget them first.

## For Abhishek's reviewer

Read `ABHISHEK_HANDOFF.md`, `MIKAEL_HANDOFF.md` (v4) and this file. Fill section 12 of the handoff independently before reading my table above, then compare. Challenge in particular: whether the mock Teams page is enough for the usability criterion or a live Slack bot is worth the risk; whether Neo4j is worth 45 minutes; and whether the cut list in section 14 of the handoff cut anything a judge would miss.

## Flags

- Graphiti/Zep: real, and the valid_at/invalid_at model is as described. Keep as prior art.
- Interloom / Fortune March 2026: I could not verify this. Drop it from the pitch unless someone checks.
- "Do not commit Elisa's files": the README says names and IDs are illustrative and no personal data is included, and the deck says "in your material". Low risk. A one-line Discord question settles it.
- Is one scope question "additional work"? The deck's word is "form". Mentors reportedly said in-thread questions are fine. Default to zero questions. The question only fires on ambiguity, and the demo should say the number out loud ("one tap, once").
- Questions for Elisa, in priority order: live presentation or video on Sunday? Shape of their graph entities (types, ID format)? Is one in-thread scope question acceptable? Is Slack acceptable for the demo?
