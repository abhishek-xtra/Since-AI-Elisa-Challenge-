"""Module 8 gate: demo.py end to end, offline from the cache, into a tmp OUT_DIR."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent


def run_demo(out: Path) -> Path:
    env = {**os.environ, "LLM_OFFLINE": "1", "OUT_DIR": str(out)}
    subprocess.run([sys.executable, str(ROOT / "demo.py")], cwd=ROOT, env=env, check=True, capture_output=True)
    return out


def load(out: Path, name: str):
    return json.loads((out / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    return run_demo(tmp_path_factory.mktemp("demo") / "out")


def test_six_beats(out):
    for n in range(1, 8):
        b = load(out, f"beat_{n}.json")
        assert b["beat"] == n and b["title"] and b["lines"] and isinstance(b["data"], dict)
    assert load(out, "beat_1.json")["data"]["results"] == []


def test_beat3_proposed_without_reboot(out):
    d = load(out, "beat_3.json")["data"]
    assert d["results_before"][0]["outcome"] == "ambiguous" and d["question"]["options"][0]["label"] == "All older units"
    assert [r["outcome"] for r in d["results"]] == ["proposed"]
    assert d["proposal"]["action"] != "node.reboot"
    action = d["agent_text"].split("Avoid:")[0]
    assert "reboot" not in action.lower() and "node.reboot" in d["agent_text"].split("Avoid:")[1]
    assert d["counters"] == {"messages": 12, "assertions": 1, "forms": 0, "taps": 1}
    assert "12 messages · 1 assertion · 0 forms · 1 tap" in load(out, "beat_3.json")["lines"]


def test_beat4_edge_question_then_declined(out):
    b = load(out, "beat_4.json")
    d = b["data"]
    assert [r["outcome"] for r in d["results_before"]] == ["ambiguous"]
    assert d["question"]["key"] == "install_year <= 2019=unknown"
    assert [o["label"] for o in d["question"]["options"]] == ["Yes", "No"]
    assert d["assertion"]["applies_to"]["decided"] == {"predicate": "install_year <= 2019", "edge": "closed"}
    r, = d["results"]
    assert r["outcome"] == "declined" and "install_year" in r["reason"] and r["question"] is None
    assert b["title"] == "Decline" and any(l.startswith("No cutoff was invented.") for l in b["lines"])


def test_beat6_superseded(out):
    results = load(out, "beat_6.json")["data"]["results"]
    assert any("superseded" in r["reason"] and r["outcome"] == "declined" for r in results)
    assert any(r["outcome"] == "proposed" and "cabinet" in r["assertion"]["action_text"] for r in results)
    assert all(r["question"] is None for r in results)


def test_graph_edge_kinds(out):
    kinds = {e["kind"] for e in load(out, "graph.json")["edges"]}
    assert {"SCOPED_BY", "EVIDENCED_BY", "CASE", "IN_SITE", "IN_REGION", "OF_MODEL"} <= kinds


def test_thread_001(out):
    t = load(out, "thread_thread-001.json")
    assert len(t["messages"]) == 12
    assert [q["entity_id"] for q in t["questions"]] == ["TRN-087", "TRN-101"]
    assert "site == 'OULU-07'=fails" in t["questions"][0]["key"] and t["questions"][1]["key"] == "install_year <= 2019=unknown"
    assert all(q["answered"] for q in t["questions"])
    assert [n["entity_id"] for n in t["notifications"]] == ["TRN-087", "TRN-105"]  # beats 3 and 7
    assert all(n["to"] == "Erkki Expert" for n in t["notifications"])
    assert t["captured"] == [{"message_id": "teams:thread-001:8", "assertion_id": "CA-0001"}]


def test_deterministic(out, tmp_path):
    again = run_demo(tmp_path / "out")
    for n in range(1, 8):
        assert (out / f"beat_{n}.json").read_bytes() == (again / f"beat_{n}.json").read_bytes(), n
