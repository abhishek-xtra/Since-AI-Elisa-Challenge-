# Raw whisper output with confidence marks

Generated from `transcript.json` (whisper.cpp large-v3-turbo). `[?word]` = token probability below 0.35. Lines marked ⚠ have a mean token probability below 0.60. Regions 23:57 to 26:02, 29:46 to 30:02 and 35:43 to 36:07 are decoding artefacts on silence. The cleaned version is `TRANSCRIPT_RECORDING.md`.

**00:00** [?start] a little bit early. Okay[?.] Okay. Okay. Hey, hello everybody and welcome to [?El]isa [?Challenge].

**00:11** And we will give you a brief brief intro for this and maybe first of all [?a] very short introduction

**00:18** about ourselves. My name is Matti Penttilä. I work as a lead head of our [?Aut]onomous Network

**00:26** Operations in Elisa. So first of all Elisa is a Finnish telecommunication company. We are

**00:31** doing a lot of work nowadays and selling that for the telecommunication operators as well worldwide

**00:37** and we are building that that part. So we have automated a lot of things in Elisa and now we are

**00:43** going towards Autonomous Network and using the AI capabilities [?so] much. So I'm not so technical

**00:50** [?about] people anymore. So that's why I have [?Y]oni here together with me. But maybe another thing is that

**00:59** this is first time for us both of us in this kind of hackathon session. So please don't chill us

**01:05** if we are doing something wrong. But we try our best. So maybe only you can present yourself

**01:13** [?maybe] something [?you] mentioned. I'm from the Jyväskylä[?,] we're in the middle of England.

**01:32** [?I]'m from [?K]ofka[?.] Close to Rasen[?borough].  ⚠ low confidence (mean 0.58)

**01:40** [?So] [?actually] we'll start. Yes.

**01:42** [?I]'m from Kofka. [?Okay] [?so] our challenge is [?peer] and knowledge[?,] [?capture] and keeping human  ⚠ low confidence (mean 0.56)

**01:50** generated context for this autonomous network[?.] And hopefully this short briefing will help you

**02:00** understand what I mean by this. So first this sounds like a marketing but we are quite advanced in this

**02:13** this kind of [?an] AI or autonomy already. AI already does majority of proof cause analysis in our network

**02:22** [?for] [?the] complex issues that you know[?.] [?A] large [?share] of different faults is already identified by AI.

**02:33** And we have these agents with different tooling for it in topology and different telemetry measurements

**02:39** from the network. So we think that we don't need these typical silos anymore in [?the] network.

**02:49** So what's stopping us [?it]'s not the actual models. The model capabilities are pretty good nowadays.

**02:56** It's a much more human thing that's stopping us. Maybe you mentioned that we can share this presentation[?.]

**03:03** [?So] this is one example about the story. You know some device fails in somewhere in northern Finland.

**03:24** The AI analyzes the situation correctly identifies the [?fa]ulty device and then the field engineers dispatches the site.

**03:36** Everything works exactly as we have designed but the engineer drives there and finds out that there

**03:42** could be some barrier that is that is locked and with no key for example. This is just an example

**03:50** [?but] if you know our [?ultimately] cannot proceed from this kind of thing. The AI did everything right. The process still

**03:58** failed because one sentence this kind of a place for the key could be mentioned in some email or in some

**04:05** Slack message or something. Some system that the AI cannot really make it. This is one example and another one

**04:16** [?this] is actually very typical in our domain. The second story[?,] Erkki. For example, in this example,

**04:26** a vehicle is a field engineer on site at some transmission node and he just replaced an optical module

**04:35** and [?the] link is up but the traffic doesn't flow. So he brings Erkki on themes and Erkki's first question is

**04:46** is this is this is this one of those older units? Yes, installed [?it] around 2019. This is this example is in the material also

**04:58** don't [?first] trust the green light status on those set the traffic after the zero

**05:04** [?that]'s [?the] [?design] of the interface

**05:07** wait a minute and the traffic is back

**05:10** [?and] this is kind of my favorite [?time] for the whole material explains this issue. [?Ben]ko asks

