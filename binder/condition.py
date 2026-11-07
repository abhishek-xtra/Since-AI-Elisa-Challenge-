"""The stated condition -> at most one candidate, parsed deterministically from rule.stated_condition.

Holds the open-edge rule for relative conditions (BACKEND_PROMPT 4.4) in one function, tested by tests/test_condition.py.
"""
import re

from binder.resolve import normalise_id, resolve_entities
from contracts.models import Candidate, ExtractedRule, Node, Site, Topology

_YEAR = re.compile(r"\b(older than|newer than|prior to|before|after|since|from|pre)[\s-]*(\d{4})\b", re.I)
_YEAR_OP = {"older than": "<", "prior to": "<", "before": "<", "pre": "<", "newer than": ">", "after": ">", "since": ">=", "from": ">="}
_FIRMWARE = re.compile(r"\bfirmware\s+(?:version\s+)?(below|under|before|older than|above|after|newer than)?\s*v?(\d+(?:\.\d+)*)\b", re.I)
_FIRMWARE_OP = {"": "==", "below": "<", "under": "<", "before": "<", "older than": "<", "above": ">", "after": ">", "newer than": ">"}
# operator word before the word firmware: "before firmware 5.0", "since fw 5.2"
_FIRMWARE_PRE = re.compile(r"\b(below|under|before|older than|above|after|newer than|since|from)\s+(?:firmware|fw)\s+(?:version\s+)?v?(\d+(?:\.\d+)*)\b", re.I)
_FIRMWARE_PRE_OP = {**_FIRMWARE_OP, "since": ">=", "from": ">="}
# an end condition ("stopped after firmware 5.0", "fixed in 5.2", "no longer since 5.0"), not a scope: kept as valid_while
EXPIRY = re.compile(r"\b(stopped|stops|fixed|no longer|not needed|until)\b", re.I)
_MODEL = re.compile(r"\bmodel\s+([A-Za-z]+[ -]?\d+)\b", re.I)
_NEWER = re.compile(r"\b(newer|newest|new|recent|later|younger)\b", re.I)
_THIS_SITE = re.compile(r"\b(this|that|the same) site\b", re.I)


def stated_candidate(rule: ExtractedRule, origin: Node | Site, topology: Topology | None = None) -> Candidate | None:
    """A number the speaker stated -> closed candidate; a relative condition -> open install_year candidate from the
    origin's own install_year; a site/region word -> closed site/region candidate; nothing parses -> None.
    topology is only needed to recognise site IDs, region names and canonical model spellings."""
    text = rule.stated_condition
    if not text:
        return None
    said = f"{rule.said_by}: '{text}'"

    def closed(predicate: str) -> Candidate:
        return Candidate(predicate=predicate, edge="closed", support=1, against=0, basis=said)

    if m := _YEAR.search(text):
        return closed(f"install_year {_YEAR_OP[m.group(1).lower()]} {int(m.group(2))}")
    if EXPIRY.search(text):
        return None  # bind() stores the text in valid_while
    if m := _FIRMWARE_PRE.search(text):
        return closed(f"firmware {_FIRMWARE_PRE_OP[m.group(1).lower()]} '{m.group(2)}'")
    if m := _FIRMWARE.search(text):
        return closed(f"firmware {_FIRMWARE_OP[(m.group(1) or '').lower()]} '{m.group(2)}'")
    if m := _MODEL.search(text):
        models = {normalise_id(n.model): n.model for n in topology.nodes} if topology else {}
        return closed(f"model == '{models.get(normalise_id(m.group(1)), m.group(1).upper())}'")
    if rule.condition_is_relative and isinstance(origin, Node):
        op = ">=" if _NEWER.search(text) else "<="
        return Candidate(predicate=f"install_year {op} {origin.install_year}", edge="open", support=1, against=0,
                         basis=f"{said}; {origin.install_year} is {origin.id}'s install_year, not a stated boundary")
    if _THIS_SITE.search(text):
        return closed(f"site == '{origin.site if isinstance(origin, Node) else origin.id}'")
    if topology:
        site_ids = {s.id for s in topology.sites}
        if sites := [eid for eid, _ in resolve_entities([text], topology) if eid in site_ids]:
            return closed(f"site == '{sites[0]}'")
        for region in sorted({s.region for s in topology.sites}):
            if re.search(rf"\b{re.escape(region)}\b", text, re.I):
                return closed(f"region == '{region}'")
    return None
