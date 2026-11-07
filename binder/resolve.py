"""Entity resolution against the topology by normalised ID (BACKEND_PROMPT 5.3). Deterministic, no model call."""
import re

from contracts.models import Topology

# letters, optional single separator, digits: TRN-042, trn42, TRN 042, Oulu 03, oulu03
_TOKEN = re.compile(r"\b([A-Za-z]+)[ _-]?(\d+)\b")


def normalise_id(s: str) -> str:
    """Letters+digits, lowercase, leading zeros stripped from each number: 'TRN-087' and 'trn 87' -> 'trn87'."""
    t = re.sub(r"[^a-z0-9]", "", s.lower())
    return re.sub(r"(?<![0-9])0+(?=[0-9])", "", t)


def resolve_entities(texts: list[str], topology: Topology) -> list[tuple[str, int]]:
    """Topology node and site IDs mentioned in texts, as (id, mention count), most mentioned first, ties by first mention."""
    known = {normalise_id(e.id): e.id for e in [*topology.nodes, *topology.sites]}
    counts: dict[str, int] = {}  # insertion order = first mention
    for text in texts:
        for m in _TOKEN.finditer(text):
            if (eid := known.get(normalise_id(m.group(1) + m.group(2)))) is not None:
                counts[eid] = counts.get(eid, 0) + 1
    return sorted(counts.items(), key=lambda kv: -kv[1])  # stable sort keeps first-mention order on ties