**05:19** is this documented somewhere and you know no we learned it over the years. This is the hidden knowledge

**05:27** that we have lots of this in our company and I think in other companies also

**05:35** [?so] this is how we think about our network. We describe it in different layers. We have this

**05:42** indent layer which we can call as design [?then] this is that a physical

**05:47** slash passive layer which is can be described as build layer, runtime layer, [?it] is as running layer

**05:57** and the one layer we have missing is this which explains [?uh] kind of why

**06:04** why we are doing certain things and why certain things happen

**06:08** so we somehow need to capture this and then we have this kind of event stream

**06:12** [?industry] alerts from the network [?uh] this is also in the material [?it] is kind of a visualization about the

**06:23** previous [?lines] so one thing to highlight here is this uh when we capture this kind of information

**06:32** we somehow need to also have a mechanism to kind of tell if it goes stale at some point because

**06:40** most of the facts or the hidden knowledge is for a certain period of time

**06:52** and for our human run network this was annoying we will [?deal] with that

**06:57** but when we aim for the autonomy it's a real stop the autonomous process stop when there's you know

**07:05** you cannot fetch that information so you have to have some kind of human [?community] for those situations

**07:17** yeah and this is the challenge so we need to somehow capture this human generated hidden knowledge

**07:26** and find it right network [?context] this is [?a] kind of technical uh issue here so for example if the hidden knowledge

**07:38** is related to some network device then we have to somehow bind it to that specific device or if it's uh

**07:46** related to some network site then we have to bind it to that specific device [?so] we have to have some kind of

**07:53** [?that] [?we] [?have] to capture and [?binding] right network entities and the entities can be

**07:59** [?pretty] much [?entities] can be [?imported] and the collection can be [?side] whatever  ⚠ low confidence (mean 0.53)

**08:07** [?um] yeah about the [?fighting] question uh question uh

**08:14** we don't want to create any additional work to our [?pension]ers if we don't get that you know

**08:21** if you face any anything that's not documented at least the documentation or write it down to some

**08:28** system they don't they're in hurry they don't do that's why also this is the i think the biggest reason why

**08:35** [?is] kind of hidden knowledge [?uh] forms from the beginning so [?so] [?we] need to somehow capture it while it forms in the

**08:49** system it can be phone calls it can be emails it can be some [?things] uh discussions or whatever

**08:57** [?so] if [?you] [?have] to [?do] [?that] so if your solution is [?so] if your solution depends on manual work then it's not

**09:07** like common work yeah and and some things that makes this really hard is the yeah so if you think we have this uh large blob of discussions in some systems we have to somehow detect what is important

**09:21** what needs to be captured then we need some mechanism from technical perspective we need to somehow link

**09:33** it to those specific entities because if the linking goes wrong then that's knowledge is not not useful or

**09:41** some processes that depend on that linking will fail and then this kind of time component as i

**09:49** [?said] [?earlier] we have to have some kind of mechanism to tell which point in time to this point in time

**09:58** that certain fact is valid and needed and after that we can you know process away and then this kind of a trust boundary

**10:09** so if we have some facts that compete together how we kind of handle or sort those kind of

**10:19** [?uh] [?raise] conditions if we have two facts how we how we can [?score] or [?we] can [?detect] that which one we are going to use as a kind of a fact

**10:28** [?yeah]  ⚠ low confidence (mean 0.22)

**10:35** yes so uh about the data set uh it's it's it's very pretty small but i think this is something that [?i] can generate

**10:44** [?this] [?can] [?generate] easily [?but] myself if you understand the problem  ⚠ low confidence (mean 0.60)

**10:50** it can be some synthetic uh [?a] phone call

**10:54** it can be some uh

**10:58** [?it] can be emails

**11:01** so yeah there's a couple of cases that we provided

**11:05** [?that] [?if] you need uh  ⚠ low confidence (mean 0.42)

**11:13** about the evaluation of the work

**11:18** so as i explained we have somehow to take what's useful in the context

**11:22** and then that's a little extra work

**11:28** uh

