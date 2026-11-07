"""Supersede rule for value-carrying actions (BACKEND_PROMPT 5.2, late rule). Revert: delete this file, its call in
merge.py and tests/test_supersede.py; a different text then simply stays its own live assertion."""
from contracts.models import Assertion


def supersede(old: Assertion, new: Assertion) -> bool:
    """The later-dated fact replaces the earlier one unless the arriving one is a hunch. Both are kept; nothing is
    deleted. An older fact that arrives late is the one superseded, so valid_to is never before valid_from."""
    if new.trust == "hunch":
        return False
    if new.valid_from < old.valid_from:
        old, new = new, old
    new.supersedes = old.id
    old.superseded_by = new.id
    old.valid_to = new.valid_from
    return True
