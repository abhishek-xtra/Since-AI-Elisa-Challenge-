"""supersede(old, new) on its own (BACKEND_PROMPT 5.2). Revert the rule: delete extractor/supersede.py, its call in
extractor/merge.py, and this file."""
from datetime import datetime

from test_extractor import barrier
from extractor.supersede import supersede


def test_stated_supersedes():
    old, new = barrier(), barrier(text="in the site cabinet now", at="2026-11-07T15:14:00+02:00")
    old.id, new.id = "CA-0001", "CA-0002"
    assert supersede(old, new) is True
    assert (old.superseded_by, old.valid_to) == ("CA-0002", datetime.fromisoformat("2026-11-07T15:14:00+02:00"))
    assert (new.supersedes, new.valid_to, new.superseded_by) == ("CA-0001", None, None)


def test_hunch_does_not_supersede():
    old, new = barrier(), barrier(text="in the cabinet", trust="hunch")
    old.id, new.id = "CA-0001", "CA-0002"
    assert supersede(old, new) is False
    assert old.superseded_by is None and old.valid_to is None and new.supersedes is None
