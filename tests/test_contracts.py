import json
import re
from pathlib import Path
from typing import get_args

import jsonschema
import pytest

from contracts import vocabulary
from contracts.models import SCHEMAS, Assertion, Topology, json_schema

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = ROOT / "contracts"

# The example from BACKEND_PROMPT.md 4.4, verbatim.
EXAMPLE_ASSERTION = {
    "id": "CA-0001",
    "trigger": {"kind": "incident", "event": "sfp_replaced", "symptoms": ["link_up", "optics_normal", "counters_zero"]},
    "applies_to": {
        "entity_type": "transmission_node",
        "candidates": [
            {"predicate": "install_year <= 2019", "edge": "open", "support": 1, "against": 0, "basis": "Erkki: 'older units'; 2019 is TRN-042's install_year, not a stated boundary (Veikko guessed 'around 2019')"},
            {"predicate": "model == 'TX-200'", "support": 1, "against": 0, "basis": "attribute of TRN-042"},
            {"predicate": "firmware == '4.1'", "support": 1, "against": 0, "basis": "attribute of TRN-042"},
            {"predicate": "site == 'OULU-07'", "support": 1, "against": 0, "basis": "attribute of TRN-042"},
            {"predicate": "region == 'north'", "support": 1, "against": 0, "basis": "attribute of TRN-042's site"},
        ],
        "decided": None,
    },
    "action": "interface.bounce",
    "action_text": "disable the interface, wait, enable it",
    "avoid": ["node.reboot", "sfp.replace"],
    "evidence": {
        "cases": [{"entity": "TRN-042", "at": "2026-11-01T09:25:00Z", "outcome": "recovered"}],
        "sources": ["teams:thread-001", "email:001"],
        "excerpt": "Disable the interface, wait a little, then enable it again. Don't reboot the whole unit unless that fails.",
        "said_by_role": "expert",
        "said_by": "Erkki Expert",
    },
    "trust": "verified_by_outcome",
    "status": "open",
    "questions_asked": [],
    "supersedes": None,
    "superseded_by": None,
    "recorded_at": "2026-11-06T00:00:00Z",
    "valid_from": "2026-11-01T00:00:00Z",
    "valid_to": None,
    "valid_while": None,
}


def load(name):
    return json.loads((CONTRACTS / f"{name}.schema.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("name", SCHEMAS)
def test_committed_schema_matches_models(name):
    assert load(name) == json_schema(name), "regenerate with: py -3.14 -m contracts.models"


@pytest.mark.parametrize("name", SCHEMAS)
def test_schema_is_valid_2020_12(name):
    jsonschema.Draft202012Validator.check_schema(load(name))


def test_example_assertion_validates_and_round_trips():
    jsonschema.validate(EXAMPLE_ASSERTION, load("assertion"), cls=jsonschema.Draft202012Validator)
    a = Assertion.model_validate(EXAMPLE_ASSERTION)
    assert a.applies_to.candidates[0].edge == "open" and a.applies_to.candidates[1].edge == "closed"
    dumped = json.loads(a.model_dump_json())
    jsonschema.validate(dumped, load("assertion"), cls=jsonschema.Draft202012Validator)
    assert Assertion.model_validate(dumped) == a


def test_schema_rejects_unknown_action():
    bad = {**EXAMPLE_ASSERTION, "action": "interface.flap"}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, load("assertion"), cls=jsonschema.Draft202012Validator)


def test_topology_validates_and_has_seed_nodes():
    data = json.loads((ROOT / "data" / "topology.json").read_text(encoding="utf-8"))
    jsonschema.validate(data, load("topology"), cls=jsonschema.Draft202012Validator)
    topo = Topology.model_validate(data)
    sites = {s.id: s for s in topo.sites}
    nodes = {n.id: n for n in topo.nodes}
    assert len(sites) == 4 and {s.region for s in topo.sites} == {"north", "south"}
    assert {"OULU-07", "OULU-11", "OULU-03"} <= sites.keys() and all(sites[s].region == "north" for s in ("OULU-07", "OULU-11", "OULU-03"))
    assert 18 <= len(nodes) <= 22 and len(nodes) == len(topo.nodes)
    assert all(n.site in sites for n in topo.nodes)
    seed = lambda n: (n.model, n.install_year, n.firmware)
    assert seed(nodes["TRN-042"]) == ("TX-200", 2019, "4.1") and nodes["TRN-042"].site == "OULU-07"
    assert seed(nodes["TRN-087"]) == ("TX-200", 2018, "4.1") and nodes["TRN-087"].site == "OULU-11"
    assert seed(nodes["TRN-101"]) == ("TX-300", 2023, "5.2")
    attrs = [seed(n)[:2] for n in topo.nodes]
    assert ("TX-250", 2018) in attrs and ("TX-200", 2016) in attrs
    assert ("TX-200", 2020, "4.1") in [seed(n) for n in topo.nodes]


def parse_vocabulary_md():
    lists = {}
    for line in (CONTRACTS / "vocabulary.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^- ([a-z -]+): (`.*)$", line)
        if m:
            lists[m.group(1)] = re.findall(r"`([^`]+)`", m.group(2))
    return lists


def test_vocabulary_py_matches_md():
    md = parse_vocabulary_md()
    assert md.keys() == vocabulary.LISTS.keys()
    for name, lit in vocabulary.LISTS.items():
        assert list(get_args(lit)) == md[name], name


def test_spec_vocabulary_present():
    md = parse_vocabulary_md()
    assert md["value-carrying actions"] == ["site.access_key"]
    for name, values in {"events": ["sfp_replaced", "dispatch_created", "alarm_raised"],
                         "symptoms": ["link_up", "link_down", "optics_normal", "optics_low", "counters_zero", "counters_rising", "alarms_cleared"],
                         "actions": ["interface.bounce", "node.reboot", "sfp.replace", "counters.check", "site.access_key", "other"],
                         "trust": ["hunch", "stated", "verified_by_outcome"],
                         "assertion status": ["open", "decided", "disputed", "review"],
                         "per-entity outcome": ["proposed", "declined", "ambiguous"]}.items():
        assert set(values) <= set(md[name]), name


def enums_in(schema):
    """Every enum list anywhere in a JSON schema."""
    if isinstance(schema, dict):
        if "enum" in schema:
            yield schema["enum"]
        for v in schema.values():
            yield from enums_in(v)
    elif isinstance(schema, list):
        for v in schema:
            yield from enums_in(v)


def test_every_enum_in_models_comes_from_vocabulary():
    from contracts.models import ContextResult, ExtractionResult
    allowed = [list(get_args(lit)) for lit in vocabulary.LISTS.values()]
    for model in (*SCHEMAS.values(), ContextResult, ExtractionResult):
        for enum in enums_in(model.model_json_schema()):
            assert enum in allowed, (model.__name__, enum)


def test_extractor_enums_include_other():
    from contracts.models import ExtractedRule
    props = ExtractedRule.model_json_schema()["properties"]
    for field in ("event", "action"):
        assert "other" in props[field]["enum"]
    for field in ("symptoms", "avoid"):
        assert "other" in props[field]["items"]["enum"]
    assert all(p.get("description") for p in props.values())
