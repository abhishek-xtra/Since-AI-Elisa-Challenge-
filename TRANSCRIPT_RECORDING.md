# Transcript: Elisa challenge briefing and Q&A, Friday 6 November 2026

Source: `New Recording.m4a`, 36 min 13 s, recorded from the audience. Transcribed locally with whisper.cpp large-v3-turbo on CPU, language auto-detected as English. Raw timestamped output with per-token confidence marks is in `TRANSCRIPT_RECORDING_raw.md`.

## How to read the flags

- `[?word]` means the model gave that token a probability below 0.35. Read it as a guess.
- `[unclear]` means I could not make a sentence out of the words around it.
- Speaker labels are inferred from content. There is no diarization. Matti Penttilä opens (00:00 to 01:40), Joni Nuvola presents (01:42 onward), and from about 13:07 the audience asks questions. "Audience" may be several different people.
- Three regions are whisper artefacts, not speech: 23:57 to 26:02 (a loop of "uh" over quiet audience talk), 29:46 to 30:02 (one sentence repeated eight times), and 35:43 to 36:07 (repeated "Yes" and "Okay"). I have collapsed them and marked them.
- Audience questions were far from the microphone. 10:50 to 13:07 and 21:00 to 23:40 are fragmentary.

## Transcript

**00:00 Matti.** Hello everybody and welcome to the Elisa challenge. We will give you a brief intro, and first a very short introduction about ourselves. My name is Matti Penttilä. I work as head of Autonomous Network Operations in Elisa. Elisa is a Finnish telecommunication company. We are selling [our work] to telecommunication operators worldwide as well, and building that part. We have automated a lot of things in Elisa and now we are going towards an autonomous network, using AI capabilities. I'm not so technical anymore, that's why I have Joni here with me. This is the first time for both of us in this kind of hackathon, so please don't [?grill] us if we do something wrong.

**01:13 Matti.** [Asking the room where people are from. Answers: Jyväskylä, [?Kotka], [unclear].] ⚠ low confidence

**01:42 Joni.** Our challenge is hidden knowledge: capturing and keeping human-generated context for the autonomous network. This sounds like marketing, but we are quite advanced in AI and autonomy already. AI already does the majority of root cause analysis in our network for complex issues. A large share of faults is already identified by AI. We have agents with tooling for topology and telemetry measurements from the network. We don't need the typical silos anymore. What's stopping us is not the models. The model capabilities are pretty good. It's a much more human thing.

**03:03 Joni.** One example. A device fails somewhere in northern Finland. The AI analyses the situation, correctly identifies the faulty device, and a field engineer is dispatched. Everything works as designed, but the engineer drives there and finds a barrier that is locked, with no key. The AI did everything right. The process still failed because of one sentence, the place of the key, mentioned in some email or Slack message, some system the AI cannot reach.

**04:16 Joni.** Second story, Erkki. This is very typical in our domain. Veikko is a field engineer on site at a transmission node. He just replaced an optical module. The link is up but traffic doesn't flow. He pings Erkki on Teams. Erkki's first question: is this one of those older units? Yes, installed around 2019. This example is in the material. Don't trust the green link status on those, check the traffic counters, they're at zero, [?bounce] the interface, wait a minute, and the traffic is back. My favourite line in the whole material: Veikko asks, is this documented somewhere? No, we learned it over the years. This is the hidden knowledge. We have lots of this in our company, and I think other companies do too.

**05:35 Joni.** This is how we think about our network, in layers. The intent layer, as-designed. The physical or passive layer, as-built. The runtime layer, as-running. The one layer we are missing explains why: why we do certain things and why certain things happen. We need to capture that. And then the event stream, alerts from the network. This is in the material as a visualisation. One thing to highlight: when we capture this information we also need a mechanism to tell if it goes stale, because most of these facts are true for a certain period of time.

**06:52 Joni.** For our human-run network this was annoying, we dealt with it. When we aim for autonomy it is a real stop. The autonomous process stops when it cannot fetch that information, and you need a human [?handover] for those situations.

