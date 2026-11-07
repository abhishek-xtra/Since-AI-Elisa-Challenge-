"""Module 2: extraction (one LLM call + deterministic evidence check) and merge (deterministic).

`extractor.extract(messages)` is the function; merge lives at `extractor.merge.merge` (not re-exported, so the submodule name stays usable).
"""
from extractor.extract import extract

__all__ = ["extract"]
