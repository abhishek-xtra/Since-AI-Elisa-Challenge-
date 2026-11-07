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
