"""Store contract suite: every store passes the same tests. NeoStore runs only when NEO4J_URI is set."""
import copy
import json
import os
from collections import Counter
from pathlib import Path

import pytest

from contracts.models import Assertion, Topology
from store.export import export_pyvis
from store.json_store import JsonStore
from test_contracts import EXAMPLE_ASSERTION  # the 4.4 example

TOPOLOGY = Topology.model_validate_json(Path("data/topology.json").read_text(encoding="utf-8"))


def core() -> Assertion:
    d = copy.deepcopy(EXAMPLE_ASSERTION)
    d["evidence"]["sources"] = ["teams:thread-001", "email:email-001"]  # adapter source ids
    return Assertion.model_validate(d)


def barrier(id, text, at, supersedes=None, superseded_by=None, valid_to=None) -> Assertion:
    return Assertion.model_validate({
        "id": id, "trigger": {"kind": "workflow", "event": "dispatch_created", "symptoms": []},
        "applies_to": {"entity_type": "site", "decided": None, "candidates": [
            {"predicate": "site == 'OULU-03'", "support": 1, "against": 0, "basis": "the site named in the text"}]},
        "action": "site.access_key", "action_text": text, "avoid": [],
        "evidence": {"cases": [{"entity": "OULU-03", "at": at, "outcome": None}], "sources": [f"email:{id}"],
                     "excerpt": text, "said_by_role": "field_engineer", "said_by": "Veikko"},
        "trust": "stated", "status": "decided", "questions_asked": [], "supersedes": supersedes,
        "superseded_by": superseded_by, "recorded_at": at, "valid_from": at, "valid_to": valid_to, "valid_while": None})


OLD = barrier("CA-0002", "the key is at the neighbouring farm, ask for Mäkelä", "2026-10-02T08:00:00Z",
              superseded_by="CA-0003", valid_to="2026-11-07T10:00:00Z")
NEW = barrier("CA-0003", "the key moved, it's in the site cabinet now", "2026-11-07T10:00:00Z", supersedes="CA-0002")


@pytest.fixture(params=["json", "neo"])
def store(request, tmp_path):
    if request.param == "json":
        yield JsonStore(tmp_path / "store.json")
        return
    if not os.environ.get("NEO4J_URI"):
        pytest.skip("set NEO4J_URI to test Neo4j")
    from store.neo_store import NeoStore
    s = NeoStore(os.environ["NEO4J_URI"], os.environ.get("NEO4J_USER", "neo4j"), os.environ.get("NEO4J_PASSWORD", "hackathon"))
    s.replace_all([])
    yield s
    s.close()


@pytest.fixture
def full(store):
    for a in (core(), OLD, NEW):
        store.put(a)
    return store


def test_empty_next_id(store):
    assert store.all() == [] and store.next_id() == "CA-0001" and store.get("CA-0001") is None


def test_round_trip_upsert_and_next_id(store):
    store.put(core())
    store.put(OLD)
    assert store.next_id() == "CA-0003"
    assert store.get("CA-0001") == core() and store.get("CA-0002") == OLD
    store.put(core())  # upsert by id, no duplicate
    assert [a.id for a in store.all()] == ["CA-0001", "CA-0002"]


def test_by_entity(full):
    assert [a.id for a in full.by_entity("TRN-042")] == ["CA-0001"]
    assert [a.id for a in full.by_entity("OULU-03")] == ["CA-0002", "CA-0003"]
    assert [a.id for a in full.by_entity("OULU-07")] == ["CA-0001"]  # site == candidate
    assert full.by_entity("TRN-999") == []


def test_replace_all(full):
    full.replace_all([NEW])
    assert full.all() == [NEW]


def test_graph(full):
    g = full.graph(TOPOLOGY)
    nodes = {n["id"]: n for n in g["nodes"]}
    kinds = Counter(e["kind"] for e in g["edges"])
    assert {n["kind"] for n in g["nodes"]} == {"assertion", "node", "site", "region", "model", "source"}
    assert all(e["from"] in nodes and e["to"] in nodes for e in g["edges"])

    scoped = [e for e in g["edges"] if e["kind"] == "SCOPED_BY" and e["from"] == "CA-0001"]
    assert len(scoped) == len(core().applies_to.candidates)
    assert {(e["to"], e["predicate"]) for e in scoped} == {
        ("TRN-042", "install_year <= 2019"), ("model:TX-200", "model == 'TX-200'"), ("TRN-042", "firmware == '4.1'"),
        ("OULU-07", "site == 'OULU-07'"), ("region:north", "region == 'north'")}
    assert all(e["support"] == 1 and e["against"] == 0 for e in scoped)
    assert {e["predicate"]: e["edge"] for e in scoped}["install_year <= 2019"] == "open"
    assert kinds["SCOPED_BY"] == 7

    ev = {e["to"] for e in g["edges"] if e["kind"] == "EVIDENCED_BY" and e["from"] == "CA-0001"}
    assert ev == {"teams:thread-001", "email:email-001"} and nodes["email:email-001"]["kind"] == "source"
    assert [e["to"] for e in g["edges"] if e["kind"] == "CASE" and e["from"] == "CA-0001"] == ["TRN-042"]
    assert (kinds["IN_SITE"], kinds["IN_REGION"], kinds["OF_MODEL"]) == (20, 4, 20)

    assert nodes["TRN-042"]["attrs"] == {"model": "TX-200", "install_year": 2019, "firmware": "4.1", "site": "OULU-07", "region": "north"}
    a1, a2 = nodes["CA-0001"], nodes["CA-0002"]
    assert a1["label"] == "Bounce, don't reboot" and a2["label"] == nodes["CA-0003"]["label"] == "Site access"
    assert a1["attrs"]["trust"] == "verified_by_outcome" and a1["attrs"]["status"] == "open"
    assert a1["attrs"]["cases"] == 1 and a1["attrs"]["valid_to"] is None and a1["attrs"]["superseded_by"] is None
    assert a2["attrs"]["superseded_by"] == "CA-0003" and a2["attrs"]["valid_to"].startswith("2026-11-07")
    json.dumps(g)  # serialisable as out/graph.json


def test_label_fallback():
    from store.base import label
    a = core().model_copy(update={"action": "counters.check", "action_text": "check the error counters twice first"})
    assert label(a) == "check the error counters"


def test_json_reload(tmp_path):
    path = tmp_path / "s.json"
    s = JsonStore(path)
    for a in (NEW, core(), OLD):
        s.put(a)
    assert JsonStore(path).all() == s.all() and [a.id for a in s.all()] == ["CA-0001", "CA-0002", "CA-0003"]
    assert [d["id"] for d in json.loads(path.read_text(encoding="utf-8"))["assertions"]] == ["CA-0001", "CA-0002", "CA-0003"]


def test_export_pyvis(full, tmp_path):
    out = tmp_path / "graph.html"
    export_pyvis(full.graph(TOPOLOGY), str(out))
    html = out.read_text(encoding="utf-8")
    assert "CA-0001" in html and "SCOPED_BY" in html