**11:32** uh

**11:34** i think this is needed so

**11:37** and it doesn't matter what the channel is in your uh in your uh product uh because i think that that concept applies to everything

**11:48** [?uh]  ⚠ low confidence (mean 0.12)

**11:54** yeah

**11:58** the facts of the hidden knowledge

**12:00** then we link it to write entities

**12:04** we also have to have some kind of a

**12:06** [?tooling] to reuse so  ⚠ low confidence (mean 0.50)

**12:08** for example uh that

**12:11** link failure whenever that happens again

**12:14** [?in] the [?physical] system  ⚠ low confidence (mean 0.45)

**12:15** the nation can use [?these] tools

**12:18** or some

**12:18** [?or] whatever  ⚠ low confidence (mean 0.50)

**12:19** knowledge [?crap]  ⚠ low confidence (mean 0.31)

**12:21** to fetch what is relevant to that specific network

**12:25** so that it doesn't need

**12:37** uh

**12:46** um

**12:48** um

**13:07** [?but] any questions about the challenges

**13:14** what kind of channel views you mentioned teams and emails uh something else

**13:19** in elisa we use uh

**13:21** themes emails phone calls

**13:24** monitoring [?of] [?the] internet [?but] i think the kind of platform doesn't matter

**13:28** [?because] the same [?role] applies to every whatever the kind of platform is

**13:34** [?yeah] but what do you [?value] is the most like not or helping the engineer and just like

**13:40** having it as like as sort of a background as possible or you would like to for engineer to give as

**13:46** much knowledge as possible to the system so like this doesn't happen like if

**13:51** engineer needs to do some like okay you said [?it]'s like not giving form but like some minimal work uh

**13:56** just to like use the knowledge somehow um or like [?something] like approves the knowledge so that's

**14:00** like actually the knowledge that you want you know like it's some [?secondary] yes or no but like

**14:05** uh

**14:06** which [?country] values most i i i think uh [?we] saw the approach is a little bit different because

**14:13** we just cannot know how much hidden knowledge there is there's so much you know different domains

**14:20** different uh themes so i think the only approach to someday tackle this problem is that we just capture

**14:30** once we see it because if we tell everything that hey please write down everything you know

**14:39** but like for example if you like see that there's like some hidden knowledge but you still need to

**14:43** confirm for example like how [?how] [?key] [?and] this really or like how useful it is because like for

**14:48** example [?like] [?every] time we see some kind of [?conversation] we are obviously we need to kind of evaluate that

**15:04** [?conversation] that does this content something that we are for example having our knowledge space or

**15:10** knowledge [?at] the moment so we have to check that because if we always write uh facts

**15:20** grow the knowledge space [?so] we somehow need to check that if that fact already existed maybe maybe the

**15:31** question was also also that [?are] everything knowledge this is not documented necessary [?like] does it

**15:38** like can erki need like can erki do some like even like little minimal job for this or it's like the

**15:44** metric is like metric like erki is possibly working and he doesn't confirm anything like he like the

**15:50** system just like runs some background and he doesn't need to like accept for example that like okay

**15:54** this is like really hidden knowledge or you know proof yeah that's a that's a good question if people don't

**16:02** kind of kind of be verbose about what they're doing then then there's no way we can capture it so the idea

**16:08** is that if we see something then we capture it yeah i mean like if in email we see that there's some

**16:13** hidden knowledge but like they're not sure is it solved already or is it not and like how for example like

**16:18** [?um] yeah like can we can we can we ask [?can] we straight away like [?is] it solved uh you know and then like for

**16:25** example proposing [?sure] solutions like [?yeah] yeah that's [?peaceful] solving also if that's something

**16:32** [?that]'s [?so] that yes we don't have [?any] like write a report [?on] what [?they] did but can they like press the button

**16:50** [?i] think that was the question yeah yeah okay yeah uh in yeah the thing is that uh normally now when we

**17:08** when for example as[?in] does something uh and it says that something is not you know there's something

**17:16** it doesn't know it doesn't know or uh it does not uh it cannot do then we yeah oh yeah in in that case

