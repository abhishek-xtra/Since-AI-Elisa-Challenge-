from datetime import timedelta, timezone

from contracts.vocabulary import Role

# Elisa's chat has times only and no date; every adapter attaches this synthetic date unless the source carries one.
SYNTHETIC_DATE = "2026-11-01"
HELSINKI = timezone(timedelta(hours=2))  # Europe/Helsinki in November (EET), written as +02:00

ROLES: dict[str, Role] = {"Field Engineer": "field_engineer", "Network Expert": "expert"}


def map_role(source_role: str) -> Role:
    return ROLES.get(source_role, "other")


ELISA_FILES = {"teams_chat", "email"}
GENERIC_STEMS = {"thread", "email", "thread_hedged"}


def source_stem(path, elisa_id: str) -> str:
    """Stable per-source id: Elisa's own files get `elisa_id`; a scenario file named generically
    (thread.json, email.txt) takes its folder name so two scenarios never share an id."""
    if path.parent.name == "elisa_examples" and path.stem in ELISA_FILES:
        return elisa_id
    if path.stem in GENERIC_STEMS:
        return path.parent.name + ("-hedged" if path.stem == "thread_hedged" else "")
    return path.stem
