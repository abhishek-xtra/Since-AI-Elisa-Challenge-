"""Module 6: the agent side. get_context (deterministic), the one question, outcomes, notifications, stand-in agent."""
import json
import os
from pathlib import Path


def out_path(name: str) -> Path:
    """File under OUT_DIR (default out/), read at call time so tests can point it at tmp_path."""
    return Path(os.environ.get("OUT_DIR", "out")) / name


def read_json_list(name: str) -> list:
    p = out_path(name)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def append_json(name: str, entry: dict) -> None:
    """Append entry to the JSON list in out/<name> unless an identical entry is already there."""
    items = read_json_list(name)
    if entry in items:
        return
    p = out_path(name)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(items + [entry], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
