"""Event log for the video's "context tree" page (frontend-ui /grow). Visualisation data only: the system has no tree.

py -3.14 scripts/video_timeline.py [--variant dispute|hunch] [--out PATH] [--all] [--skip FOLDER ...]

Default: the demo story. Elisa's chat and email, 12_barrier, 12b_barrier_update, 13 Sami, 14 road closed, 15 retraction,
plus 04 chit-chat and 16 one-off as noise that captures nothing. --all: every synthetic thread (05 to 10 and the hedged
12b too), which changes the outcome (docs/DECISIONS.md, "Video timeline"). --skip leaves further scenario folders (or
"<folder>/<file>") out of either set. --variant writes out/video_timeline_<name>.json for a short clip: "dispute" adds
08_conflict (Jari against Erkki), "hunch" swaps the 12b update for its hedged variant.

One JsonStore, the chosen captured conversations ingested in date order with pipeline.ingest (as demo.py does),
and the incidents of every scenario's expected.json plus the demo beats' incidents and answers run with get_context at
their own timestamps, interleaved by date. Every field is copied from the store, the extractor's result or a
ContextResult; nothing is written by hand. questions.json and notifications.json go to a temp OUT_DIR, so out/beat_*.json
is never touched. Offline (LLM_OFFLINE=1) once the cache holds every call.
"""
import argparse
import json
import logging
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import demo  # noqa: E402  constants only: times, paths, symptoms
from agent import read_json_list  # noqa: E402
from agent.get_context import get_context, scope_results, trigger_matches, validity_reason  # noqa: E402
from agent.questions import answer  # noqa: E402
from agent.stand_in import propose, proposal_text  # noqa: E402
from binder.bind import _ws  # noqa: E402
from extractor import extract  # noqa: E402
from extractor.merge import dispute_pairs  # noqa: E402
from extractor.vote import entity_type  # noqa: E402
from pipeline import ADAPTERS, ROOT, ingest  # noqa: E402
from predicates import lookup  # noqa: E402
from store.json_store import JsonStore  # noqa: E402

SCENARIOS = ROOT / "data" / "scenarios"
TOPO = demo.TOPO


def captures() -> list[Path]:
    """Every real captured conversation: Elisa's chat and email, each scenario thread / email (incl. 13 and the hedged one)."""
    found = [*demo.CORE, *sorted(SCENARIOS.glob("*/thread*.json")), *sorted(SCENARIOS.glob("*/email.txt"))]
    return list(dict.fromkeys(found))


def beat_groups() -> list[list[dict]]:
    """demo.py beats 3 to 9 as steps (beat 1 needs an empty store, which a single timeline never has after 2 Oct)."""
    sfp = lambda e, at: {"entity": e, "event": demo.SFP, "symptoms": demo.SYMPTOMS, "at": at, "propose": True}
    disp = lambda e, at: {"entity": e, "event": "dispatch_created", "symptoms": [], "at": at, "propose": True}
    return [[{**sfp("TRN-087", demo.INCIDENT_AT), "source": "beat 3"}, {"answer_index": 0, "source": "beat 3"},
             {**sfp("TRN-087", demo.INCIDENT_AT), "source": "beat 3"}],
            [{**sfp("TRN-101", demo.INCIDENT_AT), "source": "beat 4"}, {"answer_index": 1, "source": "beat 4"},
             {**sfp("TRN-101", demo.INCIDENT_AT), "source": "beat 4"}],
            [{**disp("OULU-03", demo.DISPATCH_AT), "source": "beats 5, 6"}],
            [{**sfp("TRN-105", demo.SECOND_AT), "source": "beat 7"}],
            [{**disp("OULU-11", demo.ROAD_BEFORE), "source": "beat 8"}],
            [{**disp("OULU-11", demo.ROAD_AFTER), "source": "beat 8"}],
            [{**sfp("TRN-087", demo.RETRACTED_AT), "source": "beat 9"}]]


