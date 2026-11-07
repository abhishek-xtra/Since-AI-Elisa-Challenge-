"""Retraction (late rule, BACKEND_PROMPT rule 8). Revert: delete this file, its call in pipeline.py and
tests/test_retract.py; ExtractedRule.retracts then has no effect and a retraction is merged like any rule."""
import logging

from contracts.models import Assertion
from extractor.merge import _never_merges, key

log = logging.getLogger(__name__)


def retract(existing: list[Assertion], new: Assertion) -> list[Assertion]:
    """The speaker's own live assertion with the same merge key goes to status review and gains the source. Nothing is
    deleted or superseded and the retraction is not stored. No match, or a different speaker: dropped, logged."""
    out = [a.model_copy(deep=True) for a in existing]
    same_key = [a for a in out if a.superseded_by is None and not _never_merges(a) and key(a) == key(new)]
    speaker = new.evidence.said_by.strip().casefold()
    own = [a for a in same_key if a.evidence.said_by.strip().casefold() == speaker]
    if not own:
        log.info("retraction by %s dropped: %s", new.evidence.said_by,
                 f"not the speaker of {', '.join(a.id for a in same_key)}" if same_key else "no live assertion with that key")
        return out
    for a in own:
        a.status = "review"
        a.evidence.sources += [s for s in new.evidence.sources if s not in a.evidence.sources]
        log.info("retraction by %s: %s set to review", new.evidence.said_by, a.id)
    return out
