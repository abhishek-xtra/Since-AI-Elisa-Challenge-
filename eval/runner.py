"""Run one scenario folder against a fresh store and check data/scenarios/<folder>/expected.json.

Each check is a (name, passed, why) triple. Semantics of the expected.json keys: docs/DECISIONS.md ("Scenario data,
expected.json extensions" and "Module 7").
"""
import json
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from agent import read_json_list
from agent.get_context import get_context
from agent.outcomes import record_outcome
from agent.questions import answer
from pipeline import ROOT, ingest, load_topology
from store.json_store import JsonStore

SCENARIOS = ROOT / "data" / "scenarios"
RECORDED = datetime(2026, 11, 7, tzinfo=timezone.utc)  # fixed so runs are reproducible


@dataclass
class ScenarioResult:
    scenario: str
    trap: str
    lane: str
    placeholder: bool
    inputs: list
    checks: list = field(default_factory=list)  # (name, passed, why)

    @property
    def passed(self) -> bool:
        return all(ok for _, ok, _ in self.checks)


def load_expected(folder) -> dict:
    return json.loads((Path(folder) / "expected.json").read_text(encoding="utf-8"))


def trap_line(folder) -> str:
    """The script's 'Trap:' line (its first line is the output file name), else the folder name."""
    script = Path(folder) / "script.md"
    lines = script.read_text(encoding="utf-8").splitlines() if script.exists() else []
    return next((l.strip()[len("Trap:"):].strip() for l in lines if l.strip().startswith("Trap:")), Path(folder).name)


def chain_inputs(name: str, seen=()) -> list[str]:
    """Inputs of a folder's ingest_first chain, recursively, in order, then the folder's own."""
    if name in seen:
        raise ValueError(f"ingest_first cycle at {name}")
    exp = load_expected(SCENARIOS / name)
    return [p for dep in exp.get("ingest_first", []) for p in chain_inputs(dep, (*seen, name))] + exp.get("inputs", [])


# ---------- matching helpers ----------

def _dt(v):
    try:
        return datetime.fromisoformat(v) if isinstance(v, str) and "T" in v else None
    except ValueError:
        return None


def subset(exp, act, path="") -> str | None:
    """None if exp is a recursive subset of act, else where it differs."""
    if isinstance(exp, dict):
        if not isinstance(act, dict):
            return f"{path or '.'}: expected an object, got {act!r}"
        for k, v in exp.items():
            if k not in act:
                return f"{path}.{k}: missing"
            if (why := subset(v, act[k], f"{path}.{k}")):
                return why
        return None
    if isinstance(exp, list):
        if not isinstance(act, list):
            return f"{path}: expected a list, got {act!r}"
        if all(not isinstance(x, (dict, list)) for x in exp):  # scalars: same set
            return None if set(exp) == set(act) else f"{path}: {sorted(act)} != {sorted(exp)}"
        for i, x in enumerate(exp):  # objects: each expected element is a subset of some actual element
            if not any(subset(x, y) is None for y in act):
                return f"{path}[{i}]: no element matches {x!r}"
        return None
    if _dt(exp) and _dt(act):
        return None if _dt(exp) == _dt(act) else f"{path}: {act} != {exp}"
    return None if exp == act else f"{path}: {act!r} != {exp!r}"


def pred_matches(spec, predicate: str) -> bool:
    if isinstance(spec, str):
        return predicate == spec
    if "predicate" in spec:
        return predicate == spec["predicate"]
    return predicate.startswith(spec["predicate_prefix"])


def select(items, sel: dict | None, get=lambda x: x):
    """Filter assertions (or results, via get) by {'action': ...} and/or {'action_text_contains': ...}."""
    sel = sel or {}
    return [x for x in items
            if ("action" not in sel or get(x).action == sel["action"])
            and ("action_text_contains" not in sel or sel["action_text_contains"].lower() in get(x).action_text.lower())]


# ---------- checks ----------

def check_assertion(a, exp: dict):
    why = subset(exp, a.model_dump(mode="json"))
    return "assertion", why is None, why or f"{a.id} matches"


