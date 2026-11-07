"""Module 8: the six demo beats (BACKEND_PROMPT section 7). Runs fully from the LLM cache (LLM_OFFLINE=1 works).

py -3.14 demo.py            all six beats on a fresh out/ (OUT_DIR overrides out/)
py -3.14 demo.py --beat N   one beat on the state the previous beats left in out/ (beat 1 starts fresh)
py -3.14 demo.py --clean    wipe out/

Every beat prints a title and its facts, writes out/beat_N.json with the same content as data, then regenerates
out/graph.json, out/graph.html, out/assertions.json and out/thread_<id>.json. No wall clock anywhere.
"""
import argparse
import json
import shutil
import sys
from datetime import datetime, timedelta, timezone

from agent import out_path, read_json_list
from agent.get_context import get_context
from agent.questions import answer
from agent.stand_in import propose, proposal_text
from binder.bind import _ws
from contracts.models import Message
from pipeline import ADAPTERS, ROOT, ingest, load_topology
from store.export import export_pyvis
from store.json_store import JsonStore

H = timezone(timedelta(hours=2))
INCIDENT_AT = datetime(2026, 11, 7, 10, tzinfo=H)   # TRN-087 and TRN-101 (DECISIONS item 11)
DISPATCH_AT = datetime(2026, 11, 8, 8, tzinfo=H)    # barrier dispatch
RECORDED_AT = datetime(2026, 11, 6, tzinfo=timezone.utc)
SFP = "sfp_replaced"
SYMPTOMS = ["link_up", "optics_normal", "alarms_cleared", "counters_zero"]
CORE = [ROOT / "data/elisa_examples/teams_chat.json", ROOT / "data/elisa_examples/email.txt"]
BARRIER = ROOT / "data/scenarios/12_barrier/email.txt"
UPDATE = ROOT / "data/scenarios/12b_barrier_update/thread.json"
VIDEO_LINE = ("Nobody edited anything. The newer message replaced the old fact, "
              "and the old one is kept with the date it stopped being true.")
TOPO = load_topology()


def dump(x) -> dict:
    return x.model_dump(mode="json")


def store() -> JsonStore:
    return JsonStore(out_path("store.json"))


def wipe() -> None:
    out = out_path("")
    out.mkdir(parents=True, exist_ok=True)
    for p in out.iterdir():
        shutil.rmtree(p) if p.is_dir() else p.unlink()


# ---------- out/ artefacts ----------

def write_json(name: str, data) -> None:
    p = out_path(name)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def thread_of(a) -> str:
    """The thread a question or notification about this assertion goes to: its first source (as build_question)."""
    return a.evidence.sources[0].split(":", 1)[-1] if a.evidence.sources else ""


def write_thread(messages: list[Message], s: JsonStore) -> None:
    """out/thread_<id>.json: messages in display order, questions and notifications targeting it, captured excerpts."""
    tid = messages[0].thread_id
    messages = sorted(messages, key=lambda m: m.timestamp)  # stable: same-minute messages keep file order
    captured = []
    for a in s.all():
        if not any(src.split(":", 1)[-1] == tid for src in a.evidence.sources):
            continue
        excerpt = _ws(a.evidence.excerpt)
        holder = next((m for m in messages if excerpt and excerpt in _ws(m.text)), None)
        if holder:
            captured.append({"message_id": holder.id, "assertion_id": a.id})
    write_json(f"thread_{tid}.json", {
        "thread_id": tid, "channel": messages[0].channel, "messages": [dump(m) for m in messages],
        "questions": [{**q, "answered": q["key"] in s.get(q["assertion_id"]).questions_asked}
                      for q in read_json_list("questions.json") if q["thread_id"] == tid],
        "notifications": [n for n in read_json_list("notifications.json")
                          if (a := s.get(n["assertion_id"])) and thread_of(a) == tid],
        "captured": captured})