def scenario_groups() -> list[list[dict]]:
    """Each scenario's incidents steps (incident, answer, outcome) as one group, in file order."""
    from datetime import datetime
    groups = []
    for f in sorted(SCENARIOS.glob("*/expected.json")):
        steps, group = json.loads(f.read_text(encoding="utf-8")).get("incidents", []), []
        for s in steps:
            if "answer" in s:
                group.append({"answer_label": s["answer"]["option_label"], "action": s["answer"].get("assertion_action"),
                              "source": f.parent.name})
            elif "entity" in s:
                if group and "entity" in group[-1]:
                    groups.append(group)  # consecutive incidents are separate groups; an answer binds to the one before
                    group = []
                group.append({"entity": s["entity"], "event": s["event"], "symptoms": s["symptoms"],
                              "at": datetime.fromisoformat(s["at"]), "propose": True, "source": f.parent.name})
        if group:
            groups.append(group)
    return groups


def msg(m) -> dict:
    return {"kind": "message", "at": m.timestamp.isoformat(), "id": m.id, "author": m.author, "role": m.role,
            "channel": m.channel, "thread_id": m.thread_id, "timestamp": m.timestamp.isoformat(), "text": m.text}


def tip(a) -> dict:
    """The assertion as the tree draws it, verbatim from the store."""
    return {"assertion_id": a.id, "trigger": a.trigger.model_dump(mode="json"), "action": a.action,
            "action_text": a.action_text, "avoid": a.avoid, "excerpt": a.evidence.excerpt, "said_by": a.evidence.said_by,
            "said_by_role": a.evidence.said_by_role, "trust": a.trust, "status": a.status,
            "entity_type": a.applies_to.entity_type,
            "candidates": [{"predicate": c.predicate, "edge": c.edge, "support": c.support, "against": c.against,
                            "basis": c.basis} for c in a.applies_to.candidates],
            "decided": a.applies_to.decided.model_dump(mode="json") if a.applies_to.decided else None,
            "cases": [c.model_dump(mode="json") for c in a.evidence.cases], "sources": a.evidence.sources,
            "valid_from": a.valid_from.isoformat(), "valid_to": a.valid_to.isoformat() if a.valid_to else None,
            "supersedes": a.supersedes, "superseded_by": a.superseded_by}


class Log(logging.Handler):
    def __init__(self):
        super().__init__(logging.INFO)
        self.lines = []

    def emit(self, record):
        msg = record.getMessage()
        for root in (str(ROOT), ROOT.as_posix()):  # no machine paths in the log: the file must be identical on every clone
            msg = msg.replace(root, '<repo>')
        msg = msg.replace('\\', '/')  # Windows separators: the file must be identical across OSes too
        self.lines.append((record.name, msg))


def holders(messages, excerpt: str) -> list[str]:
    """Messages holding the excerpt: the one containing it, else the ones it spans."""
    e = _ws(excerpt)
    one = [m.id for m in messages if e and e in _ws(m.text)]
    return one[:1] or [m.id for m in messages if _ws(m.text) and _ws(m.text) in e]


