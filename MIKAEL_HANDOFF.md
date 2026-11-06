# MIKAEL_HANDOFF: Elisa "hidden knowledge" challenge, plan v4 (v3 + cuts in section 14, Claude build framework in section 15)

Status as of Friday 6 November 2026. Deadline: Sunday 8 November 2026, 10:00, via the Since AI app. Elisa reviews Sunday 10:00 to 13:00.

This file is the current plan from one team member (Mikael), written to be reviewed by a teammate and by that teammate's Claude, who will compare it against a different idea. It has been through two rounds of review by another AI. Section 11 records what changed and why.

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

## 3. The plan in one paragraph

A pipeline that reads the conversations people already have (Teams chat and email), notices when someone states a reusable rule, and stores it as a **context assertion** with a trigger (the situation), an `applies_to` predicate over topology attributes, an action, an `avoid` list, and provenance, trust and validity. It requires no extra step from the expert. It binds to the right entity at the right level or abstains. At the next similar failure, a stand-in agent that would normally follow its default runbook (replace SFP, check optics, reboot, RMA) instead receives the assertion through one `get_context` tool and proposes "check counters, bounce the interface, don't reboot", citing the source. If the new unit is outside the predicate, or the assertion has expired, the system declines deterministically and says why. If two assertions conflict, it escalates to a human with both attached and never falls back to the default silently.

## 4. Design

### 4.1 Inputs

- `teams_chat.json` and `email.txt` are the primary inputs. Adapters convert them to one message format: author, timestamp, channel or thread, text. Slack or any other source can be added later without changing the rest.
- An optional live Slack bot is a demo veneer only, not on the critical path.

### 4.2 Pipeline

