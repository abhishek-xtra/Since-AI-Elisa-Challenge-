"""Break tests, section C (demo and API). docs/BREAK_TESTS.md; findings in docs/break/B_rules.md. LLM_OFFLINE=1 throughout."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.app import app
from store.json_store import JsonStore

sys.path.insert(0, str(Path(__file__).parent))
from test_break_rules import bounce  # noqa: E402

ROOT = Path(__file__).parent.parent.parent
SYMPTOMS = ["link_up", "optics_normal", "alarms_cleared", "counters_zero"]
AT = "2026-11-07T10:00:00+02:00"


def demo(out: Path, *args) -> subprocess.CompletedProcess:
    env = {**os.environ, "LLM_OFFLINE": "1", "OUT_DIR": str(out), "PYTHONIOENCODING": "utf-8"}
    return subprocess.run([sys.executable, str(ROOT / "demo.py"), *args], cwd=ROOT, env=env, capture_output=True,
                          text=True, encoding="utf-8")


@pytest.fixture(scope="module")
def demo_out(tmp_path_factory):
    out = tmp_path_factory.mktemp("c") / "out"
    r = demo(out)
    assert r.returncode == 0, r.stderr
    return out


@pytest.fixture
def client(monkeypatch, tmp_path):
    """A client over an out/ holding one undecided core assertion (so questions can be pending)."""
    monkeypatch.setenv("LLM_OFFLINE", "1")
    monkeypatch.setenv("OUT_DIR", str(tmp_path / "out"))
    JsonStore(tmp_path / "out" / "store.json").replace_all([bounce()])
    return TestClient(app, raise_server_exceptions=False)


def incident(c, entity="TRN-087", **kw):
    return c.post("/incident", json={"entity_id": entity, "event": "sfp_replaced", "symptoms": SYMPTOMS, "at_time": AT, **kw})


# ---------- C1: --beat 3 without beat 2 ----------

def test_c1_beat3_on_fresh_out(tmp_path):
    r = demo(tmp_path / "out", "--beat", "3")
    assert r.returncode != 0 and "beat 3 needs the state of beat 2" in r.stderr and "Traceback" not in r.stderr


@pytest.mark.xfail(strict=False, reason="break test C1b: --beat 3 on an out/ left by a full run crashes (question is None)")
def test_c1b_beat3_on_dirty_out(tmp_path):
    out = tmp_path / "out"
    assert demo(out).returncode == 0
    r = demo(out, "--beat", "3")
    assert r.returncode == 0, r.stderr[-600:]


# ---------- C2: symptom outside the vocabulary, and other bad bodies ----------

def test_c2_bad_symptom_is_422(client):
    r = incident(client, symptoms=["smoke"])
    assert r.status_code == 422 and "symptoms" in json.dumps(r.json())


def test_c2_bad_event_and_unknown_entity(client):
    assert incident(client, event="power_cut").status_code == 422
    r = incident(client, entity="TRN-999")
    assert r.status_code == 404 and r.json()["detail"] == "TRN-999 is not in the topology"


@pytest.mark.xfail(strict=False, reason="break test C2b: a naive at_time (no offset) is a 500, TypeError aware vs naive")
def test_c2b_naive_at_time(client):
    r = incident(client, at_time="2026-11-07T10:00:00")
    assert r.status_code in (200, 422), (r.status_code, r.text[:200])


# ---------- C4: answer through the API ----------

def test_c4_answer_flow(client):
    r = incident(client)
    assert r.status_code == 200 and r.json()["results"][0]["outcome"] == "ambiguous"
    assert client.post("/answer", json={"assertion_id": "CA-0001", "option_index": 99}).status_code == 422
    assert client.post("/answer", json={"assertion_id": "CA-0001", "option_index": -1}).status_code == 422
    assert client.post("/answer", json={"assertion_id": "CA-0001", "option_index": 0}).status_code == 200
    assert client.post("/answer", json={"assertion_id": "CA-0001", "option_index": 2}).status_code == 409


# ---------- C5: a malformed predicate in the store ----------

@pytest.mark.xfail(strict=False, reason="break test C5: a malformed predicate makes /incident a 404 'not found' for a node that exists")
def test_c5_bad_predicate_is_not_404(client, tmp_path):
    bad = bounce(id="CA-0002", action="sfp.replace", text="x", cands=[("install_year == '2019'", "closed")])
    JsonStore(tmp_path / "out" / "store.json").replace_all([bounce(), bad])
    r = incident(client, entity="TRN-042")
    assert r.status_code == 200, (r.status_code, r.json())


# ---------- C6: path traversal through /threads/{id} on Windows ----------

@pytest.mark.xfail(strict=False, reason="break test C6: backslashes in thread_id escape out/ on Windows")
def test_c6_threads_path_traversal(client, tmp_path):
    secret = tmp_path / "secret.json"
    secret.write_text('{"leak": true}', encoding="utf-8")
    r = client.get("/threads/..%5C..%5C..%5Csecret")  # out\thread_..\..\..\secret.json -> tmp\secret.json
    assert r.status_code == 404, (r.status_code, r.text[:200])


# ---------- C7: demo twice in the same out/ ----------

def test_c7_demo_twice_same_out(demo_out):
    before = {p.name: p.read_bytes() for p in demo_out.iterdir()}
    assert demo(demo_out).returncode == 0
    after = {p.name: p.read_bytes() for p in demo_out.iterdir()}
    assert before.keys() == after.keys()
    assert [n for n in before if before[n] != after[n]] == []


# ---------- C8: GET endpoints on a missing out/ and odd ids ----------

def test_c8_gets_without_demo(monkeypatch, tmp_path):
    monkeypatch.setenv("OUT_DIR", str(tmp_path / "nothing"))
    c = TestClient(app, raise_server_exceptions=False)
    assert c.get("/graph").status_code == 404 and c.get("/assertions").status_code == 404
    assert c.get("/beats/abc").status_code == 422 and c.get("/beats/-1").status_code == 404


def test_c8_incident_on_empty_out(monkeypatch, tmp_path):
    monkeypatch.setenv("OUT_DIR", str(tmp_path / "empty"))
    monkeypatch.setenv("LLM_OFFLINE", "1")
    r = incident(TestClient(app, raise_server_exceptions=False))
    assert r.status_code == 200 and r.json()["results"] == []
