# Abhishek's review of both plans

Written Friday 6 November 2026, ~22:30 (Helsinki), by Abhishek's Claude.

**Sources read:**
- `ABHISHEK_HANDOFF.md`
- `MIKAEL_HANDOFF.md` (v4)
- `REVIEW_MIKAEL.md`
- Elisa's brief (PDF)
- Elisa's example pack: `use_case.md`, `teams_chat.json`, `email.txt`, `reference_architecture.png`

**Not read:** Joni's pitch deck with speaker notes, which REVIEW_MIKAEL cites. It is not in Abhishek's folder or this repo. Mikael, please add it, or a summary of it, to the repo, which is private.

**How this was made:**
- **The `elisa-hackathon-judge` skill:** a three-judge panel (Joni, Matti, a neutral judge) scoring against Elisa's criteria.
- **Product brainstorming in assumption-testing mode:** listing every assumption and finding the riskiest one.
- **A pre-mortem in Gary Klein's style:** "it's Sunday 13:00 and we didn't place, why?" This was applied inline from the arn-spark pre-mortem method, because there is no product-concept file for the full pipeline.

**For any agent reading this:** this review is meant to be read *after* REVIEW_MIKAEL.md. It does not repeat what that file already says well. It records where Abhishek's side agrees, where it disagrees, and what it adds.

---

## 1. Bottom line

**Agree with the merged direction in REVIEW_MIKAEL.md.**
- Mikael's data model and pipeline are the spine: trigger, `applies_to`, action, `avoid`, evidence check, abstention, deterministic `get_context`.
- Abhishek's in-thread one-tap question is the abstention path.
- Abhishek owns the visible surface.

The review is right that these are one product, and right about the weaknesses in Abhishek's original plan: no trigger, a numeric confidence score, and too many integrations.

**Main changes from Abhishek's side:**
1. **The demo is a video, not a live presentation. This is confirmed.** Mikael's open question 5 is settled: **never build the live Slack bot.** It also means the video, not the slides, carries the pitch. It deserves its own protected time block and a script locked by Saturday noon, so the build produces exactly the screens the edit needs.
2. **Keep one small custom graph view, but only for the video.** Neo4j Browser is fine for building. On camera it looks generic, and the neutral judge rewards a picture they remember. Build one read-only page that draws the assertion graph from the store, styled to match, and nothing more: no search, no edits, no time slider. It's parallel work owned by Abhishek, off the spine and cut first if late. This is a scaled-down version of the original "edge", not the full feature.
3. **Make the locked-barrier case core, not a cuttable closer.** It is one of only **two** examples Elisa named in the brief. It is the only one about *access/location* knowledge, which Abhishek's notes flag as exactly what their AI "can't get". It's also cheap: one email becomes a site assertion, which gets attached to the next dispatch. Cut expiry and conflict before this.
4. **Rebalance Abhishek's workload.** The current split gives one non-coder eight jobs: topology, 8 scenario scripts, the mock Teams page, slides, README, data card, demo video and the Discord questions. With a fast-cut, voiced, bright video as the main deliverable, that won't fit. Proposed cuts and moves are in section 6.

---

## 2. Independent comparison table

This was filled before comparing with REVIEW_MIKAEL. It largely agrees.

| Criterion | Mikael v4 | Abhishek original | Merged plan |
|---|---|---|---|
| Usability | Zero steps; input is files, so "no work" is told, not shown | Zero steps + live one-tap question; shown, if built | Zero steps + one tap in a mock Teams thread, shown in the video. **Strongest available without a real Teams bot.** |
| Relevance | Evidence check, "nothing extracted" tested | No evidence check | Strong, *if* the barrier case stays in |
| Linking | Trigger + predicate + abstain: best part of either plan | Entity only, so it would fire on the wrong fault | Mikael's, unchanged |
| Agent-ready | One tool, deterministic filter, decline, escalate | "Deploy when relevant" undefined | Mikael's, unchanged |
| Feasibility (~35h left) | Spine yes; eval was overbuilt, now trimmed | Four integrations: no | Yes, if the freeze holds |
| Demo clarity | Right beats, but terminal output | Visual, risk of thin substance | Right beats + visible surfaces, *if* the video is scripted first |
| Evidence it works | Case table from tests | None | Case table, generated |
| Biggest failure | Looks like a script | Pretty but shallow | **The video gets made in the last 4 hours and is rushed** (see pre-mortem) |