**17:24** we can uh for the agent for example uh do some kind of uh human interruption and ask if this is

**17:34** the correct [?question] [?that]'s what you meant also from that kind of when we stop the asian

**17:39** [?for] [?that] [?kind] of [?how] we interrupt the case [?and] [?disclose] yeah i'm sorry i was just trying to

**17:54** help specify that question for our plan solution

**17:59** [?we] don't agree with [?that] [?we] don't agree with [?the] description [?yeah]  ⚠ low confidence (mean 0.57)

**18:07** [?uh]  ⚠ low confidence (mean 0.35)

**18:11** like that's the main purpose of this challenge like to

**18:16** reduce the time uh for example

**18:19** [?if] you face the problem and then you [?don]'t have the [?communication]

**18:23** [?you] [?don]'t have [?to] [?say] [?you] want to solve [?it] as soon as possible so is that [?what] you[?'re] [?going] to [?do]  ⚠ low confidence (mean 0.58)

**18:31** yeah so basically uh whenever [?er][?ke] [?needs] to [?for] some workflow that agent cannot solve by

**18:38** themselves uh we need to capture what erke will do in that case and then next time when we face

**18:46** similar issues the agent can you know solve that workflow so the target is to build efficiency

**18:52** more [?representative] without human in the loop so [?or] [?more] on [?it] that's [?them] and target  ⚠ low confidence (mean 0.60)

**18:58** thank you and one more question uh so now we have a lack of [?recognition]

**19:04** and [?this] ai engine you can capture this [?with] the knowledge from messages and then

**19:12** for example if you face this problem that you didn't face previously so like

**19:18** [?a] [?new] type of [?accident] for example and use and you don't have previous conflicts

**19:23** for this type of issue and also you don't have [?the] [?documentation] so what should happen in this

**19:30** case like should should [?we] should [?we] should we should [?you] write the documentation or should we solve

**19:35** this problem in the chat and then capture the solution from the chat again yeah i think it depends uh how you

**19:44** want to build it but uh how i will build that is that if there's some new uh problem we didn't haven't seen

**19:53** before then we would want the user to kind of explain into the agent and then we capture it as a whole

**20:02** [?because] from the agent [?we] already know uh what uh what what [?what] is the context of that issue we already

**20:11** know that uh what uh for example devices are uh you know uh part of that [?then] we will try to capture

**20:20** [?and] [?extract] the facts from that explanation  ⚠ low confidence (mean 0.48)

**20:42** yeah yeah yeah there could be [?that] the whole discussion [?would] be uh uh in in some uh [?slap] or

**20:49** [?or] mother more story  ⚠ low confidence (mean 0.58)

**20:54** and there is a treatment test okay thank you

**20:59** i'm wondering what is the most challenge of having a human in the room like why would you like

**21:06** thinking that human shouldn't be in this like a banana like for example if you like having some

**21:12** [?of] [?the] stone and then it wouldn't need to be identified by a person

**21:18** probably so that

**21:20** how would that should then become like something like abstract

**21:33** you mean that that how how do we evaluate that is that knowledge is good or bad

**21:38** [?yeah]  ⚠ low confidence (mean 0.22)

**21:44** [?yeah]  ⚠ low confidence (mean 0.26)

**21:48** [?i] think we don't have a solution for that uh you know this year or any kind of ideas but how

**21:59** [?do] we [?begin] with this [?this] kind of [?development] [?we] need to have some kind of  ⚠ low confidence (mean 0.55)

**22:15** i mean if we have uh this kind of uh uh [?problem] [?is] this [?is] [?what] you might fix uh some sort of problem

**22:22** [?uh]  ⚠ low confidence (mean 0.11)

**22:35** [?um] should we assume that the system is only working with

**22:40** [?do] you [?generate] that data or do we get or is there some data like that we should suspect exists

**22:48** uh i think [?we] also [?uh] expect that there is already some time

**22:52** [?uh]  ⚠ low confidence (mean 0.10)

**23:12** i i [?i] think it doesn't matter if you if you just use [?lab] and prove that [?this] kind of concept you build