def check_bind(a, bind: dict):
    preds = [c.predicate for c in a.applies_to.candidates]
    out = []
    for spec in bind.get("candidates_include", []):
        ok = any(pred_matches(spec, p) for p in preds)
        out.append((f"bind include {spec}", ok, "present" if ok else f"not in {preds}"))
    for spec in bind.get("candidates_exclude", []):
        hit = [p for p in preds if pred_matches(spec, p)]
        out.append((f"bind exclude {spec}", not hit, f"present: {hit}" if hit else "absent"))
    return out


def check_candidate(a, spec: dict):
    name = f"candidate {spec.get('predicate') or spec.get('predicate_prefix')}"
    c = next((c for c in a.applies_to.candidates if pred_matches(spec, c.predicate)), None)
    if c is None:
        return name, False, f"no such candidate in {[c.predicate for c in a.applies_to.candidates]}"
    got = f"{c.predicate} support={c.support} against={c.against} edge={c.edge}"
    bad = [k for k, ok in (("support", spec.get("support", c.support) == c.support),
                           ("against", spec.get("against", c.against) == c.against),
                           ("against_min", c.against >= spec.get("against_min", 0)),
                           ("edge", spec.get("edge", c.edge) == c.edge)) if not ok]
    return name, not bad, got + (f" (wrong {', '.join(bad)})" if bad else "")


def check_checks(store, a, checks: dict):
    out = []
    every = store.all()
    for key, want in checks.items():
        if key == "assertion_count":
            out.append((key, len(every) == want, f"{len(every)} assertion(s), want {want}"))
            continue
        if key == "statuses":
            for action, status in want.items():
                got = [x.status for x in every if x.action == action]
                out.append((f"status {action}", set(got) == {status}, f"{got}, want {status}"))
            continue
        if a is None:
            out.append((key, False, "no target assertion"))
            continue
        if key == "candidates":
            out += [check_candidate(a, spec) for spec in want]
            continue
        old = store.get(a.supersedes) if a.supersedes else None
        got = {
            "case_count": lambda: len(a.evidence.cases),
            "source_count": lambda: len(a.evidence.sources),
            "origin_entity": lambda: a.evidence.cases[0].entity if a.evidence.cases else None,
            "questions_asked": lambda: len(a.questions_asked),
            "action_text_contains": lambda: a.action_text,
            "supersedes_old": lambda: bool(old and old.superseded_by == a.id),
            "old_valid_to": lambda: old.valid_to.isoformat() if old and old.valid_to else None,
        }
        if key not in got:
            out.append((key, False, "unknown check key"))
            continue
        val = got[key]()
        if key == "action_text_contains":
            ok = want.lower() in val.lower()
        elif key == "old_valid_to":
            ok = val is not None and _dt(val) == _dt(want)
        else:
            ok = val == want
        out.append((key, ok, f"{a.id}: {val!r}, want {want!r}"))
    return out


def _one_target(store, s: dict):
    return select(store.all(), {"action": s["assertion_action"]} if "assertion_action" in s else s.get("select"))


def run_steps(store, topology, steps: list):
    """Incident, answer and outcome steps, in order."""
    out = []
    for i, step in enumerate(steps, 1):
        if "answer" in step:
            s = step["answer"]
            name = f"step {i} answer {s['option_label']!r}"
            targets = _one_target(store, s)
            if len(targets) != 1:
                out.append((name, False, f"{len(targets)} assertions match"))
                continue
            qs = [q for q in read_json_list("questions.json") if q["assertion_id"] == targets[0].id]
            labels = [o["label"] for o in qs[-1]["options"]] if qs else []
            if s["option_label"] not in labels:
                out.append((name, False, f"no such option; asked: {labels}"))
                continue
            a = answer(store, targets[0].id, labels.index(s["option_label"]), topology)
            out.append((name, True, f"{a.id} status={a.status} decided={a.applies_to.decided.predicate if a.applies_to.decided else None}"))
        elif "outcome" in step:
            s = step["outcome"]
            name = f"step {i} outcome {s['outcome']} on {s['entity']}"
            targets = _one_target(store, s)
            if len(targets) != 1:
                out.append((name, False, f"{len(targets)} assertions match"))
                continue
            a = record_outcome(store, topology, targets[0].id, s["entity"], s["outcome"], datetime.fromisoformat(s["at"]))
            out.append((name, True, f"{a.id} cases={len(a.evidence.cases)} status={a.status} trust={a.trust}"))
        else:
            out.append(check_incident(store, topology, i, step))
    return out


