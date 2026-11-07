"""Store interface plus the one graph export (BACKEND_PROMPT section 8, out/graph.json)."""
import re
from abc import ABC, abstractmethod

from contracts.models import Assertion, Topology
from predicates.evaluate import parse

ORIGIN_ATTRS = {"site": None, "region": "region:", "model": "model:"}  # attr -> graph id prefix; others land on the origin


def scope_target(predicate: str, origin: str | None) -> str | None:
    """Graph id of the topology entity a candidate names: site/region/model value, else the case origin."""
    attr, _, value = parse(predicate)
    if attr in ORIGIN_ATTRS:
        return f"{ORIGIN_ATTRS[attr] or ''}{value}"
    return origin


def origin(a: Assertion) -> str | None:
    return a.evidence.cases[0].entity if a.evidence.cases else None


def label(a: Assertion) -> str:
    if a.action == "interface.bounce" and "node.reboot" in a.avoid:
        return "Bounce, don't reboot"
    if a.action == "site.access_key":
        return "Site access"
    return " ".join(a.action_text.split()[:4])


class Store(ABC):
    @abstractmethod
    def put(self, assertion: Assertion) -> None: ...

    @abstractmethod
    def get(self, id: str) -> Assertion | None: ...

    @abstractmethod
    def all(self) -> list[Assertion]: ...

    @abstractmethod
    def replace_all(self, assertions: list[Assertion]) -> None: ...

    def by_entity(self, entity_id: str) -> list[Assertion]:
        def names(a: Assertion) -> bool:
            if any(c.entity == entity_id for c in a.evidence.cases):
                return True
            preds = [c.predicate for c in a.applies_to.candidates] + ([a.applies_to.decided.predicate] if a.applies_to.decided else [])
            return any(attr in ("id", "site") and op == "==" and value == entity_id for attr, op, value in map(parse, preds))
        return [a for a in self.all() if names(a)]

    def next_id(self) -> str:
        nums = [int(m.group(1)) for a in self.all() if (m := re.fullmatch(r"CA-(\d{4})", a.id))]
        return f"CA-{max(nums, default=0) + 1:04d}"

    def graph(self, topology: Topology) -> dict:
        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        def node(id, label, kind, attrs=None):
            nodes.setdefault(id, {"id": id, "label": label, "kind": kind, "attrs": attrs or {}})

        def edge(frm, to, kind, **extra):
            edges.append({"from": frm, "to": to, "kind": kind, **extra})

        region_of = {s.id: s.region for s in topology.sites}
        for s in topology.sites:
            node(s.id, s.name, "site", {"name": s.name, "region": s.region, "access": s.access})
            node(f"region:{s.region}", s.region, "region")
            edge(s.id, f"region:{s.region}", "IN_REGION")
        for n in topology.nodes:
            node(n.id, n.id, "node", {"model": n.model, "install_year": n.install_year, "firmware": n.firmware,
                                      "site": n.site, "region": region_of.get(n.site)})
            node(f"model:{n.model}", n.model, "model")
            edge(n.id, n.site, "IN_SITE")
            edge(n.id, f"model:{n.model}", "OF_MODEL")
        for a in self.all():
            node(a.id, label(a), "assertion", {
                "action": a.action, "action_text": a.action_text, "avoid": a.avoid, "trust": a.trust, "status": a.status,
                "said_by": a.evidence.said_by, "valid_from": a.valid_from.isoformat(),
                "valid_to": a.valid_to.isoformat() if a.valid_to else None, "superseded_by": a.superseded_by,
                "cases": len(a.evidence.cases)})
            for c in a.applies_to.candidates:
                if (to := scope_target(c.predicate, origin(a))):
                    edge(a.id, to, "SCOPED_BY", predicate=c.predicate, support=c.support, against=c.against, edge=c.edge)
            for src in a.evidence.sources:
                node(src, src, "source")
                edge(a.id, src, "EVIDENCED_BY")
            for c in a.evidence.cases:
                edge(a.id, c.entity, "CASE")
        for e in edges:  # an entity outside the topology (e.g. an unresolved case) still gets a node, so no edge dangles
            kind = next((k for k in ("region", "model") if e["to"].startswith(k + ":")), "node")
            node(e["to"], e["to"].split(":", 1)[-1], kind)
        return {"nodes": list(nodes.values()), "edges": edges}