def do_capture(path: Path, s: JsonStore, log: Log, ev: list) -> None:
    messages = ADAPTERS[path.suffix](path)
    ev += [msg(m) for m in messages]
    at = max(m.timestamp for m in messages).isoformat()
    tid = messages[0].thread_id
    before = {a.id: a for a in s.all()}
    log.lines.clear()
    out = extract(messages, recorded_at=demo.RECORDED_AT)  # cache hit; read here for the rule (retracts, this thread's excerpt)
    ingest([path], s, TOPO, recorded_at=demo.RECORDED_AT)
    after = s.all()
    changed = [a for a in after if before.get(a.id) != a]
    if out is None or not changed:
        why = [m for n, m in log.lines if n.startswith("extractor")]
        ev.append({"kind": "no_capture", "at": at, "thread_id": tid, "source": str(path.relative_to(ROOT).as_posix()),
                   "reason": why[0] if why else None, "log": [m for _, m in log.lines]})
        return
    rule = out[1]
    changed.sort(key=lambda a: a.id in before)  # a new assertion before the ones it supersedes or disputes
    for a in changed:
        old = before.get(a.id)
        if rule.retracts:
            ev.append({"kind": "retract", "at": at, "assertion_id": a.id, "thread_id": tid, "said_by": rule.said_by,
                       "excerpt": rule.excerpt, "message_ids": holders(messages, rule.excerpt),
                       "status_before": old.status, "status": a.status, "sources": a.evidence.sources})
        elif old and old.superseded_by is None and a.superseded_by:
            ev.append({"kind": "supersede", "at": at, "assertion_id": a.id, "superseded_by": a.superseded_by,
                       "valid_to": a.valid_to.isoformat(), "action_text": a.action_text,
                       "new_action_text": s.get(a.superseded_by).action_text})
        elif old is None or a.evidence != old.evidence:  # a status-only change is told by the dispute event
            how = ("new" if old is None else "new_case" if len(a.evidence.cases) > len(old.evidence.cases) else "new_source")
            ev.append({"kind": "capture", "at": at, "how": how, "thread_id": tid,
                       "source": str(path.relative_to(ROOT).as_posix()), "this_excerpt": rule.excerpt,
                       "message_ids": holders(messages, rule.excerpt), "status_before": old.status if old else None,
                       "dispute_with": sorted({x for p in dispute_pairs(after) if a.id in p for x in p} - {a.id}),
                       **tip(a)})
    for p in sorted(set(dispute_pairs(after)) - set(dispute_pairs(list(before.values())))):
        ev.append({"kind": "dispute", "at": at, "assertions": list(p), "action_texts": [s.get(x).action_text for x in p],
                   "said_by": [s.get(x).evidence.said_by for x in p], "trust": [s.get(x).trust for x in p]})


def run_incident(step: dict, s: JsonStore, ev: list, expired: set) -> list:
    at = step["at"]
    entity = lookup(TOPO, step["entity"])
    notes_before = len(read_json_list("notifications.json"))
    results = get_context(s, TOPO, step["entity"], step["event"], step["symptoms"], at)
    text = None
    if step.get("propose") and any(r.outcome == "proposed" for r in results):
        text = proposal_text(results, propose(results, step["entity"], step["event"], step["symptoms"]))
    per = []
    for r in results:
        a = r.assertion
        cand = {} if validity_reason(a, at) or entity_type(entity) != a.applies_to.entity_type else scope_results(a, entity, TOPO)
        per.append({"assertion_id": a.id, "trigger_matched": True, "validity": validity_reason(a, at),
                    "candidates": cand, "decided": a.applies_to.decided.predicate if a.applies_to.decided else None,
                    "outcome": r.outcome, "reason": r.reason,
                    "question": r.question.model_dump(mode="json") if r.question else None,
                    "action_text": a.action_text, "said_by": a.evidence.said_by, "trust": a.trust, "status": a.status})
    missed = [a.id for a in s.all() if not trigger_matches(a, step["event"], step["symptoms"])]
    site = entity.id if entity_type(entity) == "site" else entity.site
    ev.append({"kind": "incident", "at": at.isoformat(), "entity": step["entity"], "event": step["event"],
               "entity_site": site, "entity_region": lookup(TOPO, site).region, "symptoms": step["symptoms"], "source": step["source"], "results": per, "not_matched": missed,
               "agent_text": text})
    for r in results:
        if r.reason.startswith("expired") and r.assertion.id not in expired:
            expired.add(r.assertion.id)
            ev.append({"kind": "expire", "at": at.isoformat(), "assertion_id": r.assertion.id, "reason": r.reason,
                       "valid_to": r.assertion.valid_to.isoformat(), "action_text": r.assertion.action_text})
    for n in read_json_list("notifications.json")[notes_before:]:
        ev.append({"kind": "notification", **n})
    return results


def do_answer(step: dict, last: list, s: JsonStore, ev: list, at) -> None:
    """Apply the answer only to a question the previous incident actually attached; else nothing happened."""
    qs = [r.question for r in last if r.question and (not step.get("action") or r.assertion.action == step["action"])]
    if not qs:
        return
    q = qs[0]
    labels = [o.label for o in q.options]
    i = step["answer_index"] if "answer_index" in step else labels.index(step["answer_label"]) \
        if step["answer_label"] in labels else None
    if i is None:
        return
    a = answer(s, q.assertion_id, i, TOPO)
    ev.append({"kind": "answer", "at": at.isoformat(), "assertion_id": a.id, "to": q.to, "thread_id": q.thread_id, "key": q.key,
               "option_index": i, "option_label": labels[i], "source": step["source"],
               "decided": a.applies_to.decided.model_dump(mode="json") if a.applies_to.decided else None,
               "status": a.status, "candidates": [{"predicate": c.predicate, "edge": c.edge} for c in a.applies_to.candidates]})


