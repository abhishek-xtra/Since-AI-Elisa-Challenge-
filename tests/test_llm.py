import json
import os
import uuid
from types import SimpleNamespace
from typing import Literal

import pytest
from google.genai import errors
from pydantic import BaseModel

import llm


class Tiny(BaseModel):
    answer: Literal["yes", "no"]
    reason: str


SYSTEM = "You answer yes/no questions about network operations. Keep the reason under ten words."
USER = "Is a transmission node a network device?"
live = pytest.mark.skipif(os.environ.get("LLM_OFFLINE") == "1", reason="live Vertex AI call; LLM_OFFLINE=1")


def boom(*a, **k):
    raise AssertionError("network call attempted")


@live
def test_live_call_is_cached_then_hit(monkeypatch):
    path = llm.cache_path(llm.EXTRACT_MODEL, SYSTEM, USER, Tiny)
    path.unlink(missing_ok=True)  # force a real call every run; the call rewrites the committed entry
    before = llm.spent()

    first = llm.structured(SYSTEM, USER, Tiny)
    assert isinstance(first, Tiny) and first.answer == "yes"
    assert path.exists() and json.loads(path.read_text(encoding="utf-8"))["model_version"]
    after = llm.spent()
    assert after["eur"] > before["eur"] and after["calls"] == before["calls"] + 1

    monkeypatch.setattr(llm.client.models, "generate_content", boom)
    assert llm.structured(SYSTEM, USER, Tiny) == first
    assert llm.spent() == after


def test_offline_miss_raises(monkeypatch):
    monkeypatch.setenv("LLM_OFFLINE", "1")
    monkeypatch.setattr(llm, "client", SimpleNamespace(models=SimpleNamespace(generate_content=boom)))
    with pytest.raises(llm.OfflineMiss):
        llm.structured(SYSTEM, f"never cached {uuid.uuid4()}", Tiny)


def test_budget_exceeded_before_call(monkeypatch):
    monkeypatch.delenv("LLM_OFFLINE", raising=False)
    monkeypatch.setenv("LLM_BUDGET_EUR", "0.000001")
    monkeypatch.setattr(llm, "client", SimpleNamespace(models=SimpleNamespace(generate_content=boom)))
    before = llm.spent()
    with pytest.raises(llm.BudgetExceeded):
        llm.structured(SYSTEM, f"never cached {uuid.uuid4()}", Tiny)
    assert llm.spent() == before


def test_backoff_and_validation_retry(monkeypatch, tmp_path):
    """Fake client: one 429, then invalid JSON, then valid JSON for the retry prompt. No network, temp cache."""
    monkeypatch.delenv("LLM_OFFLINE", raising=False)
    monkeypatch.setattr(llm, "CACHE", tmp_path)
    monkeypatch.setattr(llm.time, "sleep", lambda s: None)
    replies = [errors.APIError(429, {"error": {"message": "slow down", "status": "RESOURCE_EXHAUSTED"}}),
               '{"answer": "maybe", "reason": "x"}', '{"answer": "no", "reason": "fixed"}']
    prompts = []

    def fake(model, contents, config):
        prompts.append(contents)
        r = replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return SimpleNamespace(text=r, model_version="fake-1",
                               usage_metadata=SimpleNamespace(prompt_token_count=10, candidates_token_count=5, thoughts_token_count=None))

    monkeypatch.setattr(llm, "client", SimpleNamespace(models=SimpleNamespace(generate_content=fake)))
    out = llm.structured(SYSTEM, "q", Tiny)
    assert out == Tiny(answer="no", reason="fixed")
    assert prompts[0] == prompts[1] == "q" and "invalid" in prompts[2]
    assert llm.spent()["calls"] == 2 and len(list(tmp_path.glob("[0-9a-f]*.json"))) == 2


def test_invalid_twice_raises_with_raw_text(monkeypatch, tmp_path):
    monkeypatch.delenv("LLM_OFFLINE", raising=False)
    monkeypatch.setattr(llm, "CACHE", tmp_path)
    fake = lambda model, contents, config: SimpleNamespace(text="not json", model_version="fake-1", usage_metadata=None)
    monkeypatch.setattr(llm, "client", SimpleNamespace(models=SimpleNamespace(generate_content=fake)))
    with pytest.raises(ValueError, match="not json"):
        llm.structured(SYSTEM, "q", Tiny)
