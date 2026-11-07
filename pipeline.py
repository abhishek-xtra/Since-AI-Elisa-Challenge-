"""Ingest pipeline: adapter -> extract -> bind -> merge -> store. The only LLM call is inside extractor.extract."""
import logging
from datetime import datetime
from pathlib import Path

import binder
import extractor
from adapters import load_email, load_teams
from contracts.models import Assertion, Topology
from extractor.merge import merge

log = logging.getLogger("pipeline")
ROOT = Path(__file__).parent
ADAPTERS = {".json": load_teams, ".txt": load_email}


def load_topology(path=ROOT / "data" / "topology.json") -> Topology:
    return Topology.model_validate_json(Path(path).read_text(encoding="utf-8"))


def ingest(paths: list, store, topology: Topology, recorded_at: datetime | None = None) -> list[Assertion]:
    """Ingest each file in order; returns every assertion created or changed (incl. superseded or disputed rivals)."""
    touched: dict[str, Assertion] = {}
    for path in map(Path, paths):
        if path.suffix not in ADAPTERS:
            raise ValueError(f"no adapter for {path} (expected .json Teams or .txt email)")
        messages = ADAPTERS[path.suffix](path)
        out = extractor.extract(messages, recorded_at=recorded_at)
        if out is None:
            log.info("%s: not extracted", path)
            continue
        before = {a.id: a for a in store.all()}
        result = merge(store.all(), binder.bind(*out, messages, topology), topology)
        store.replace_all(result)
        changed = [a for a in result if before.get(a.id) != a]
        new = [a.id for a in changed if a.id not in before]
        superseded = [a.id for a in changed if a.superseded_by and not before.get(a.id, a).superseded_by]
        what = (f"new {new[0]}" if new else f"merged into {changed[0].id}" if changed else "merged, unchanged") + \
            (f", superseded {', '.join(superseded)}" if superseded else "")
        log.info("%s: extracted, %s", path, what)
        touched.update({a.id: a for a in changed})
    return list(touched.values())