**07:17 Joni.** This is the challenge. Capture human-generated hidden knowledge and bind it to the right network context. If the knowledge is related to a device, bind it to that device. If it is related to a site, bind it to that site. The entities can be pretty much [unclear] ⚠ low confidence.

**08:07 Joni.** The guiding question: we don't want to create any additional work for our [?engineers]. If we tell them, whenever you face something not documented please write it down in some system, they don't. They're in a hurry. That is also the biggest reason this hidden knowledge forms in the first place. So we need to capture it while it forms: phone calls, emails, discussions, whatever. If your solution depends on manual work, it's not going to work.

**09:07 Joni.** What makes this hard. We have a large blob of discussions in some systems and we have to detect what is important, what needs to be captured. Then we need a mechanism to link it to the specific entities, because if the linking goes wrong the knowledge is not useful, or processes that depend on that linking will fail. Then the time component: a mechanism to tell from which point in time to which point in time a fact is valid, and after that we can [?phase] it away. And a trust boundary: if we have facts that compete, how do we handle or sort those [?race] conditions? If we have two facts, how can we score or detect which one to use?

**10:35 Joni.** About the data set. It's very small, but this is something you can generate easily yourselves once you understand the problem: synthetic phone calls, emails. There are a couple of cases provided. ⚠ fragmentary 10:50 to 11:10

**11:13 Joni.** Evaluation. As I explained, we have to capture what's useful in the context with little extra work. It doesn't matter what the channel is in your product, because the concept applies to everything. [Capture] the facts, the hidden knowledge, link it to the right entities, and have tooling to reuse it. For example, whenever that link failure happens again, the agent can use these tools, or whatever knowledge graph, to fetch what is relevant to that specific network [entity], so that it doesn't need [a human]. ⚠ fragmentary 11:28 to 13:07

**13:07 Joni.** Any questions?

**13:14 Audience.** What kind of channels? You mentioned Teams and emails, something else?

**13:19 Joni.** In Elisa we use Teams, emails, phone calls, monitoring [?systems]. But the platform doesn't matter, the same rule applies whatever the platform is.

**13:34 Audience.** What do you value most? Having it as much in the background as possible, or having the engineer give as much knowledge as possible to the system? You said no forms, but some minimal work, like approving the knowledge, a secondary yes or no?

**14:06 Joni.** I think our approach is a bit different, because we just cannot know how much hidden knowledge there is. There are so many domains, so many topics. The only approach to tackle this someday is to capture it once we see it, because if we tell everyone "please write down everything you know" [it doesn't happen].

**14:39 Audience.** But if you see some hidden knowledge, you still need to confirm how key it is, how useful.

**14:48 Joni (attribution uncertain).** Every time we see some conversation we need to evaluate whether its content is something we already have in our knowledge space. If we always write facts, we grow the knowledge space, so we need to check whether that fact already existed.

**15:31 Audience.** Can Erkki do some minimal job for this, or is the metric that Erkki is just working, doesn't confirm anything, the system runs in the background and he doesn't need to accept that this is really hidden knowledge?

**15:54 Joni.** Good question. If people are not verbose about what they're doing, there's no way we can capture it. The idea is, if we see something, we capture it.

**16:08 Audience.** If in an email we see hidden knowledge but it's not clear whether it's solved, can we ask straight away, "is it solved?", and propose solutions? They don't have to write a report on what they did, but can they press a button?

**17:08 Joni.** Normally now, when the agent does something and says there is something it doesn't know or cannot do, in that case we can do a human interruption for the agent and ask whether this is correct. That's also what you meant: how we interrupt the case and [?disclose] it. ⚠ low confidence 17:34 to 18:30

**18:31 Joni.** Basically, whenever Erkki needs to step in for some workflow the agent cannot solve by itself, we need to capture what Erkki does in that case, and next time we face a similar issue the agent can solve that workflow. The target is to build efficiency without a human in the loop.

**18:58 Audience.** One more question. Now we have a lack of [?documentation]. The AI can capture knowledge from messages. But if you face a problem you did not face previously, a new type of [?incident], no previous [?context] and no documentation, what should happen? Should we write the documentation, or solve it in the chat and capture the solution from the chat again?

**19:35 Joni.** It depends how you want to build it, but how I would build it: if there is a new problem we haven't seen before, we would want the user to explain it to the agent, and we capture it as a whole, because from the agent we already know the context of that issue, we already know which devices are part of it. Then we try to extract the facts from that explanation. The whole discussion could also be in Slack or [unclear].

**20:59 Audience.** What is the most challenging part of having a human in the loop? Why shouldn't a human be in this? ⚠ low confidence 20:59 to 21:33

**21:33 Joni.** You mean, how do we evaluate whether the knowledge is good or bad? I think we don't have a solution for that, any kind of ideas are welcome. [unclear] ⚠ low confidence 21:48 to 22:22

**22:35 Audience.** Should we assume the system only works with [data you give us], or is there some data we should expect exists?

**22:48 Joni.** I think it doesn't matter. If you just use lab data and prove this kind of concept: that we can capture, bind to the network entities, and recall it when the agent needs it in the process. From my perspective no need to have a different platform. ⚠ fragmentary; 23:57 to 26:02 is an artefact region, one audible fragment at 25:37: "it's always generated by humans so we don't want to inspect any kind of [unclear]"

**26:03 Audience.** [Question about information on the network infrastructure.] ⚠ low confidence

**26:19 Joni.** We don't have any synthetic data for the actual network. I think it's also somewhat irrelevant, because you can do a synthetic set of data with different devices located at certain sites. A sample of the topology.

**26:58 Audience.** What kind of tools do you use at the moment for this kind of issue?

**27:18 Joni.** We have some solutions. One would be to screen the messages: if users are discussing, we can use those conversation traces to inspect whether there's anything useful. For example, the user can flag [an agent's answer]: this model response was bad, the correct solution is this, because of this and this.

