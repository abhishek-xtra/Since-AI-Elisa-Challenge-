"""binder/expiry.py: a stated end date becomes valid_to (late rule, revert with the module)."""
from datetime import datetime

import pytest

from binder.expiry import stated_valid_to

SAID = datetime.fromisoformat("2026-11-09T07:40:00+02:00")
END_20 = datetime.fromisoformat("2026-11-20T23:59:59+02:00")


@pytest.mark.parametrize("text", ["closed for roadworks until 20 Nov, use the forest track", "until 20 November",
                                  "until 20th Nov.", "until 20.11.", "until 20.11.2026", "until 2026-11-20",
                                  "Until 20 nov 2026"])
def test_stated_dates(text):
    assert stated_valid_to(text, SAID) == END_20


@pytest.mark.parametrize("text", [None, "", "until further notice", "until the road is fixed", "closed 20 Nov",
                                  "until 31.02.", "until 2025-11-20"])
def test_no_date_is_none(text):
    assert stated_valid_to(text, SAID) is None


def test_year_rolls_over_when_the_day_is_past():
    assert stated_valid_to("until 5 Jan", datetime.fromisoformat("2026-12-20T10:00:00+02:00")) == \
        datetime.fromisoformat("2027-01-05T23:59:59+02:00")
