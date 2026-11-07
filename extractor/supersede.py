"""Supersede rule for value-carrying actions (BACKEND_PROMPT 5.2, late rule). Revert: delete this file, its call in
merge.py and tests/test_supersede.py; a different text then simply stays its own live assertion."""
from contracts.models import Assertion


def supersede(old: Assertion, new: Assertion) -> bool:
    """New replaces old unless new is a hunch. Both are kept; nothing is deleted. Returns whether it superseded."""
    if new.trust == "hunch":
        return False
    new.supersedes = old.id
    old.superseded_by = new.id
    old.valid_to = new.valid_from
    return True