**27:49 Audience.** I'm asking about the issue systems. Is there a ticketing system, or only the [?chat]?

**28:03 Joni.** For this problem I think we should focus only on the platforms where humans discuss. We have a ticketing system, and those discussions mostly start from the tickets, because there is some problem in the field, then the engineer goes to the site, after that starts to discuss. We cannot do everything.

**28:40 Audience.** I ask because there are solutions that are not proper solutions, a workaround found by an engineer in the field, written in a ticket or something, so next time the same problem comes [it is there].

**29:11 Joni.** If a new ticketing system would be smarter, we would have to replace our ticketing system. We want to use the existing system but somehow capture [from it]. ⚠ low confidence 29:20 to 29:45. 29:46 to 30:02 is an artefact region.

**30:04 Audience.** I would also think that if we have this conversation where the hidden knowledge [?arises], we would still want to connect the hidden knowledge to the non-hidden knowledge. It's a structured way to acquire more than the surface, so you can connect it to the [?existing] data. Could you explain more about the knowledge graph, and how different things might link to a device instead of a big ticketing system?

**30:57 Joni.** In this era of autonomy we want to get rid of these ticketing systems. We are embracing the idea of a digital [?twin]. We have a graph database where we have modelled the whole network. We don't want any tickets anymore. We have a network model in the graph database with all the devices, all the sites, all the physical components of the network, and also logical configuration data. That's the database we want to link this hidden knowledge to. So whenever an agent troubleshoots something related to some physical site or device, that hidden knowledge is bound to that specific entity, and when the agent is troubleshooting something related to that entity, the memory from the knowledge base comes up with the context needed to solve the issue. We don't want to fetch from legacy systems anymore. Pretty much all workflows rely on that digital [?twin], the modelled network.

**32:47 Matti.** So we have almost everything else. We have a lot of data, but this is the missing part. We have people who have been working thirty years. They have a lot of information. "During the summer this happens." How to collect that?

**33:13 Audience.** Vectorise that data?

**33:15 Joni.** We can see the temperature, the link statuses, the optical measurements, every technical detail. But if there is hidden knowledge that only people know about a certain component or software release, or something that might happen, we need to bind that information. "During the snow, something happens in the [?Lapland] region." It's not specific [to one device].

**33:46 Matti.** Any more? Sounds like an interesting challenge? Impossible? Possible. That's why we're here.

