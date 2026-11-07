# get_context

The one tool the agent calls. Lives in `agent/get_context.py` (module 6). Deterministic: no model call anywhere in it.

```
get_context(entity_id: str, event: Event, symptoms: list[Symptom], at_time: datetime) -> list[ContextResult]
ContextResult: {assertion, outcome, reason, question?}        # contracts/models.py
```

`entity_id` is a node ID, or a site ID for a workflow event such as `dispatch_created`. A scope predicate on a site entity is evaluated against the site's own attributes (`site`, `region`; `id` is the site ID).

## Filter order

1. **Trigger match.** `trigger.kind == incident` and `event` equal and every trigger symptom present in `symptoms`; or `trigger.kind == workflow` and `event` equal. Not matched: not returned at all (counters rising never surfaces the counters-zero rule, and nobody is asked).
2. **Validity.** `valid_from <= at_time` and (`valid_to` null or `at_time < valid_to`). Otherwise `declined`, reason `"expired <date>"`; if `superseded_by` is set, reason `"superseded by <id> on <date>"` instead.
3. **Scope.** If `applies_to.decided` is set, evaluate only the decided predicate, with its edge. Otherwise evaluate every candidate with `against == 0`, each with its own edge (`contracts/predicates.md`).
   - All `holds`: `proposed`.
   - At least one `fails`/`missing` and none `holds`: `declined`. The reason names the failing candidates and, separately, any `unknown` ones ("install year 2023 is beyond the known edge 2019").
   - Any other mix (some hold and some fail, or something is `unknown` with nothing failing): `ambiguous`. The reason names the disagreeing or unknown candidates. If the question key is not in `questions_asked`, a `question` is attached.
4. **Trust.** `hunch` is returned `declined`, reason `"hunch, not verified"`, so the agent can mention it but must not propose it.
5. **Status.** `disputed` assertions go through precedence (below). `review` assertions are returned `declined`, reason `"under review"`.
6. **Proposal text** (built by the agent from a `proposed` result) must include: `action_text`, the `avoid` list, `said_by`, the source channel, the number of cases, and the dispute note if any.

## Precedence (disputed)

For two or more `disputed` assertions matching the same incident, order by: trust (`verified_by_outcome` > `stated` > `hunch`), then number of cases (more first), then `valid_from` (newer first). A strict winner is `proposed`, reason containing `"disputed: <other>'s <action_text>, <other trust>"`. Tied on all three: every one is `ambiguous`, reason `"tied dispute, escalate"`, no question.

## The one question

Built only here, only on `ambiguous`, only if its key is not in `assertion.questions_asked`.

**Key.** The candidates that made it ambiguous (those that hold and those that fail, or the `unknown` ones), as `<predicate>=<result>` strings, sorted, joined by `" | "`. Example: `"firmware == '4.1'=holds | install_year <= 2019=holds | model == 'TX-200'=holds | region == 'north'=holds | site == 'OULU-07'=fails"`. The same ambiguity is never asked twice; a genuinely new one (a 2020 unit after the site question was settled) has a different key and can be.

**Scope question** (some hold, some fail): one option per surviving candidate that holds for the new entity (the broad choice), one per candidate that fails (the narrow choice), plus `"No"` with `sets_decided: "id == '<origin>'"`.

```json
{"assertion_id": "CA-0001", "key": "...", "to": "Erkki Expert", "thread_id": "thread-001",
 "text": "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site.",
 "options": [
   {"label": "All older units", "sets_decided": "install_year <= 2019", "edge": "open"},
   {"label": "Only OULU-07",    "sets_decided": "site == 'OULU-07'"},
   {"label": "No",              "sets_decided": "id == 'TRN-042'"}
 ]}
```

**Edge question** (an `unknown` open candidate, nothing failing): "does it apply to a 2020 unit too?", options `{"label": "Yes", "edge_answer": "raise"}` (the number becomes the entity's value, edge stays open) and `{"label": "No", "edge_answer": "close"}` (edge closes at the current number). `decided` is unchanged by an edge answer, except that a raise also updates `decided.predicate` when `decided` is that candidate.

**Answer.** `answer(assertion_id, option_index)` applies the option, sets `status = decided` where `decided` was set, and appends the key to `questions_asked`. The question is written to `out/questions.json` for the frontend; the backend never delivers it anywhere else.
