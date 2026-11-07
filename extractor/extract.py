"""Extraction (BACKEND_PROMPT 5.1, 2b): one llm.structured call, then a deterministic evidence check in code.

The model never decides trust, candidates, IDs or dates.
"""
import json
import logging
import re
from datetime import UTC, datetime
from typing import get_args

import llm
from contracts.models import AppliesTo, Assertion, Evidence, ExtractedRule, ExtractionResult, Message, Trigger
from contracts.vocabulary import LISTS
from extractor.trust import derive_trust

log = logging.getLogger(__name__)

PROMPT_LISTS = ("trigger kinds", "events", "symptoms", "actions", "value-carrying actions", "roles")
VOCABULARY = "\n".join(f"- {name}: {', '.join(get_args(LISTS[name]))}" for name in PROMPT_LISTS)

EXAMPLE_THREAD = """[2026-03-10 14:02] Pekka Field (field_engineer): PSU fan alarm on rack 3 in the hub room. It cleared by itself but the temperature is still going up. All links are up.
[2026-03-10 14:05] Maija Senior (expert): Seen it before. If the PSU fan alarm clears but the temperature keeps climbing on the older rack units, swap the fan tray, don't power-cycle.
[2026-03-10 14:41] Pekka Field (field_engineer): Fan tray swapped, temperature dropping now."""

EXAMPLE_ANSWER = {
    "found": True,
    "rule": {
        "trigger_kind": "incident", "event": "alarm_raised", "symptoms": ["alarms_cleared", "other"],
        "stated_condition": "older rack units", "condition_is_relative": True,
        "action": "other", "action_text": "swap the fan tray", "avoid": ["node.reboot"],
        "excerpt": "If the PSU fan alarm clears but the temperature keeps climbing on the older rack units, swap the fan tray, don't power-cycle.",
        "said_by": "Maija Senior", "said_by_role": "expert",
        "hedged": False, "first_hand": False,
        "outcome": "recovered", "outcome_excerpt": "Fan tray swapped, temperature dropping now.",
        "about_entity": None,
    },
    "reason": "An expert states a condition and an action that applies to future fan alarms on older rack units. link_up is reported but is not part of the condition, so it is not a symptom; no device ID is named.",
}

SYSTEM = f"""You are an assistant that spots reusable operational rules in network-operations conversations (Teams chats, emails) between field engineers and experts at a telecom operator.

A reusable rule is a condition plus an action that would apply to a future incident or work step, not a one-off instruction. "Restart it now" about one device with no condition is not a rule. "When X happens on Y, do Z (and not W)" is. So is an expert's fix for a reported fault together with what not to do instead ("disable the interface, wait, enable it; don't reboot"): its condition is the reported fault. A fact a field crew needs every time they go to a site (for example where the key to a locked barrier is) is also a reusable rule: trigger_kind workflow, event dispatch_created, no symptoms, action site.access_key, action_text = where the key is.

Map everything into these controlled lists only. Anything that does not fit is "other", with the wording kept in action_text or stated_condition.
{VOCABULARY}

Meaning of the actions: interface.bounce = administratively disable an interface or port and enable it again; node.reboot = reboot, reload or power-cycle the whole device; sfp.replace = replace the optical module (SFP); counters.check = check traffic counters; site.access_key = where to get the key or access to a site.

Hard rules:
1. found=false and rule=null when the thread contains no reusable rule.
2. One rule per thread: the one most strongly stated.
3. excerpt is copied character for character from one or more messages: the sentence(s) in which the speaker states the action. Do not paraphrase, fix typos, or change punctuation or quotes.
4. said_by and said_by_role are the person who stated the rule, as written in the conversation header lines.
5. symptoms: only the listed symptoms the rule's condition requires: the fault the action is for, as the speaker of the rule names, checks or confirms it ("if the interface is UP but the counters stay at zero" -> link_up, counters_zero). When the speaker answers the reported fault without restating it ("seen this before", "that's it"), take the symptoms that make up the reported fault. Leave out readings reported only as normal or as background ("optics OK", "alarms cleared", "everything can look normal") unless the speaker names them in the condition. Empty for a workflow rule.
6. avoid: actions the speaker says not to do or to do only as a last resort ("don't reboot", "before replacing the SFP again").
7. hedged=true when the speaker of the rule hedges: "maybe", "I think", "might", "probably", "someone said".
8. first_hand=true only when the speaker reports something they did or saw themselves ("I moved it", "it's in the cabinet now", "I'm at the site and the gate is open"), not something they were told.
9. condition_is_relative=true when the stated condition is a comparative with no number stated by the rule's speaker ("older units", "the big sites"), even if someone else in the thread guessed a number.
10. outcome="recovered" only if a later message reports the action worked ("traffic is back", "did that, works"); outcome="failed" only if a later message reports the action was tried and did not work ("didn't help", "no change, had to reboot"). In both cases outcome_excerpt is that message's text copied character for character. Otherwise outcome="unknown" and outcome_excerpt=null.
11. about_entity: the device or site ID the current case is about, exactly as written in the thread (e.g. "TRN-087"); null if none is named. Not a device mentioned only as a past example.
12. Never output device IDs, dates or trust levels anywhere except in about_entity and inside copied text.

Worked example (a different domain).
Conversation:
{EXAMPLE_THREAD}
Answer:
{json.dumps(EXAMPLE_ANSWER, indent=2)}
"""

