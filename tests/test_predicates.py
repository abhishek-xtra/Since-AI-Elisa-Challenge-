from pathlib import Path

import pytest

from contracts.models import Topology
from predicates import evaluate, lookup, parse

TOPO = Topology.model_validate_json((Path(__file__).parent.parent / "data" / "topology.json").read_text(encoding="utf-8"))

TABLE = [
    # (predicate, edge, entity_id, expected)
    ("model == 'TX-200'", "closed", "TRN-042", "holds"),
    ('model == "TX-200"', "closed", "TRN-042", "holds"),
    ("model == 'TX-200'", "closed", "TRN-101", "fails"),
    ("model != 'TX-200'", "closed", "TRN-101", "holds"),
    ("model != 'TX-200'", "closed", "TRN-042", "fails"),
    ("region == 'north'", "closed", "TRN-042", "holds"),
    ("region == 'north'", "closed", "TRN-101", "fails"),
    ("site == 'OULU-07'", "closed", "TRN-042", "holds"),
    ("site == 'OULU-07'", "closed", "TRN-087", "fails"),
    ("id == 'TRN-042'", "closed", "TRN-042", "holds"),
    ("id == 'TRN-042'", "closed", "TRN-045", "fails"),
    ("type == 'router'", "closed", "RTR-007", "holds"),
    ("firmware >= '4.1'", "closed", "TRN-042", "holds"),
    ("firmware >= '4.1'", "closed", "TRN-045", "fails"),
    ("firmware > '5.2'", "closed", "TRN-102", "holds"),
    ("firmware > '5.2'", "closed", "TRN-101", "fails"),
    ("firmware < '5.2'", "closed", "TRN-102", "fails"),
    ("firmware <= '4.0'", "closed", "TRN-045", "holds"),
    ("firmware == '4.1.0'", "closed", "TRN-042", "fails"),
    ("install_year <= 2019", "closed", "TRN-120", "fails"),
    ("install_year <= 2019", "closed", "TRN-087", "holds"),
    ("install_year <= 2019", "closed", "TRN-042", "holds"),
    ("install_year < 2019", "closed", "TRN-087", "holds"),
    ("install_year < 2019", "closed", "TRN-042", "fails"),
    ("install_year > 2019", "closed", "TRN-120", "holds"),
    ("install_year > 2019", "closed", "TRN-042", "fails"),
    ("install_year >= 2020", "closed", "TRN-120", "holds"),
    ("install_year >= 2020", "closed", "TRN-042", "fails"),
    ("install_year == 2019", "closed", "TRN-042", "holds"),
    ("install_year != 2019", "closed", "TRN-042", "fails"),
    ("foo == 1", "closed", "TRN-042", "missing"),
    ("vendor == 'X'", "open", "TRN-042", "missing"),
    ("install_year <= 2019", "closed", "OULU-03", "missing"),
    ("install_year <= 2019", "open", "OULU-03", "missing"),
    ("region == 'north'", "closed", "OULU-03", "holds"),
    ("region == 'north'", "closed", "HEL-02", "fails"),
    ("site == 'OULU-03'", "closed", "OULU-03", "holds"),
    ("site == 'OULU-03'", "closed", "OULU-07", "fails"),
    ("id == 'OULU-03'", "closed", "OULU-03", "holds"),
]


@pytest.mark.parametrize("predicate,edge,entity_id,expected", TABLE)
def test_table(predicate, edge, entity_id, expected):
    assert evaluate(predicate, lookup(TOPO, entity_id), TOPO, edge) == expected


def test_parse():
    assert parse("model == 'TX-200'") == ("model", "==", "TX-200")
    assert parse('model == "TX-200"') == ("model", "==", "TX-200")
    assert parse("install_year <= 2019") == ("install_year", "<=", 2019)


def test_peer_reserved():
    with pytest.raises(NotImplementedError, match="pending Elisa"):
        evaluate("peer.model == 'X'", lookup(TOPO, "TRN-042"), TOPO)


@pytest.mark.parametrize("bad", ["model=='TX-200'", "model == TX-200", "model  == 'TX-200'", "model == 'a' and site == 'b'",
                                 "model ~ 'X'", "", "install_year <= 2019.5"])
def test_malformed(bad):
    with pytest.raises(ValueError):
        parse(bad)


@pytest.mark.parametrize("bad", ["model < 'TX-300'", "install_year <= '2019'", "model == 200", "firmware >= 4"])
def test_type_errors(bad):
    with pytest.raises(ValueError):
        evaluate(bad, lookup(TOPO, "TRN-042"), TOPO)


def test_region_missing_when_site_absent():
    node = lookup(TOPO, "TRN-042").model_copy(update={"site": "NOWHERE"})
    assert evaluate("region == 'north'", node, TOPO) == "missing"


def test_lookup():
    assert lookup(TOPO, "TRN-042").model == "TX-200"
    assert lookup(TOPO, "OULU-03").region == "north"
    assert lookup(TOPO, "trn-042") is None
