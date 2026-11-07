"""scripts/video_timeline.py offline: the event log for the video page is stable (kinds and counts) and repeatable."""
import json
import os
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).parent.parent
COUNTS = {"message": 31, "capture": 5, "incident": 14, "notification": 6, "no_capture": 3, "answer": 2,
          "supersede": 1, "retract": 1, "expire": 1}


def run(out: Path) -> dict:
    env = {**os.environ, "LLM_OFFLINE": "1"}
    subprocess.run([sys.executable, str(ROOT / "scripts" / "video_timeline.py"), "--out", str(out)], cwd=ROOT, env=env,
                   check=True, capture_output=True)
    return json.loads(out.read_text(encoding="utf-8"))


def test_kinds_and_counts_stable(tmp_path):
    log = run(tmp_path / "a.json")
    events = log["events"]
    assert Counter(e["kind"] for e in events) == COUNTS
    assert [e["index"] for e in events] == list(range(len(events)))
    assert (tmp_path / "a.json").read_text(encoding="utf-8") == (ROOT / "out" / "video_timeline.json").read_text(encoding="utf-8")
    # verbatim: every captured excerpt is in a message read before it
    seen = ""
    for e in events:
        if e["kind"] == "message":
            seen += " " + " ".join(e["text"].split())
        elif e["kind"] == "capture":
            assert " ".join(e["this_excerpt"].split()) in seen
    assert not (tmp_path / "out").exists()
    # the demo story: the one question, the tap, the proposal; the edge question and "No"; Sami without a question
    inc = [e for e in events if e["kind"] == "incident"]
    trn087 = [r for e in inc if e["entity"] == "TRN-087" for r in e["results"]]
    assert trn087[0]["outcome"] == "ambiguous" and trn087[0]["question"] and trn087[1]["outcome"] == "proposed"
    assert [(a["option_label"], a["decided"]["edge"]) for a in events if a["kind"] == "answer"] == \
        [("All older units", "open"), ("No", "closed")]
    sami = next(e for e in inc if e["entity"] == "TRN-105")
    assert [r["outcome"] for r in sami["results"]] == ["proposed"] and not sami["results"][0]["question"]
    assert sami["agent_text"]


def test_variants(tmp_path):
    """The two short-clip variants: 08_conflict gives a dispute; the hedged 12b gives a hunch that supersedes nothing."""
    for name in ("dispute", "hunch", "all"):
        out = tmp_path / f"{name}.json"
        subprocess.run([sys.executable, str(ROOT / "scripts" / "video_timeline.py"), "--variant", name, "--out", str(out)],
                       cwd=ROOT, env={**os.environ, "LLM_OFFLINE": "1"}, check=True, capture_output=True)
        assert out.read_text(encoding="utf-8") == (ROOT / "out" / f"video_timeline_{name}.json").read_text(encoding="utf-8")
        events = json.loads(out.read_text(encoding="utf-8"))["events"]
        if name in ("dispute", "all"):
            assert next(e for e in events if e["kind"] == "dispute")["said_by"] == ["Erkki Expert", "Jari Korhonen"]
            continue
        hunch = [e["assertion_id"] for e in events if e["kind"] == "capture" and e["trust"] == "hunch"]
        assert len(hunch) == 1 and not any(e["kind"] == "supersede" for e in events)
        assert all(r["outcome"] != "proposed" for e in events if e["kind"] == "incident"
                   for r in e["results"] if r["assertion_id"] == hunch[0])