---

## 3. Judge panel: the merged plan as planned (nothing is built yet)

**Joni (AI architect):** "Trigger plus `applies_to` plus `avoid` is exactly how I'd want an assertion to look, and abstaining on 'older units' instead of guessing shows they understood that a wrong link is worse than none. The decline on TRN-101 makes the filter credible. I'll want to know how this maps to *our* graph entities. If their topology schema is invented without asking us, that's a gap."

**Matti (autonomous ops):** "Erkki doing nothing and tapping once is what I asked for. The 'your tip was used today' message is a nice touch for the people side. I want to see the barrier: that's the one that actually stopped a dispatch. If it's missing or just a slide, I'll notice."

**Neutral judge:** "The 'agent says reboot' to 'agent says bounce, cites Erkki' flip is a clear wow moment. My worry is that a three-hour review window with many teams means I'll remember the video, not the README. If the video is a terminal recording with a voiceover, it blends in."

| Criterion | Weight* | Score | Why |
|---|---|---|---|
| Usability | 40% | 8 | Zero steps + one tap, shown in a Teams-like thread. A real Teams/Slack connector would make it 9. |
| Relevance | 15% | 7 | Evidence check is strong. Goes to 8 with the barrier case in the core demo. |
| Linking | 20% | 8 | Best-in-class design on paper. Unproven until the binder runs on messy threads. |
| Feasibility | 10% | 7 | Realistic. Loses points if the topology schema ignores Elisa's real entity shape. |
| Agentic suitability | 15% | 8 | One `get_context` tool + deterministic decline is very concrete. |
| **Weighted total** | | **77.5 / 100** | |

*The weights are our own guess. Elisa only says usability is primary and lists the rest as secondary.

