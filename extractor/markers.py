"""Named hook only: a cheap marker pre-check before the LLM call is stretch (BACKEND_PROMPT 5.1, section 9)."""


def has_markers(messages) -> bool:
    raise NotImplementedError("marker pre-check is stretch; not built")
