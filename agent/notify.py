"""Expert notification (BACKEND_PROMPT 5.7): one line to the speaker when their assertion is proposed. Nothing else."""
from datetime import datetime

from agent import append_json
from contracts.models import ContextResult


def notify(results: list[ContextResult], entity_id: str, at: datetime) -> None:
    for r in results:
        if r.outcome != "proposed":
            continue
        a = r.assertion
        append_json("notifications.json", {
            "to": a.evidence.said_by,
            "text": f"Your tip from {a.valid_from.date().isoformat()} was used on {entity_id} today.",
            "assertion_id": a.id, "entity_id": entity_id, "at": at.isoformat()})