**Top 3 fixes, ranked by points per hour:**
1. **Check Mikael's transcript of Elisa's briefing** (15 minutes, once it's in the repo). Look for what their graph entity types and IDs look like, whether one in-thread question is OK, and any video length limit. Only ask on Discord about what the transcript doesn't answer. This de-risks usability and feasibility at almost no cost.
2. **Barrier case in the core demo** (about 1–2 hours of agent time plus one synthetic email and site record). This lifts relevance and Matti's impression.
3. **Script the video before building screens** (about 1 hour on Saturday morning). This lifts demo clarity and keeps the build aimed at what will be shown.

**Hard questions they'll likely ask:**
- *"How is this different from RAG over our chats?"* Suggested answer: RAG would apply Erkki's tip to a 2023 unit, use expired advice and treat a hunch as a fix. Our filter declines those, and we show it.
- *"Who decided 'older units' means install year ≤ 2019?"* Suggested answer: nobody guessed. The system abstained and asked Erkki once, in his own thread.
- *"Would experts accept being monitored?"* Suggested answer: only opted-in channels, only the cited excerpt is stored, it's advisory only, and the expert gets credit when their tip is used.

---

## 4. Pre-mortem: "It's Sunday 13:00 and we didn't place. Why?"

**Root cause A: the core experience didn't land on screen.**
- **What happened:** The spine worked, but the video showed JSON and terminal logs. Judges reviewing many teams in three hours couldn't *see* "no extra work", which is the primary criterion. Five other teams also said "knowledge graph + agent".
- **Early warning:** By Saturday 14:00 there is no storyboard. By Saturday 20:00 the mock Teams page doesn't render.
- **Mitigation:**
  - Lock the video script first, around Saturday 10:00.
  - On screen, show the Teams thread with the question landing and Erkki's tap.
  - Show the big counter "12 messages → 1 assertion · 0 forms · 1 tap".
  - Show the agent's before/after recommendation side by side.

**Root cause B: trust broke on camera.**
- **What happened:** A claim in the video wasn't real. The graph was mocked, or the decline was hardcoded. A judge opened the repo, saw it, and every score dropped. Or a live model call misbehaved during recording.
- **Early warning:** Anything in the video that doesn't come from `demo.py`.
- **Mitigation:**
  - Record every beat from `demo.py`, using the cached `llm.py` (Mikael's rule).
  - Label any next-steps feature as such on screen.
  - The custom graph view must read the real store.

**Root cause C: we built for an imagined Elisa.**
- **What happened:** The invented topology didn't resemble their graph. A judge said "our entities don't look like this". Or the one-tap question was seen as "extra work". 
- **Early warning:** The briefing transcript contradicts our topology schema or the one-tap question, and we don't adjust.
- **Mitigation:**
  - Check the plan against Mikael's transcript as soon as it lands.
  - Ask Elisa only about the remaining gaps.
  - Name the question count out loud in the video.

| | Likelihood | Severity | Action |
|---|---|---|---|
| A: didn't land on screen | High | High | Address now |
| B: trust broke | Medium | High | Address now (record from `demo.py` only) |
| C: built for an imagined Elisa | Medium | Medium | Mitigate (check the briefing transcript) |

---

## 5. Flags in Mikael's files (wrong, stale or inconsistent)

- **Neo4j contradiction.** MIKAEL_HANDOFF 4.2 step 6 says "a graph database is not needed for the demo". Section 7 puts Neo4j storage in scope. Section 11 lists "graph database" as dropped. REVIEW_MIKAEL keeps Neo4j at 45 minutes with a pyvis fallback. **Proposed resolution:** follow REVIEW_MIKAEL. Neo4j stays if it runs within 45 minutes; otherwise use JSON + pyvis.
- **Stale decision log.** Section 11 still lists "headline is C versus B" and "use-time outcome tap", but both were reversed later (6.3 and section 14). Mark them as superseded so agents don't rebuild them.
- **Who writes the synthetic threads.** 6.1 and 15.3 say they are generated by a different model from Abhishek's scripts. REVIEW_MIKAEL says "Abhishek writes the synthetic threads". **Proposed:** Abhishek writes short scripts (who, what rule, what trap), a different model expands them, and Abhishek reads every one. That is less writing time for Abhishek and still a held-out test.
- **Appendix A numbering.** The header says "rows 12 and 13 cut", but there is a row 12 that "replaces the old row 14". This is confusing for an agent building the scenario folders. Renumber 1–12 cleanly.
- **Committing Elisa's files.** This repo is **private**, so the risk is low. Still worth the one-line Discord check if the repo goes public for submission.

---

## 6. Proposed work split (adjusts REVIEW_MIKAEL's)

**Mikael and his agents** (unchanged): contracts, adapters, extractor, binder, store, `get_context`, stand-in agent, case-table tests, `demo.py`, plus the **barrier case as core**.

**Abhishek, in priority order:**
1. **Tonight:** read Mikael's briefing transcript and note any answers that change the plan. Write the topology sheet (~20 nodes, 3 sites, including the barrier site with `access_notes`). Write 8 short scenario scripts.
2. **Saturday morning:** read the generated threads. Write the **video script and storyboard** (60–120 s, fast cuts, voiceover). Finish the mock Teams thread page.
3. **Saturday afternoon:** the custom graph view (cut first if late). Prepare video assets: brand colours (purple `#534AB7`), title cards, voiceover draft.
4. **Saturday 20:00, freeze:** record every beat from `demo.py`.
5. **Saturday night:** edit the video. Write a short README and data card; Claude can draft both from the repo.
6. **Sunday morning:** final cut and submit well before 10:00.

**Slides:** keep them minimal, around five, because the video carries the pitch. Claude can build them from the video script.

---

## 7. Video checklist (for when it exists)

- Is the problem clear in the first 10 seconds? Suggested opener: "the AI was right, the engineer drove there, and a locked gate stopped everything."
- Is the TRN-042 flip shown on screen: "reboot" → "check counters, bounce, don't reboot — Erkki, Teams"?
- Is the usability number shown: 0 forms, 1 tap?
- Is the decline shown: TRN-101 "not in scope: installed 2023"?
- Is the barrier closer shown?
- Is it under the time limit, with no dead air? (Confirm the limit with Elisa.)
- Does every shot come from `demo.py`?

---

## 8. Questions still open

The demo format is settled: **video only** (confirmed Friday 22:20).

Mikael is adding a **transcript of Elisa's briefing** to the repo. It should answer the remaining questions:
- Is there a video length limit?
- What shape are Elisa's graph entities (types, ID format)?
- Is one in-thread question acceptable?

Any agent reading this: check that transcript before asking Elisa anything. Ask on Discord only about what it leaves open.
