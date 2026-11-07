import email
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

from adapters.common import HELSINKI, SYNTHETIC_DATE, source_stem
from contracts.models import Message
from contracts.vocabulary import Role

DEFAULT_ROLES: dict[str, Role] = {"Erkki Expert": "expert", "Veikko Vikkelä": "field_engineer"}


def parse_date(value: str) -> datetime:
    """Accepts RFC 2822 ('Fri, 02 Oct 2026 10:00:00 +0300') or ISO ('2026-10-02', '2026-10-02T09:30'); a bare date gets 10:00 Helsinki."""
    value = value.strip()
    try:
        return parsedate_to_datetime(value)
    except (TypeError, ValueError):
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = (dt if "T" in value else dt.replace(hour=10)).replace(tzinfo=HELSINKI)
        return dt


def load_email(path, roles: dict[str, Role] | None = None) -> list[Message]:
    path = Path(path)
    msg = email.message_from_string(path.read_text(encoding="utf-8"))
    author = msg["From"].strip()
    stem = source_stem(path, "001")
    timestamp = parse_date(msg["Date"]) if msg["Date"] else datetime.fromisoformat(f"{SYNTHETIC_DATE}T10:00").replace(tzinfo=HELSINKI)
    body = msg.get_payload().strip("\r\n")
    return [Message(
        id=f"email:{stem}",
        author=author,
        role=(roles or DEFAULT_ROLES).get(author, "other"),
        timestamp=timestamp,
        channel="email",
        thread_id=f"email-{stem}",
        # subject kept as first line so the extractor sees the device ID
        text=f"Subject: {msg['Subject'].strip()}\n\n{body}",
    )]
