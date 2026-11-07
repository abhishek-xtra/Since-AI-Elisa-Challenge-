"""Stated end date -> valid_to (late rule, rule 8). Revert: delete this file, its call in bind.py and tests/test_expiry.py;
a temporary fact then stays valid until superseded, its "until" text kept in valid_while only."""
import re
from datetime import date, datetime, time

_MONTHS = {m: i for i, m in enumerate(("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"), 1)}
_UNTIL = re.compile(r"\buntil\s+(?:"
                    r"(?P<iso>\d{4}-\d{2}-\d{2})"
                    r"|(?P<d>\d{1,2})\.(?P<m>\d{1,2})\.(?P<y>\d{4})?"
                    r"|(?P<dn>\d{1,2})(?:st|nd|rd|th)?\s+(?P<mn>[A-Za-z]{3,})\.?(?:\s+(?P<yn>\d{4}))?)", re.I)


def stated_valid_to(text: str | None, said_at: datetime) -> datetime | None:
    """'until 20 Nov' / 'until 20.11.' / 'until 2026-11-20' -> end of that day in said_at's timezone; no date -> None.
    A date without a year takes said_at's year, or the next year if that day is already past ('until 5 Jan' in December).
    A date before said_at with an explicit year is not an end date (valid_to would precede valid_from): None."""
    if not text or not (m := _UNTIL.search(text)):
        return None
    try:
        if m["iso"]:
            day, explicit = date.fromisoformat(m["iso"]), True
        elif m["d"]:
            explicit = bool(m["y"])
            day = date(int(m["y"] or said_at.year), int(m["m"]), int(m["d"]))
        else:
            month = _MONTHS.get(m["mn"][:3].lower())
            if month is None:
                return None
            explicit = bool(m["yn"])
            day = date(int(m["yn"] or said_at.year), month, int(m["dn"]))
    except ValueError:  # 31.02. and the like
        return None
    if day < said_at.date():
        if explicit:
            return None
        day = day.replace(year=day.year + 1)
    return datetime.combine(day, time(23, 59, 59), said_at.tzinfo)