# Synthetic threads written to test one rule each on a fresh store; together they change the demo's outcome.
NOT_DEMO = {"05_mentioned_in_passing", "06_hunch", "07_reworded_other_model", "08_conflict", "09_failed_2016", "10_typos",
            "12c_barrier_hedged", "12b_barrier_update/thread_hedged.json"}


VARIANTS = {
    "all": set(),  # every synthetic thread: the fullest honest state (changes the outcome, docs/DECISIONS.md)
    "dispute": NOT_DEMO - {"08_conflict"},
    "hunch": (NOT_DEMO - {"12c_barrier_hedged", "12b_barrier_update/thread_hedged.json"}) | {"12b_barrier_update/thread.json"},
}


def build(skip=frozenset(NOT_DEMO)) -> list[dict]:
    """skip: scenario folders, or "<folder>/<file>", left out (inputs and incidents). Default: the demo story."""
    schedule = []  # (time, rank, seq, kind, payload): captures, then demo beats, then scenarios at the same instant
    for i, p in enumerate(p for p in captures() if p.parent.name not in skip and f"{p.parent.name}/{p.name}" not in skip):
        schedule.append((max(m.timestamp for m in ADAPTERS[p.suffix](p)), 0, i, "capture", p))
    scen = [g for g in scenario_groups() if g[0]["source"] not in skip]
    for rank, groups in ((1, beat_groups()), (2, scen)):
        for i, g in enumerate(groups):
            schedule.append((g[0]["at"], rank, i, "group", g))
    schedule.sort(key=lambda x: x[:3])
    log = Log()
    logging.getLogger().addHandler(log)
    logging.getLogger().setLevel(logging.INFO)
    ev, expired, ran = [], set(), {}
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["OUT_DIR"] = str(Path(tmp) / "out")
        s = JsonStore(Path(tmp) / "store.json")
        for at, _, _, kind, payload in schedule:
            if kind == "capture":
                do_capture(payload, s, log, ev)
                continue
            last = []
            for step in payload:
                if "entity" not in step:
                    do_answer(step, last, s, ev, payload[0]["at"])
                    continue
                k = (step["entity"], step["event"], tuple(sorted(step["symptoms"])), step["at"])
                state = json.dumps([a.model_dump(mode="json") for a in s.all()])
                if ran.get(k) == state:
                    last = []  # the same incident on an unchanged store: same result, not repeated in the log
                    continue
                last = run_incident(step, s, ev, expired)
                ran[k] = json.dumps([a.model_dump(mode="json") for a in s.all()])
    for i, e in enumerate(ev):
        e["index"] = i
    return ev


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--variant", choices=sorted(VARIANTS), help="a short-clip variant of the demo story")
    ap.add_argument("--out", help="default out/video_timeline.json, or out/video_timeline_<variant>.json")
    ap.add_argument("--all", action="store_true", help="every synthetic thread too (changes the outcome)")
    ap.add_argument("--skip", nargs="*", default=[], help="further scenario folders to leave out")
    args = ap.parse_args()
    args.out = args.out or str(ROOT / "out" / f"video_timeline{'_' + args.variant if args.variant else ''}.json")
    base = set() if args.all else VARIANTS[args.variant] if args.variant else NOT_DEMO
    events = build(base | set(args.skip))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps({"note": "Visualisation for the video. The tree is drawn from the stored "
                                          "assertions; the system itself has no tree.", "events": events},
                                         indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts = {}
    for e in events:
        counts[e["kind"]] = counts.get(e["kind"], 0) + 1
    print(f"{len(events)} events -> {args.out}: " + ", ".join(f"{k} {v}" for k, v in counts.items()))


if __name__ == "__main__":
    main()