**23:19** around that that we can capture the network entities and then recall that the way to require it that when the data effects and troubles are in the process for that now

**23:32** so from my perspective no need to have a different kind of uh platform

**23:38** uh yeah yeah if you want to build yeah there could be also kind of references to that happen

**23:57** uh

**24:11** um

**24:15** um  ⚠ low confidence (mean 0.60)

**24:21** [?uh]  ⚠ low confidence (mean 0.30)

**24:34** [?um]  ⚠ low confidence (mean 0.32)

**24:34** [?uh]  ⚠ low confidence (mean 0.19)

**24:34** [?uh]  ⚠ low confidence (mean 0.21)

**24:34** [?uh]  ⚠ low confidence (mean 0.24)

**24:36** [?uh]  ⚠ low confidence (mean 0.33)

**24:38** uh  ⚠ low confidence (mean 0.39)

**24:38** uh  ⚠ low confidence (mean 0.40)

**24:40** uh  ⚠ low confidence (mean 0.47)

**24:42** uh  ⚠ low confidence (mean 0.55)

**24:44** uh

**24:51** uh  ⚠ low confidence (mean 0.36)

**25:05** uh

**25:07** uh

**25:09** [?uh]  ⚠ low confidence (mean 0.31)

**25:11** uh

**25:21** uh

**25:25** uh

**25:25** uh

**25:29** uh

**25:31** uh

**25:33** uh

**25:35** uh  ⚠ low confidence (mean 0.49)

**25:37** uh  ⚠ low confidence (mean 0.56)

**25:37** [?you] know it's [?it]'s always generated by humans so we don't want to inspect any [?any] kind of

**25:42** uh

**25:50** [?uh]  ⚠ low confidence (mean 0.21)

**25:54** [?uh]  ⚠ low confidence (mean 0.28)

**25:56** uh

**25:58** uh

**26:00** uh  ⚠ low confidence (mean 0.36)

**26:02** Yeah.

**26:03** I'm going to share some information about the network infrastructure and I was wondering what that is being.

**26:19** Yeah, we don't have any, we don't have any synthetic data for the actual network.

**26:31** But I think it's also somewhat irrelevant because you can just, you know, do some synthetic set of data with different devices that are located to certain sites.

**26:49** I think the network [?top]ology of the network data.

**26:52** Okay. So we have to make a sample of the [?molecule].

**26:57** [?Yes].  ⚠ low confidence (mean 0.31)

**26:58** What kind of tools you'll use at this moment in the [?system]?

**27:15** [?Yeah].  ⚠ low confidence (mean 0.56)

**27:16** [?This] kind of issues.

**27:17** Yeah.

**27:18** We have some solutions.

**27:20** One solution would be to, of course, you know, screen the messages or if user is discussing information, then we can use those conversation traces to inspect if there's any useful.

**27:36** [?Use]ful of them[?.]  ⚠ low confidence (mean 0.49)

**27:37** For example, the user can plug for number sessions[?.]

**27:42** Okay.

**27:43** This model response was bad.

**27:45** The correct solution is this because this and this.

**27:48** [?Not][?,] not[?,] not for the [?model].  ⚠ low confidence (mean 0.47)

**27:49** Like I'm asking like for an issue with [?some] of the[?,] uh, [?so] whether there's [?a], uh, uh, [?tick]eting system or just only the [?flat].

**28:03** [?For] this problem, I think we should focus only on those platforms where humans discuss[?.]

**28:15** [?So] we have a ticketing system, which is, uh, which is[?,] uh, mostly based on the tickets, those, uh, discussions start[?.]

**28:24** Because there is some problem in [?the], in that field.

**28:27** And then there [?will] be [?the] engineer going to the side.

**28:29** After that starts to discuss with this[?.]

**28:32** [?We] cannot do everything.

**28:35** Yeah.

**28:36** That's, but I think it's not, you know, relevant here.

**28:39** So yes.

**28:40** No, [?uh], I ask this because like, uh, there are some solutions that are not like, uh, solutions [?properly] that, uh, uh, like the [?campaign] they build to.

