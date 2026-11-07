"""binder.condition.stated_candidate: the stated condition -> at most one candidate (open edge for relative)."""
from pathlib import Path

import pytest

from binder.condition import stated_candidate
from contracts.models import ExtractedRule, Topology
from predicates import lookup, parse

TOPO = Topology.model_validate_json(Path("data/topology.json").read_text(encoding="utf-8"))
TRN042 = lookup(TOPO, "TRN-042")


def rule(cond, relative=False) -> ExtractedRule:
    return ExtractedRule(trigger_kind="incident", event="sfp_replaced", symptoms=["counters_zero"], stated_condition=cond,
                         condition_is_relative=relative, action="interface.bounce", action_text="bounce it", avoid=[],
                         excerpt="x", said_by="Erkki Expert", said_by_role="expert", hedged=False, first_hand=False,
                         outcome="unknown", outcome_excerpt=None)


def test_older_units_open():
    c = stated_candidate(rule("older units", True), TRN042, TOPO)
    assert (c.predicate, c.edge, c.support, c.against) == ("install_year <= 2019", "open", 1, 0)
    assert c.basis == "Erkki Expert: 'older units'; 2019 is TRN-042's install_year, not a stated boundary"


def test_newer_open():
    c = stated_candidate(rule("the newer ones", True), TRN042, TOPO)
    assert (c.predicate, c.edge) == ("install_year >= 2019", "open")


@pytest.mark.parametrize("cond,predicate", [
    ("units installed before 2018", "install_year < 2018"),
    ("older than 2018", "install_year < 2018"),
    ("pre-2018 units", "install_year < 2018"),
    ("installed after 2020", "install_year > 2020"),
    ("since 2020", "install_year >= 2020"),
    ("firmware 4.1", "firmware == '4.1'"),
    ("firmware below 5.2", "firmware < '5.2'"),
    ("model tx200", "model == 'TX-200'"),
    ("units at OULU-11", "site == 'OULU-11'"),
    ("anything in the north", "region == 'north'"),
    ("on this site", "site == 'OULU-07'"),
])
def test_closed(cond, predicate):
    c = stated_candidate(rule(cond), TRN042, TOPO)
    assert (c.predicate, c.edge) == (predicate, "closed")
    assert c.basis == f"Erkki Expert: '{cond}'"
    parse(c.predicate)  # grammar-valid


def test_stated_number_beats_relative_flag():
    assert stated_candidate(rule("units older than 2018", True), TRN042, TOPO).edge == "closed"


@pytest.mark.parametrize("cond", [None, "", "the weird ones"])
def test_nothing(cond):
    assert stated_candidate(rule(cond), TRN042, TOPO) is None