**33:59 Matti.** There is something you probably don't have to think about currently, the GDPR [?rules] and so on, for example for all the calls. Maybe we don't take those into account [here].

**34:39 Audience.** When you say autonomous decisions, a problem comes up and the AI finds hidden knowledge about how to solve it from some text. Should it implement the solution itself, or provide it to an engineer who implements it and makes sure it's right?

**34:58 Joni.** Currently, with these LLMs, we don't want to make any actions directly to the network. It's to advise and assist, give an answer back to the engineer: what could solve this. It shows that it knows what was previously hidden. When the models get better and we can trust them to do actions, maybe with some kind of confidence model, we can use those to do actions.

**35:37 Audience.** And the AI would have the same access to the device? It would know the exact model number, the firmware number?

**35:43 Joni.** Yes. ⚠ 35:43 to 36:07 is an artefact region; one audible fragment: "that's more of, if you can get that digital".

**36:08 Joni.** At least I will be here tomorrow.

## What this confirms or changes for the plan

Numbers refer to `MIKAEL_HANDOFF.md` sections.

Confirmed from the recording:

- **No duplicates (14:48).** "If we always write facts we grow the knowledge space, so we need to check whether that fact already existed." This is the merge-by-key rule in 4.2 step 2a. Attribution between Joni and the questioner is uncertain, but the requirement stands.
- **Advisory only (34:58).** No actions on the network, advise and assist, answer back to the engineer. Already in 4.6.
- **Human interruption is acceptable (17:08).** When the agent cannot proceed, it may interrupt a human and ask whether something is correct. This is the ask lane, and it is Elisa's own current practice.
- **The agent knows model and firmware per device (35:37).** Moves part of 16.5 from unverified to confirmed: per-device firmware exists in the data the agent sees. Whether upgrades roll out on different days is still unconfirmed.
- **Knowledge tied to a software release is a named example (33:15).** Supports firmware-scoped candidates and validity.
- **The graph holds devices, sites, physical components and logical configuration data (31:11).** The topology schema in 15.1 matches. Still no answer on link data (16.2).
- **Platform does not matter (11:37, 13:28).** A mock Teams page and file ingestion are fine.
- **Synthetic topology is expected (26:19).** "A synthetic set of devices located at certain sites."
- **Capture at escalation (19:35).** When the agent hits something new, the human explains it to the agent and the explanation is captured whole, with the context and devices already known. See the new item below.

New or changed:

- **Capture inside the agent's own escalation thread (19:35, 27:18).** Joni's preferred design for new problems: the engineer explains to the agent, and the agent already knows the entities. Linking is then free, because the incident context is attached. They also already let users flag "this response was bad, the correct solution is X because Y". Both are capture channels where binding has no ambiguity. Added to 4.2 as an input alongside chat and email.
- **Competing facts need an ordering (09:58).** Joni asked "how can we score or detect which one to use" for two competing facts. The plan's current answer, mark both disputed and escalate, is the floor. Added a deterministic precedence rule in 4.6: verified outcome over stated over hunch, more cases over fewer, newer over older, and only if still tied, escalate. Visible components, no learned score.
- **Knowledge that is regional or seasonal, not device-specific (32:59, 33:37).** "During the summer this happens", "during the snow, something happens in the region". Scope candidates therefore include region or site group, and triggers can include a season or weather condition. Added to 4.4 as a candidate type and to Appendix A as a scenario.
- **"How do we tell good knowledge from bad" is an open problem for Elisa (21:33).** They have no answer and asked for ideas. Our answer is trust levels plus outcome verification plus case counts. Say so explicitly in the pitch.
- **Discussions start from tickets (28:03).** The ticket is the incident anchor. In the synthetic data, each thread should reference a ticket or incident ID, which gives the extractor a free entity hint.
- **GDPR is out of scope for the weekend (33:59).** Matches the plan.
- **Joni is at the stand Saturday (36:08).**

Not in the recording: nothing about hardware replacement keeping the same ID (16.1), nothing about links or far-end attributes (16.2), nothing about timestamps on configuration changes (16.7). Those stay pending.