**28:53** [?That] is like installed and it is a complete new thing that found by an engineer in the field.

**29:02** So [?he] has, uh, written it in a ticket or something.

**29:06** So like next time the same problem comes.

**29:09** Yeah.

**29:10** And [?yeah].  ⚠ low confidence (mean 0.50)

**29:11** [?Well], I think [?if] the new ticketing system, for example, that would be smarter and more, we, we have to replace our ticketing system.

**29:20** We have to use the existing, uh, system, but somehow [?capsule].

**29:25** No, I'm asking whether the, Elisa has a ticketing system that kind of, that you, [?that] you are using[?,] that you[?'re][?,] that you're[?,] that you're[?,] that you're [?going] to[?.]

**29:33** [?Yeah].  ⚠ low confidence (mean 0.45)

**29:34** Yeah[?,] we do have a ticketing system, but I, I think that's like, uh, [?I] [?want] to capture anything.

**29:39** [?I] [?want] to capture anything.  ⚠ low confidence (mean 0.57)

**29:40** Do they want something that just[?,] [?that] fits into what I [?like] [?now]?

**29:43** [?If] I understood the question correctly.

**29:44** Yeah.

**29:45** Yeah.

**29:46** Yeah.

**29:46** The time taking is more, but it could be great.

**29:47** Yeah.

**29:48** Yeah.

**29:49** The time taking is more, but it could be great.

**29:50** Yeah.

**29:51** The time taking is more, but it could be great.

**29:52** Yeah.

**29:53** The time taking is more, but it could be great.

**29:54** Yeah.

**29:55** The time taking is more, but it could be great.

**29:56** Yeah.

**29:57** The time taking is more, but it could be great.

**29:58** Yeah.

**29:59** The time taking is more, but it could be great.

**30:00** Yeah.

**30:01** The time taking is more, but it could be great.

**30:02** Yeah.

**30:03** [?Yeah].  ⚠ low confidence (mean 0.56)

**30:04** Well, I would also think that, uh, if we have, if we have this conversation where the hidden

**30:14** knowledge [?works], uh, we would still want to connect the hidden knowledge to the non-subhidden

**30:21** knowledge.

**30:22** Yeah.

**30:23** Yeah.

**30:24** So therefore, I [?think] it's a good [?thing] because it is a very structured way to acquire more

**30:33** than [?the] surface[?,] so that you can connect that to the hidden [?data].

**30:40** Should you explain more about the, for example, the [?knowledge] drop and thinking how, for example,

**30:47** about the different [?things] [?might] be linking to that instead of, or link to some device instead

**30:54** of, uh, big [?tick]eting system.

**30:56** Yeah.

**30:57** Maybe that's[?,] I think in this era of autonomy, we want to get rid of these ticketing systems.

**31:04** So we are, uh, kind of, [?embracing] this, um, idea of digital master.

**31:11** So we have, uh, for example, [?craft] database where we have, uh, kind of, uh, model the whole

**31:20** network.

**31:21** And we, we don't, we don't want any tickets anymore.

**31:24** We have, uh, network model, uh, for example, in craft database where we have all the devices,

**31:31** all the sites[?,] all the devices are, all the physical, uh, kind of components from the network

**31:37** and also kind of logical configuration data.

**31:41** So that's the database we want to link this hidden knowledge.

**31:46** So that whenever, for example, agent troubleshoot something and it, it's related to some, uh,

**31:54** physical site or physical device, that hidden knowledge is binding to that specific entity.

**32:02** [?So] when the agent [?is] troubleshooting something that is related to that entity, the distant memory

**32:09** or [?back] from the [?knowledge] base comes up.

**32:14** For example, with the context of [?what] is needed to know [?to] solve the issue.

**32:22** We don't want to fetch any bigger [?history] or bigger from this kind of legacy systems anymore.

**32:28** We want everything.

**32:30** So all the kind of workflows and, and, and yeah, pretty much workflows rely on that [?piece] of

**32:38** master with this, uh, kind of modeling network[?.]

