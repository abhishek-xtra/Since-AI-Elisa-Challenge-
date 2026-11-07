import json
from datetime import datetime, time
from pathlib import Path

from adapters.common import HELSINKI, SYNTHETIC_DATE, map_role, source_stem
from contracts.models import Message


def load_teams(path, date: str | None = None) -> list[Message]:
    path = Path(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    day = datetime.fromisoformat(date or data.get("date") or SYNTHETIC_DATE).date()
    thread_id = f"thread-{source_stem(path, '001')}"
    return [
        Message(
            id=f"teams:{thread_id}:{m['seq']}",
            author=m["author"],
            role=map_role(m["role"]),
            timestamp=datetime.combine(day, time.fromisoformat(m["time"]), HELSINKI),
            channel="teams",
            thread_id=thread_id,
            text=m["text"],
        )
        for m in sorted(data["messages"], key=lambda m: m["seq"])
    ]
