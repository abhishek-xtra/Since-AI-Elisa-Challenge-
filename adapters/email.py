import email
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

from adapters.common import HELSINKI, SYNTHETIC_DATE
from contracts.models import Message
from contracts.vocabulary import Role

DEFAULT_ROLES: dict[str, Role] = {"Erkki Expert": "expert", "Veikko Vikkelä": "field_engineer"}


def load_email(path, roles: dict[str, Role] | None = None) -> list[Message]:
    path = Path(path)
    msg = email.message_from_string(path.read_text(encoding="utf-8"))
    author = msg["From"].strip()
    stem = "001" if path.stem == "email" else path.stem
    timestamp = (parsedate_to_datetime(msg["Date"]) if msg["Date"]
                 else datetime.fromisoformat(f"{SYNTHETIC_DATE}T10:00").replace(tzinfo=HELSINKI))
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