def refresh(s: JsonStore, new_threads: list[list[Message]] = ()) -> None:
    """Regenerate graph, assertions and every thread file seen so far (existing thread_*.json plus new_threads)."""
    graph = s.graph(TOPO)
    write_json("graph.json", graph)
    export_pyvis(graph, str(out_path("graph.html")))
    write_json("assertions.json", [dump(a) for a in s.all()])
    threads = {m[0].thread_id: m for m in new_threads}
    for p in sorted(out_path("").glob("thread_*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        threads.setdefault(d["thread_id"], [Message.model_validate(m) for m in d["messages"]])
    for messages in threads.values():
        write_thread(messages, s)


def emit(n: int, title: str, lines: list[str], data: dict) -> None:
    print(f"\n=== Beat {n}: {title} ===")
    for line in lines:
        print("  " + line)
    write_json(f"beat_{n}.json", {"beat": n, "title": title, "lines": lines, "data": data})


def ingest_files(s: JsonStore, paths) -> list[list[Message]]:
    ingest(paths, s, TOPO, recorded_at=RECORDED_AT)
    return [ADAPTERS[p.suffix](p) for p in paths]


def result_line(r) -> str:
    return f"{r.assertion.id} {r.outcome}: {r.reason}"


def question_lines(q) -> list[str]:
    return [f"Question to {q.to} in {q.thread_id}: {q.text}", *[f"  [{i}] {o.label}" for i, o in enumerate(q.options)]]


# ---------- the six beats ----------

def beat1(s: JsonStore):
    results = get_context(s, TOPO, "TRN-087", SFP, SYMPTOMS, INCIDENT_AT)
    p = propose(results, "TRN-087", SFP, SYMPTOMS)
    text = proposal_text(results, p)
    lines = [f"Incident: {SFP} on TRN-087 at {INCIDENT_AT.isoformat()}, symptoms {', '.join(SYMPTOMS)}",
             f"Store: {len(s.all())} assertions",
             f"get_context -> {json.dumps([dump(r) for r in results])}: no context",
             f"Agent: {text}"]
    return "No context", lines, {"results": [dump(r) for r in results], "proposal": dump(p), "agent_text": text}, []


def beat2(s: JsonStore):
    threads = ingest_files(s, CORE)
    a = s.all()[0]
    asked = len(read_json_list("questions.json"))
    lines = ["Ingested: " + ", ".join(f"{p.name} ({len(m)} message{'s' * (len(m) != 1)})" for p, m in zip(CORE, threads)),
             f"Assertion {a.id}: {a.action}, \"{a.action_text}\", avoid {', '.join(a.avoid)}",
             f"Trigger: {a.trigger.kind} {a.trigger.event} with {', '.join(a.trigger.symptoms)}",
             f"Said by {a.evidence.said_by} ({a.evidence.said_by_role}), sources {', '.join(a.evidence.sources)}",
             f"Candidates ({len(a.applies_to.candidates)}):"]
    lines += [f"  {c.predicate}  support={c.support} against={c.against} edge={c.edge}" for c in a.applies_to.candidates]
    lines += [f"Trust: {a.trust}", f"{asked} questions asked",
              "Wrote out/graph.json and out/graph.html"]
    return "Capture and link", lines, {"assertion": dump(a), "counters": {
        "messages": sum(map(len, threads)), "assertions": len(s.all()), "questions_asked": asked}}, threads


def beat3(s: JsonStore):
    first = get_context(s, TOPO, "TRN-087", SFP, SYMPTOMS, INCIDENT_AT)
    q = first[0].question
    a = answer(s, q.assertion_id, 0, TOPO)
    second = get_context(s, TOPO, "TRN-087", SFP, SYMPTOMS, INCIDENT_AT)
    p = propose(second, "TRN-087", SFP, SYMPTOMS)
    text = proposal_text(second, p)
    chat = ADAPTERS[".json"](CORE[0])
    counters = {"messages": len(chat), "assertions": len(s.all()), "forms": 0, "taps": 1}
    lines = [f"Incident: {SFP} on TRN-087", *map(result_line, first),
             *question_lines(q),
             f"{q.to} taps [0] {q.options[0].label}: decided {a.applies_to.decided.predicate} "
             f"({a.applies_to.decided.edge} edge), status {a.status}",
             "Re-run:", *map(result_line, second),
             f"Agent: {text}",
             f"{counters['messages']} messages · {counters['assertions']} assertion · {counters['forms']} forms · "
             f"{counters['taps']} tap"]
    return "First use and the one question", lines, {
        "results_before": [dump(r) for r in first], "question": dump(q), "answer": {"option_index": 0},
        "assertion": dump(a), "results": [dump(r) for r in second], "proposal": dump(p), "agent_text": text,
        "counters": counters}, []


def beat4(s: JsonStore):
    first = get_context(s, TOPO, "TRN-101", SFP, SYMPTOMS, INCIDENT_AT)
    q = first[0].question
    a = answer(s, q.assertion_id, 1, TOPO)  # Erkki taps "No": the open edge closes where it is
    second = get_context(s, TOPO, "TRN-101", SFP, SYMPTOMS, INCIDENT_AT)
    d = a.applies_to.decided
    lines = [f"Incident: {SFP} on TRN-101", *map(result_line, first), *question_lines(q),
             f"{q.to} taps [1] {q.options[1].label}: boundary now stated by {q.to.split()[0]}: {d.predicate}, {d.edge}",
             "Re-run:", *map(result_line, second),
             f"No cutoff was invented. 2019 was only the newest unit it had worked on; {q.to.split()[0]} set the boundary."]
    return "Decline", lines, {"results_before": [dump(r) for r in first], "question": dump(q),
                              "answer": {"option_index": 1}, "assertion": dump(a),
                              "results": [dump(r) for r in second]}, []


def beat5(s: JsonStore):
    threads = ingest_files(s, [BARRIER])
    results = get_context(s, TOPO, "OULU-03", "dispatch_created", [], DISPATCH_AT)
    proposed = [r for r in results if r.outcome == "proposed"]
    notes = read_json_list("notifications.json")
    lines = [f"Ingested {BARRIER.name} ({threads[0][0].timestamp.date().isoformat()})",
             f"dispatch_created for OULU-03 at {DISPATCH_AT.isoformat()}", *map(result_line, results),
             *[f"Key location before the drive: {r.assertion.action_text}" for r in proposed],
             "Notifications:", *[f"  to {n['to']}: {n['text']}" for n in notes]]
    return "Barrier", lines, {"results": [dump(r) for r in results], "notifications": notes}, threads


def beat6(s: JsonStore):
    threads = ingest_files(s, [UPDATE])
    barrier = [a for a in s.all() if a.trigger.event == "dispatch_created"]
    results = get_context(s, TOPO, "OULU-03", "dispatch_created", [], DISPATCH_AT)
    questions = [r.question for r in results if r.question]
    lines = [f"Ingested {UPDATE.parent.name}/{UPDATE.name} ({threads[0][0].timestamp.date().isoformat()})"]
    lines += [f"{a.id}: \"{a.action_text}\" said by {a.evidence.said_by}, valid_from {a.valid_from.date().isoformat()}, "
              f"valid_to {a.valid_to.date().isoformat() if a.valid_to else None}, superseded_by {a.superseded_by}"
              for a in barrier]
    lines += [f"dispatch_created for OULU-03 at {DISPATCH_AT.isoformat()}", *map(result_line, results),
              f"{len(questions)} questions asked", VIDEO_LINE]
    return "Update", lines, {"assertions": [dump(a) for a in barrier], "results": [dump(r) for r in results],
                             "questions": [dump(q) for q in questions], "video_line": VIDEO_LINE}, threads


BEATS = {1: beat1, 2: beat2, 3: beat3, 4: beat4, 5: beat5, 6: beat6}


def run(n: int) -> None:
    if n == 1:
        wipe()
    elif not out_path(f"beat_{n - 1}.json").exists():
        sys.exit(f"beat {n} needs the state of beat {n - 1}: run demo.py (or --beat {n - 1}) first")
    elif out_path(f"beat_{n}.json").exists():  # out/ already holds a later state; beat n would run on the wrong one
        sys.exit(f"beat {n} already ran in this out/: run demo.py --clean (or start again from --beat 1)")
    s = store()
    title, lines, data, threads = BEATS[n](s)
    emit(n, title, lines, data)
    refresh(s, threads)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--beat", type=int, choices=sorted(BEATS))
    ap.add_argument("--clean", action="store_true")
    args = ap.parse_args()
    if args.clean:
        wipe()
    elif args.beat:
        run(args.beat)
    else:
        for n in BEATS:
            run(n)


if __name__ == "__main__":
    main()