STOPWORDS = frozenset("""
that this then than them they there their these those with without from into onto over under again also just only
very much more most some such when what which while where will would should could have has had been being were
your yours ours unless until once each every both either other another about after before still even like make
does done doing dont don't it's isn't wait little thing things
""".split())


def norm(text: str) -> str:
    return " ".join(text.split())


def _content_words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9']+", text.lower()) if len(w) >= 4 and w not in STOPWORDS}


def thread_prompt(messages: list[Message]) -> str:
    return "\n".join(f"[{m.timestamp:%Y-%m-%d %H:%M}] {m.author} ({m.role}): {m.text}" for m in messages)


def extract(messages: list[Message], recorded_at: datetime | None = None) -> tuple[Assertion, ExtractedRule] | None:
    """Zero or one UNBOUND assertion for the thread, plus the parsed rule for the binder.

    The returned rule's outcome is 'unknown' unless its outcome_excerpt passed the evidence check, so the binder
    can map rule.outcome straight to the case outcome.
    """
    if not messages:
        return None
    result = llm.structured(SYSTEM, thread_prompt(messages), ExtractionResult, model=llm.EXTRACT_MODEL)
    if not result.found or result.rule is None:
        log.info("no rule: %s", result.reason)
        return None
    rule = result.rule
    thread = norm("\n".join(m.text for m in messages))
    if not norm(rule.excerpt) or norm(rule.excerpt) not in thread:
        log.warning("dropped: excerpt is not verbatim in the thread: %r", rule.excerpt)
        return None
    if not _content_words(rule.action_text) & _content_words(rule.excerpt):
        log.warning("dropped: action_text %r shares no content word with the excerpt", rule.action_text)
        return None
    if rule.outcome != "unknown" and not (rule.outcome_excerpt and norm(rule.outcome_excerpt) in thread):
        log.warning("outcome ignored: outcome_excerpt is not verbatim in the thread: %r", rule.outcome_excerpt)
        rule = rule.model_copy(update={"outcome": "unknown"})
    # the role is the header's, never the model's (or the speaker's own) claim; an email's author is its From line
    roles = {m.author.casefold(): m.role for m in messages}
    if (role := roles.get(rule.said_by.strip().casefold())) and role != rule.said_by_role:
        log.info("said_by_role %r replaced by %s's header role %r", rule.said_by_role, rule.said_by, role)
        rule = rule.model_copy(update={"said_by_role": role})
    elif role is None:
        log.info("said_by %r is not a message author; keeping the model's role %r", rule.said_by, rule.said_by_role)
    workflow = rule.trigger_kind == "workflow"
    assertion = Assertion(
        id="CA-0000",
        trigger=Trigger(kind=rule.trigger_kind, event=rule.event, symptoms=[] if workflow else sorted(set(rule.symptoms))),
        applies_to=AppliesTo(entity_type="site" if workflow else "transmission_node", candidates=[], decided=None),
        action=rule.action,
        action_text=rule.action_text,
        avoid=list(dict.fromkeys(rule.avoid)),
        evidence=Evidence(cases=[], sources=list(dict.fromkeys(f"{m.channel}:{m.thread_id}" for m in messages)),
                          excerpt=rule.excerpt, said_by_role=rule.said_by_role, said_by=rule.said_by),
        trust=derive_trust(rule, None if rule.outcome == "unknown" else rule.outcome),
        status="open",
        questions_asked=[],
        supersedes=None,
        superseded_by=None,
        recorded_at=recorded_at or datetime.now(UTC),
        valid_from=messages[0].timestamp,
        valid_to=None,
        valid_while=None,
    )
    return assertion, rule