def check_incident(store, topology, i, inc):
    name = f"step {i} {inc['entity']} {inc['event']} @{inc['at'][:10]} -> {inc['expect']}"
    if inc.get("select"):
        name += f" [{', '.join(map(str, inc['select'].values()))}]"
    results = get_context(store, topology, inc["entity"], inc["event"], inc["symptoms"], datetime.fromisoformat(inc["at"]))
    picked = select(results, inc.get("select"), get=lambda r: r.assertion)
    if inc["expect"] == "absent":
        return name, not picked, "not returned" if not picked else f"returned: {[(r.assertion.id, r.outcome) for r in picked]}"
    if len(picked) != 1:
        return name, False, f"{len(picked)} results: {[(r.assertion.id, r.outcome, r.reason) for r in picked]}"
    r = picked[0]
    ok = r.outcome == inc["expect"] and inc.get("reason_contains", "").lower() in r.reason.lower()
    q = f"; question: {r.question.text}" if r.question else ""
    return name, ok, f"{r.assertion.id} {r.outcome}: {r.reason}{q}"


def run_scenario(folder, topology=None, out_dir=None) -> ScenarioResult:
    """Fresh JsonStore and OUT_DIR in a temp dir (created under out_dir if given)."""
    folder = Path(folder)
    topology = topology or load_topology()
    exp = load_expected(folder)
    res = ScenarioResult(folder.name, trap_line(folder), exp.get("lane", "spine"), exp.get("placeholder", False),
                         exp.get("inputs", []))
    if out_dir:
        Path(out_dir).mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out_dir) as tmp:
        old_out = os.environ.get("OUT_DIR")
        os.environ["OUT_DIR"] = str(Path(tmp) / "out")
        try:
            _run(exp, JsonStore(Path(tmp) / "store.json"), topology, res)
        except Exception as e:  # one broken scenario must not stop the table
            res.checks.append(("run", False, f"{type(e).__name__}: {e}"))
        finally:
            if old_out is None:
                os.environ.pop("OUT_DIR", None)
            else:
                os.environ["OUT_DIR"] = old_out
    return res


def _run(exp, store, topology, res):
    first = [p for dep in exp.get("ingest_first", []) for p in chain_inputs(dep)]
    ingest([ROOT / p for p in first], store, topology, recorded_at=RECORDED)
    before = {a.id for a in store.all()}
    touched = [store.get(a.id) for a in ingest([ROOT / p for p in exp.get("inputs", [])], store, topology, recorded_at=RECORDED)]
    # target: a new assertion from this folder's inputs, else one they merged into, else the store's only one
    new = [a for a in touched if a.id not in before]
    target = (new or touched or (store.all() if len(store.all()) == 1 else [None]))[0]
    if exp.get("extracted") is not None:
        got = bool(touched)
        what = (f"created {[a.id for a in new]}, changed {[a.id for a in touched if a.id in before]}" if got
                else "nothing created or changed")
        res.checks.append(("extracted", got == exp["extracted"], what))
    if "assertion" in exp:
        res.checks.append(check_assertion(target, exp["assertion"]) if target else ("assertion", False, "no assertion"))
    if "bind" in exp:
        res.checks += check_bind(target, exp["bind"]) if target else [("bind", False, "no assertion")]
    res.checks += check_checks(store, target, exp.get("checks", {}))
    res.checks += run_steps(store, topology, exp.get("incidents", []))


def scenario_folders() -> list[Path]:
    return sorted(f for f in SCENARIOS.iterdir() if (f / "expected.json").exists())


def run_all(out_dir=None) -> list[ScenarioResult]:
    topology = load_topology()
    return [run_scenario(f, topology, out_dir) for f in scenario_folders()]


if __name__ == "__main__":
    from eval.case_table import write_case_table
    results = run_all()
    write_case_table(results)
    print(f"{sum(r.passed for r in results)}/{len(results)} scenarios pass; docs/CASE_TABLE.md and docs/case_table.json written")
