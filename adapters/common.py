from datetime import timedelta, timezone

from contracts.vocabulary import Role

# Elisa's chat has times only and no date; every adapter attaches this synthetic date unless the source carries one.
SYNTHETIC_DATE = "2026-11-01"
HELSINKI = timezone(timedelta(hours=2))  # Europe/Helsinki in November (EET), written as +02:00

ROLES: dict[str, Role] = {"Field Engineer": "field_engineer", "Network Expert": "expert"}


def map_role(source_role: str) -> Role:
    return ROLES.get(source_role, "other")
