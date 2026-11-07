"""Predicate evaluator (contracts/predicates.md). Pure, deterministic, no model call."""
import operator
import re

from contracts.models import Node, Site, Topology
from contracts.vocabulary import PredicateResult

OPS = {"==": operator.eq, "!=": operator.ne, "<": operator.lt, "<=": operator.le, ">": operator.gt, ">=": operator.ge}
ORDERING = {"<", "<=", ">", ">="}
_RE = re.compile(r"^([a-z_][a-z0-9_.]*) (==|!=|<=|>=|<|>) ('[^']*'|\"[^\"]*\"|-?\d+)$")


def parse(predicate: str) -> tuple[str, str, str | int]:
    m = _RE.match(predicate)
    if not m:
        raise ValueError(f"malformed predicate: {predicate!r}")
    attr, op, raw = m.groups()
    if attr.startswith("peer."):
        raise NotImplementedError("peer predicates are pending Elisa's answer")
    if "." in attr:
        raise ValueError(f"malformed attribute: {attr!r}")
    return attr, op, raw[1:-1] if raw[0] in "'\"" else int(raw)


def lookup(topology: Topology, entity_id: str) -> Node | Site | None:
    return next((e for e in [*topology.nodes, *topology.sites] if e.id == entity_id), None)


def _attribute(entity: Node | Site, attr: str, topology: Topology):
    """The entity's value for attr, or None when it does not exist."""
    if isinstance(entity, Site):
        return {"id": entity.id, "name": entity.name, "region": entity.region, "site": entity.id}.get(attr)
    if attr == "region":
        site = lookup(topology, entity.site)
        return site.region if isinstance(site, Site) else None
    return getattr(entity, attr, None) if attr in Node.model_fields else None


def _comparable(attr: str, actual, value, op: str):
    if attr == "firmware":
        if not isinstance(value, str) or not re.fullmatch(r"\d+(\.\d+)*", value):
            raise ValueError(f"firmware needs a dotted version string, got {value!r}")
        return tuple(map(int, actual.split("."))), tuple(map(int, value.split(".")))
    if isinstance(actual, int) != isinstance(value, int):
        raise ValueError(f"{attr} compares as {type(actual).__name__}, got {value!r}")
    if isinstance(actual, str) and op in ORDERING:
        raise ValueError(f"{op} on string attribute {attr} is an error")
    return actual, value


def evaluate(predicate: str, entity: Node | Site, topology: Topology, edge: str = "closed") -> PredicateResult:
    attr, op, value = parse(predicate)
    actual = _attribute(entity, attr, topology)
    if actual is None:
        return "missing"
    if OPS[op](*_comparable(attr, actual, value, op)):
        return "holds"
    return open_edge_result(op) if edge == "open" else "fails"


def open_edge_result(op: str) -> PredicateResult:
    """Open edge (BACKEND_PROMPT 4.4): a failed ordering comparison on an open candidate is beyond the known edge,
    not outside the rule. Called only after the comparison failed. Revert: delete this and tests/test_open_edge.py."""
    return "unknown" if op in ORDERING else "fails"
