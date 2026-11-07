"""Open edge (BACKEND_PROMPT 4.4/4.5). Reverting the rule = deleting open_edge_result and this file."""
from pathlib import Path

import pytest

from contracts.models import Node, Topology
from predicates import evaluate, lookup

TOPO = Topology.model_validate_json((Path(__file__).parent.parent / "data" / "topology.json").read_text(encoding="utf-8"))
OLD_FW = Node(id="TST-001", type="transmission_node", model="TX-200", install_year=2019, firmware="4.0.9", site="OULU-07")


@pytest.mark.parametrize("predicate,entity_id,expected", [
    ("install_year <= 2019", "TRN-120", "unknown"),
    ("install_year <= 2019", "TRN-087", "holds"),
    ("install_year <= 2019", "TRN-042", "holds"),
    ("install_year < 2019", "TRN-042", "unknown"),
    ("install_year >= 2019", "TRN-087", "unknown"),
    ("install_year > 2019", "TRN-042", "unknown"),
    ("firmware >= '4.1'", "TRN-045", "unknown"),
    ("foo <= 1", "TRN-042", "missing"),
])
def test_open(predicate, entity_id, expected):
    assert evaluate(predicate, lookup(TOPO, entity_id), TOPO, "open") == expected


def test_open_firmware_constructed_node():
    assert evaluate("firmware >= '4.1'", OLD_FW, TOPO, "open") == "unknown"


@pytest.mark.parametrize("predicate", ["install_year == 2019", "install_year != 2019", "model == 'TX-200'",
                                       "model != 'TX-200'", "region == 'north'", "firmware == '4.1'"])
@pytest.mark.parametrize("entity_id", ["TRN-042", "TRN-120", "TRN-101", "OULU-03"])
def test_equality_open_same_as_closed(predicate, entity_id):
    e = lookup(TOPO, entity_id)
    assert evaluate(predicate, e, TOPO, "open") == evaluate(predicate, e, TOPO, "closed")


@pytest.mark.parametrize("op", ["<", "<=", ">", ">=", "==", "!="])
@pytest.mark.parametrize("entity", [*TOPO.nodes, OLD_FW])
def test_closed_never_unknown(op, entity):
    for p in (f"install_year {op} 2019", f"firmware {op} '4.1'"):
        assert evaluate(p, entity, TOPO, "closed") != "unknown"