1. **Detect.** Decide whether a conversation contains a reusable rule. Most messages produce nothing. Extract the rule in structured form: trigger, applies_to, action, avoid.
2. **Evidence check.** Every extracted field must be supported by an excerpt that actually appears in the source. Otherwise drop the assertion.
3. **Bind.** Resolve the entities and attributes mentioned (explicit IDs, nicknames, typos, phrases like "older units") against the topology. Choose the smallest level the evidence supports: device, model, install-year cohort, or site. If the text refers to attributes the topology does not have, or two levels fit equally well, abstain and mark the assertion `needs_confirmation`. An abstained assertion is stored but never proposed.
4. **Time.** Set `valid_from` from the conversation date and `recorded_at` from ingestion. `valid_to` defaults to null ("still believed true"), and is set when the text states an end condition (for example until a firmware fix).
5. **Trust.** Record the speaker's role, and a trust level: `hunch`, `stated`, or `verified_by_outcome`.
6. **Store.** Save the assertion attached to the topology entities or predicate. SQLite or an in-memory structure is enough. A graph database is not needed for the demo.
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
    "predicate": "install_year <= 2019",
    "basis": "stated by expert: 'older units, around 2019'",
    "status": "needs_confirmation"
  },
  "action": "disable the interface, wait, enable it",
  "avoid": ["reboot", "replace the SFP again"],
  "evidence": {
    "sources": ["teams:thread-001", "email:001"],
    "excerpt": "Disable the interface, wait, enable it. Don't reboot.",
    "said_by_role": "expert"
  },
  "trust": "stated",
  "recorded_at": "2026-11-06T00:00:00Z",
  "valid_from": "2026-11-01T00:00:00Z",
  "valid_to": null,
  "end_condition": null
}
```

Note on the predicate: the deck says "older units, around 2019", which does not define an exact range. Do not invent one. That ambiguity is exactly what the abstain and confirm logic is for.

### 4.4 Linking and abstention

- A wrong link is worse than none, so prefer abstaining. Report both accuracy when it answers and the abstention rate.
- Outcomes are discrete: `bound`, `narrowed`, `abstained`. Do not use model-reported numeric confidence, which is poorly calibrated.
- Ask a short question only if two interpretations would produce different agent behaviour on the demo topology (for example "TRN-042 only" versus "all units installed 2019 or earlier"). Offer two or three options plus free text. At most one question per conversation, and log how many are asked.
- Optional cheap indicator: "this assertion applies to N of M devices" computed from the predicate.
- Contrast-based scope inference (comparing cases where the fix worked and where it was not needed) is a next-steps item, not part of the core.

### 4.5 Time

- Expiry triggers: a stated end condition, a firmware or software change recorded in the topology, or a newer contradicting assertion.
- Keep `recorded_at` (when we learned it) separate from `valid_from` (when it became true).

### 4.6 Trust, conflict and people

- Show who said it (by role by default), where, and whether it was a hunch, an expert statement, or verified.
- **Use-time confirmation.** When an engineer receives a proposal and acts on it, one tap records "worked" or "did not work". A success upgrades trust to `verified_by_outcome`. A failure flags the assertion for review. The original expert does nothing extra.
- Notify the expert when their knowledge is used. This is the positive answer to Elisa's "how does it feel on the other side" point.
- **Conflict:** when two assertions apply to the same situation and disagree, mark both `disputed` and **escalate to a human with both attached**. Never let the agent silently fall back to the default action, because the default is often what the experts warned against.
- **Ingestion policy:** use opted-in channels or resolved threads, store the excerpt and the assertion rather than the whole thread, and show only the cited excerpt. The system is advisory and never acts on the network.
- GDPR is reportedly out of scope for this challenge. Keep one line in the README on the data-handling policy.

### 4.7 The stand-in agent and the tool it uses

- The agent follows a realistic default runbook: replace SFP, check optics, reboot, RMA.
- It has one tool: `get_context(entity_id, event, symptoms)`. It returns a list of assertions with provenance, trust and status, after a **deterministic filter** over the trigger match, the predicate against the topology, validity dates, and trust threshold.
- The decline ("this unit is not in scope", "this assertion expired") comes from the filter, not from the model's judgment.
- The demo shows the exact input the agent receives.
- Disputed or abstained items are returned flagged, and the agent's rule is to escalate to a human in that case.

### 4.8 Effort accounting (the usability criterion)

Report honestly: extra human actions per captured assertion (target zero by default), questions per conversation, the share of assertions captured with no human input, and the optional use-time taps.

## 5. Demo (about three minutes, four beats plus a closer)

1. **The failure without context.** The agent follows its default runbook on an old node and proposes a reboot or another SFP swap.
2. **Capture and link.** Feed in the Teams chat and the email. Twelve messages become one assertion, bound at the right level, with source, speaker role, trust and validity. Nobody fills in anything.
3. **Reuse.** On another old node, the agent receives the assertion through `get_context` and proposes the bounce, citing the source, and avoiding the reboot.
4. **Decline.** On a newer unit, the system declines and says why. Show one expiry example in a few seconds (a firmware change makes the assertion stop applying).
5. **Closer (15 seconds).** The locked-barrier story handled by the same pipeline, bound to a site entity.

Also show the comparison table (section 6.3): the same failures through raw-chat RAG versus this system. Present it as a slide, not as a competing opener, because Elisa expects capture, link, reuse.

The replay runs offline from stored results, so the demo never depends on live model calls.

## 6. Data and evaluation

### 6.1 Data

- Start from Elisa's provided case. Add a small synthetic topology (about 10 sites and 40 elements with model, install year, firmware version and site).
- 12 to 16 scenarios, listed in Appendix A. Each has a hidden rule and is written as a Teams-style thread or an email.
- **Generate the threads with a different model from the extractor**, from scenario scripts. Read every generated thread by hand. Add at least two threads written by a teammate who has not seen the extractor.
- Split into dev and test before tuning. Freeze the test split.
- Document in the repo what was generated, how, with which prompts and models.
- State plainly: this tests whether the mechanisms hold up under messy synthetic conversations, not real-world accuracy.

### 6.2 Metrics (ordered by Elisa's criteria)

1. **Usability:** extra actions per assertion, questions per conversation, share captured with zero human input.
2. **Relevance:** how much noise is rejected (messages with no rule produce nothing), and whether the planted rules were captured.
3. **Linking:** right entity and right level, validity correctness, abstention rate. Report per trap, including failures.
4. **Agent-ready:** correct proposals, wrong or out-of-scope proposals (target zero), correct declines, correct escalations on conflict.
5. **Feasibility:** latency and cost per conversation, and whether a local model could run it.

Report results as a case table (pass or fail, and why), not as percentages. At this sample size, percentages are noise.

### 6.3 Baselines

- **A: no context.** Shown as one line, and as the demo opener. It proves little by itself.
- **B: raw chats and emails in RAG.** This is the informative comparison. Expected failures of B: applies advice to a newer unit, uses expired advice, treats a hunch as a verified fix, binds to a device mentioned in passing.
- **C: this system.**

The headline result is C versus B on the traps.

## 7. Scope

**In scope:** Teams and email adapters, structured rule extraction with an evidence check, binding with abstention, validity and trust fields, storage keyed to the topology, `get_context` with a deterministic filter, stand-in agent, decline and expiry and conflict-escalation cases, the case table, documentation of the synthetic data, a minimal linked view of assertions on the topology.

**Next-steps slides only:** live Slack and other connectors, voice narration for field technicians, runbook-versus-actual-action deviation detection, contrast-based scope inference, question-value scoring and calibration, tree-descent retrieval over channel maps, a general conflict-ranking rule, a full graph UI.

**Cut order if behind:** the graph or linked view, then the expiry example, then the locked-barrier closer.

## 8. Build order and timeline

Fill in owners once the team agrees.

| Workstream | Owner |
|---|---|
| Extraction and binding | |
| Topology, store, `get_context` and the stand-in agent | |
| Scenarios, data generation and evaluation | |
| Demo, slides, documentation and repo | |

| When | Focus |
|---|---|
| Fri evening | Read the material, agree scope, assign owners, set up the repo and a minimal topology, ask Elisa the questions in section 9 |
| Fri night | **First, test the extractor on 8 to 10 deliberately messy threads** (a thread with no rule, a passing mention, a hunch, a typo). If it fails here, nothing downstream matters. Then build the thin slice on Erkki's case: chat and email in, assertion out, stand-in agent proposes |
| Fri night | Sleep |
| Sat morning | Write the scenario scripts, generate threads with a separate model, build the evaluation harness, add abstention |
| Sat afternoon | Decline, expiry, trust fields, conflict escalation, linked view |
| Sat evening | Fix what the case table reveals. Feature freeze around 22:00 |
| Sat night | Slides, documentation and data card, backup demo video, one rehearsal |
| Sat night | Sleep |
| Sun morning | Bug fixes only, final evaluation run, submit well before 10:00 |

## 9. Risks and questions

### Risks

- The extractor may fail on messy threads. This is the biggest technical unknown, and it is untested.
- Evaluation on self-generated synthetic data may flatter the results, even with a separate generator.
- The pitch may look like "RAG with extra steps" unless the demo opens on the failure and shows C versus B.
- The stand-in agent is a simplification. A judge may question its realism.
- The real graph schema is unknown, so the topology may not match it.
- Whether an optional use-time tap counts as "additional work" is uncertain.
- Scope may still be too large for the team's size and skills.

### Questions for Elisa (stand or Discord)

- Is Teams plus email the expected input, or is a Slack demo also acceptable?
- Should historical conversations be ingested, or only new ones?
- Can we see the real shape of the graph (entity types and IDs), so our topology matches?
- During the review window, do teams present live?
- Is one optional confirmation tap acceptable under "no additional work"?

## 10. Prior art

- **Graphiti and Zep (verified by search).** An open-source temporal knowledge graph engine for agent memory. Facts are graph edges with validity windows (`valid_at`, `invalid_at`) and provenance, and when a new fact contradicts an old one the old one is marked invalid rather than deleted. Time validity is therefore **not novel**. Our alignment with Elisa's own model is a scoring point, not a novelty claim.
- **Interloom (reported by Fortune, March 2026).** Builds a "context graph" from support emails, tickets, call transcripts and work orders, reportedly at several large European companies. Its headline figures are company claims and are not used in our pitch.
- **Task-mining and demonstration-based tools** record screen actions and turn them into automations. They capture what people do, not why.
- **Entity linking with abstention** (the NIL idea) is standard in research. Applying it at cohort granularity over a network topology is a sensible application, not a new technique.
- **AIOps and incident-management tools:** I believe they offer similar-incident search and AI summaries, but I have **not checked any product**. Please say what you know.

What may still differ: capture with no required step, binding to a fixed topology with explicit abstention, trigger and `avoid` in the assertion, a deterministic decline, use-time trust upgrades, and honest per-trap evaluation against raw-chat RAG. The pitch should say plainly that the general problem is known and focus on linking, time and trust.

## 11. Decision log: what changed from earlier versions

| Change | Why | Source |
|---|---|---|
| Elisa's deck is the source of truth, usability first | The deck states the evaluation order | Elisa's deck |
| Teams and email are the main inputs, Slack optional | Provided data and stated preference | Elisa's deck |
| Elisa's assertion model with `valid_from` and `valid_to` | Matches their reference architecture | Elisa's deck |
| Trigger, `applies_to` predicate, action and `avoid` in the schema | A bound entity alone would match any failure on that device, and `avoid: reboot` is the strongest demo line | AI review of v2 |
| Headline is C versus B, not C versus no context | Beating "no context" is nearly tautological | AI review of v2 |
| Test the extractor on messy threads first | Biggest unknown, cheapest to test | AI review of v2 |
| Discrete outcomes instead of numeric confidence | Model self-reported confidence is poorly calibrated | AI review of v2 |
| Use-time outcome tap and expert notification | Upgrades trust with no extra work for the expert, and addresses "people" | AI review of v2 |
| Escalate on conflict instead of "propose neither" | Avoids silently reverting to the default the experts warned against | AI review of v2 |
| One `get_context` tool and a deterministic filter | Makes "agent-ready" concrete and the decline credible | AI review of v2 |
| 12 to 16 scenarios, case table, frozen test split, hand-written threads | Smaller, less circular evaluation | AI review of v2 |
| Contrast-based scope inference moved to next steps | The stated condition already gives the predicate, and inference from few cases looks contrived | AI review of v2 |
| Dropped: value-of-information scoring, tree-descent retrieval, source maps, anchoring audits, voice, deviation detector, graph database | Not rewarded by the criteria, and too much for 38 hours | Both reviews |

## 12. Comparing this plan with another idea

Fill in one row per criterion for each idea. Use short justifications and be critical.

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

- Do not commit Elisa's provided files (`teams_chat.json`, `email.txt`, `use_case.md`, the image) to a public repository without checking their terms. This file only summarises them.
- Suggested layout: `data/` (synthetic scenarios and the topology, with a data card), `extractor/`, `store/`, `agent/` (stand-in agent and `get_context`), `eval/` (case table and harness), `docs/` (this file, the pitch, the README).
- Document every generated dataset: what, how, with which model and prompts.
- No secrets or API keys in the repo.

---

## Appendix A: scenario catalogue (target 12 to 16, about two per trap)

| # | Trap | Expected behaviour |
|---|---|---|
| 1 | Core case: Erkki's SFP rule, older node | Assertion captured and bound; proposed on another old node |
| 2 | Same rule, newer unit | Declined with a reason |
| 3 | "These older units", scope ambiguous | Abstain and mark `needs_confirmation`; never proposed |
| 4 | Chat with no reusable rule | Nothing extracted |
| 5 | A device mentioned in passing, not the subject | Not bound to that device |
| 6 | Hunch rather than verified fix | Trust marked `hunch`; not proposed as a fix |
| 7 | Rule that expires (a firmware fix) | Stops being proposed after the change |
| 8 | Two experts disagree on the same case | Both marked `disputed`; escalate to a human with both |
| 9 | Site access in an email (locked barrier) | Bound to a site entity; proposed on the next dispatch to that site |
| 10 | Typos or nicknames in a device ID | Resolved to the right entity, or abstain |
| 11 | The same case arriving as chat and as email | One assertion, not two |
| 12 | Near-duplicate of an existing assertion | Merged, with a stronger source count |
| 13 | A rule restated in a later thread with a new condition | Narrowed, with the earlier version preserved |
| 14 | Hand-written messy thread from a teammate | Held-out test of the extractor |

Include a mix of Teams-style and email-style, and at least two scenarios outside the optical-module family to show generality.

---

## 14. Cuts after review (Friday 6 November, 22:30)

These supersede sections 4.6, 6, 7 and Appendix A where they conflict. Reasoning is in `REVIEW_MIKAEL.md`.

| Cut | Was in | Replacement |
|---|---|---|
| Baseline B (raw-chat RAG) | 6.3, 5 | Keep the no-context opener as demo beat 1. B is a stretch task after the core passes, one slide at most. |
| Frozen dev/test split | 6.1 | None. Meaningless at 8 to 10 scenarios. |
| Scenarios 12 and 13 (near-duplicate merge, later narrowing) | Appendix A | Dropped. Scenario 11 (chat + email become one assertion) stays, it is the provided material. |
| Use-time "worked / did not work" tap | 4.6 | Auto-verify from outcome: a confirmation message in the thread ("Traffic is back") or counters rising after the action upgrades trust to `verified_by_outcome`. Zero taps. |
| Full default runbook in the stand-in agent | 4.7 | One prompt, one tool call. Without context it says reboot; with context it says bounce and cites the source. Pitch it as "stands in for your agent; the deliverable is the tool". |
| "Applies to N of M devices" indicator, question-count logging | 4.4 | Dropped. |
| Interloom prior art | 10 | Dropped, unverified. One line on Graphiti/Zep stays. |
| Custom linked view | 7 | Neo4j Browser, or a pyvis HTML export if Neo4j is not running within 45 minutes. |

Kept because each is a scoring line in Elisa's rubric: assertion schema with `trigger` and `avoid`, evidence check, binding with abstention, `valid_from` / `valid_to`, trust levels, deterministic `get_context`, decline on a newer unit, conflict escalation (slide if time runs out), barrier closer.

Added from Abhishek's plan: the one-tap scope question appears inside a mock Teams thread page, and the expert gets a "your tip was used today" notification. That page is Abhishek's.

## 15. Building with Claude: contracts, gates and tests

We build with Claude (Fable orchestrating, Opus 5.5 building). The bottleneck is no longer typing. It is one human verifying what agents produce. So every task must end in a check the human can run in under a minute.

### 15.1 Contracts first (hour 0 to 1, human-approved, then frozen)

Agents build against these and never edit them.

- `contracts/assertion.schema.json`: the shape in section 4.3.
- `contracts/topology.schema.json`: node with `id`, `type`, `model`, `install_year`, `firmware`, `site`; site with `id`, `name`, `access_notes`.
- `contracts/get_context.md`: `get_context(entity_id, event, symptoms, at_time) -> list[Assertion]` plus the filter rules (trigger match, predicate against topology, validity at `at_time`, trust threshold, flags for `disputed` and `needs_confirmation`).
- `contracts/message.schema.json`: the one message format adapters produce (author, role, timestamp, channel, thread, text).

### 15.2 One module per agent task, one test per module

Build order is sequential on the spine because each module consumes the previous one's output. Only data writing, the mock Teams page and slides run in parallel.

| Order | Module | Input fixture | Test asserts | Human gate (1 minute) |
|---|---|---|---|---|
| 1 | `adapters/` | Elisa's `teams_chat.json`, `email.txt` | 12 messages and 1 message in contract shape | Skim the output |
| 2 | `extractor/` | the two above | exactly one assertion; `avoid` contains "reboot"; `evidence.excerpt` is a verbatim substring of the source; chit-chat fixture yields nothing | Read the assertion |
| 3 | `binder/` | assertion + topology | explicit ID resolves to the node; "older units" yields a predicate or `needs_confirmation` with a question string | Read the question text |
| 4 | `store/` | bound assertions | round trip; query by entity returns them; Neo4j Browser shows the graph | Look at the graph |
| 5 | `agent/` | store + an incident on TRN-087 (2018) and TRN-101 (2023) | 087 proposal contains "counters" and "disable" and not "reboot"; 101 is declined with a reason | Read both outputs |
| 6 | `eval/` | all scenarios | parametrized test per scenario; writes `docs/CASE_TABLE.md` | Read the table |

Definition of done for every task: the test passes, the agent reports the exact command to run, the human runs it and looks at the output. An agent's claim that it works does not count.

### 15.3 Rules that keep this cheap

- **All LLM calls go through one `llm.py` with a disk cache keyed by a hash of the prompt.** Tests are then repeatable, reruns cost nothing, and the demo runs offline from the cache. This is the single most important rule.
- Generate the synthetic threads with a different model from the extractor. It is one model string, so it is free. Abhishek reads every thread anyway.
- Scenarios live in `data/scenarios/<nn>_<trap>/` with `thread.json` or `email.txt`, `expected.json` (which fields the assertion must contain, what the agent must and must not say, expected bind outcome). The eval test is one parametrized function over that folder. The case table is generated, never hand-written.
- `make demo` (or `python demo.py`) runs the five beats in order and prints or renders each. Rehearse from that, nothing else.
- Agents do not edit `contracts/`. If a contract is wrong, the human changes it and reruns the affected tests.
- One agent per module. Parallel agents on the same module produce drift the human then has to reconcile, which is slower than sequential.
- Every generated dataset gets a line in `docs/DATA_CARD.md`: what, how, which model, which prompt. The brief requires this.

### 15.4 Does Claude as builder change the cuts?

Mostly no. The cuts in section 14 were made for scope and judgment reasons, not typing time: a judge has three hours for every team, the use-time tap is a design choice, Interloom is unverified. Two things change:

- The evaluation harness comes back, but as the test suite in 15.2, not as a research artefact. With agents it is cheap and it is the only way the human keeps up.
- Baseline B and the expiry and conflict scenarios become stretch tasks that one agent can take after the core passes, because they do not touch the spine. They still do not get demo time beyond a slide.

What does not get cheaper: deciding what Erkki taps in the demo, reading synthetic threads for realism, the pitch narrative, Discord questions to Elisa, and verifying every agent's output. Those are the human's hours. Budget them first.
