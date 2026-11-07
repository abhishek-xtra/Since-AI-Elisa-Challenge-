"""Module 8 gate: the API over a tmp out/ from a demo run."""
import pytest
from fastapi.testclient import TestClient

from api.app import app
from test_demo import run_demo


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    out = run_demo(tmp_path_factory.mktemp("api") / "out")
    mp = pytest.MonkeyPatch()
    mp.setenv("OUT_DIR", str(out))
    mp.setenv("LLM_OFFLINE", "1")
    yield TestClient(app)
    mp.undo()


def test_gets(client):
    a = client.get("/assertions")
    assert a.status_code == 200 and {"id", "trigger", "applies_to", "evidence"} <= set(a.json()[0])
    g = client.get("/graph")
    assert g.status_code == 200 and set(g.json()) == {"nodes", "edges"}
    t = client.get("/threads/thread-001")
    assert t.status_code == 200 and {"messages", "questions", "notifications", "captured"} <= set(t.json())
    b = client.get("/beats/3")
    assert b.status_code == 200 and set(b.json()) == {"beat", "title", "lines", "data"}
    assert client.get("/threads/nope").status_code == 404 and client.get("/beats/10").status_code == 404


def test_incident_declined(client):
    # the demo already closed TRN-101's edge question (beat 4), so it declines directly
    r = client.post("/incident", json={"entity_id": "TRN-101", "event": "sfp_replaced", "at_time": "2026-11-07T10:00:00+02:00",
                                       "symptoms": ["link_up", "optics_normal", "alarms_cleared", "counters_zero"]})
    assert r.status_code == 200 and set(r.json()) == {"results", "agent_text", "prior_knowledge"}
    assert [x["outcome"] for x in r.json()["results"]] == ["declined"] and "install_year" in r.json()["results"][0]["reason"]
    assert r.json()["agent_text"].startswith("No captured context applies")
    assert r.json()["prior_knowledge"] == "found"  # matched, then declined: the decline carries the reason


def test_incident_no_prior_knowledge(client):
    r = client.post("/incident", json={"entity_id": "TRN-101", "event": "alarm_raised", "at_time": "2026-11-07T10:00:00+02:00"})
    assert r.status_code == 200 and r.json()["results"] == [] and r.json()["prior_knowledge"] == "none"
    assert r.json()["agent_text"].startswith("No captured context applies")


def test_answer_nothing_pending(client):
    assert client.post("/answer", json={"assertion_id": "CA-0001", "option_index": 1}).status_code == 409


def test_answer_missing(client):
    assert client.post("/answer", json={"assertion_id": "CA-9999", "option_index": 0}).status_code == 404