**32:43** With all the [?knowledge] [?to] find [?it].  ⚠ low confidence (mean 0.55)

**32:46** Yep.

**32:47** So, so we have almost everything [?else].

**32:49** We have a lot of [?data][?,] [?but] this is the missing part of how to get that also.

**32:57** [?Yeah].  ⚠ low confidence (mean 0.48)

**32:58** We know it.

**32:59** We have, we have a, we have a people in [?Amsterdam] who has been working 30 years.

**33:03** They have a lot of information.

**33:05** During the summer, this happens.

**33:07** In this case, for example, that kind of [?thing].

**33:10** So how to collect that?

**33:12** Yeah.

**33:13** [?V]ectorize that data.

**33:15** We, we can see what's the temperature of certainty, but we can see all the link statuses,

**33:20** the optical measurements, the optical measurements, every technical detail.

**33:23** But if there's this kind of hidden knowledge that only people know about some certain component

**33:29** or software [?release] or anything that might happen.

**33:33** [?We] need to somehow bind that information[?.]

**33:37** [?During] the snow[?,] something happens in the final [?region][?.]

**33:41** [?Or] something like that.

**33:43** [?It]'s not[?,] [?it]'s not [?specific].  ⚠ low confidence (mean 0.57)

**33:46** So, any more?

**33:47** Sounds like an interesting challenge or?

**33:48** Yeah.

**33:49** We're going to do it in a...

**33:50** Impossible.

**33:51** Yeah.

**33:52** Possible.

**33:53** Yeah.

**33:54** Possible.

**33:55** [?P]ossible.

**33:56** Yeah.  ⚠ low confidence (mean 0.54)

**33:57** That's why we're here.

**33:58** Yeah.

**33:59** Of course, there is a[?...] something you probably don't have to think about that currently,

**34:05** but there is the GDPR [?wars], [?et] cetera, et cetera, that for example, [?for] [?all] the [?calls], et cetera.

**34:26** But maybe we don't take those into a [?car][?.]

**34:31** [?In] terms of[?,] maybe, maybe more like having this kind of...

**34:36** [?One] question.  ⚠ low confidence (mean 0.60)

**34:37** [?Question].

**34:38** [?Question].  ⚠ low confidence (mean 0.58)

**34:39** When you say autonomous decisions, there's a problem [?that] comes up and [?AI] can find some,

**34:43** like, hidden knowledge that how to solve this problem from some [?text] type or something.

**34:48** Should it implement the solution itself or should it provide the solution to an engineer

**34:53** and then he can implement it and make sure that it is the right solution?

**34:58** [?I] think currently, with these LLMs, we don't want to make any actions directly to the network.

**35:07** It's just, you know, to advise and assist.

**35:09** [?Just] give an answer back to the engineer.

**35:11** Yes.

**35:12** [?Yes].

**35:13** What could solve this and...

**35:14** Yeah.

**35:15** Yeah.

**35:16** Because it shows that it knows what was previously hidden.

**35:21** [?And] [?then] when [?this] kind of models get better and we can trust them to do actions, maybe this kind of a

**35:30** [?new] [?character] [?of] confidence model, for example, we can use those to [?do] actions.

**35:37** And AI would have the same access to the device, like you said, [?they] would know the exact model number,

**35:42** the [?firmware] number[??]  ⚠ low confidence (mean 0.56)

**35:43** Yes.

**35:44** Yes.

**35:45** Yes.

**35:46** Yes.

**35:47** Yes.

**35:48** Yes.

**35:49** Yes.

**35:50** [?Yeah].

**35:51** That's all more of a, if you can get that digital.

**35:52** Yeah.

**35:53** Okay.

**35:54** Okay.

**35:55** Okay.

**35:56** Okay.

**35:57** Okay.

**35:58** Okay.

**35:59** Okay.

**36:00** Okay.

**36:01** Okay.

**36:02** Okay.

**36:03** Okay.

**36:04** Okay.

**36:05** Okay.

**36:06** Okay.

**36:07** Okay.

**36:08** [?So], at least I will be here tomorrow.
