"""The only module that talks to an LLM: Gemini on Vertex AI (ADC auth, no API key), with a disk cache and a spend cap."""
import hashlib
import json
import os
import sys
import time
from pathlib import Path

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

EXTRACT_MODEL = "gemini-4-argon"
GENERATE_MODEL = "gemini-3.5-flash"
EUR_PER_M_INPUT = 5.0    # conservative placeholder for both models until real prices are pasted in
EUR_PER_M_OUTPUT = 20.0
MAX_OUTPUT_TOKENS = 4096
CACHE = Path(__file__).parent / ".llm_cache"
SAFETY = [types.SafetySetting(category=c, threshold=types.HarmBlockThreshold.BLOCK_NONE) for c in (
    types.HarmCategory.HARM_CATEGORY_HARASSMENT, types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT)]


class OfflineMiss(RuntimeError):
    """LLM_OFFLINE=1 and the prompt is not in .llm_cache/."""


class BudgetExceeded(RuntimeError):
    """A live call could push the recorded spend past LLM_BUDGET_EUR."""


_project = os.environ.get("GOOGLE_CLOUD_PROJECT")
# None without the variable so cache-only (offline) runs still import; a live call then raises naming it.
client = genai.Client(vertexai=True, project=_project, location="global") if _project else None


def _eur(tokens_in: int, tokens_out: int) -> float:
    return tokens_in * EUR_PER_M_INPUT / 1e6 + tokens_out * EUR_PER_M_OUTPUT / 1e6


def _spend_file() -> Path:
    return CACHE / "_spend.json"


def spent() -> dict:
    f = _spend_file()
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"eur": 0.0, "calls": 0, "input_tokens": 0, "output_tokens": 0}


def _call(model: str, system: str, user: str, schema: type[BaseModel]) -> dict:
    """One live call with 429/503 backoff. Returns the cache record."""
    if client is None:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is not set; set it to the Vertex AI project ID (auth is ADC, no API key).")
    config = types.GenerateContentConfig(
        system_instruction=system, response_mime_type="application/json", response_schema=schema,
        temperature=0, max_output_tokens=MAX_OUTPUT_TOKENS, safety_settings=SAFETY)
    for attempt in range(5):
        try:
            r = client.models.generate_content(model=model, contents=user, config=config)
            break
        except errors.APIError as e:
            if e.code not in (429, 503) or attempt == 4:
                raise
            time.sleep(2 ** attempt)
    u = r.usage_metadata
    tin = (u and u.prompt_token_count) or 0
    tout = ((u and u.candidates_token_count) or 0) + ((u and u.thoughts_token_count) or 0)
    return {"model": model, "model_version": r.model_version, "text": r.text, "input_tokens": tin, "output_tokens": tout}


def cache_path(model: str, system: str, user: str, schema: type[BaseModel]) -> Path:
    key = hashlib.sha256(json.dumps([model, system, user, schema.model_json_schema()], sort_keys=True).encode()).hexdigest()
    return CACHE / f"{key}.json"


def _raw(model: str, system: str, user: str, schema: type[BaseModel]) -> str:
    """Response text for this exact prompt: from the cache, else live (checked against offline mode and budget)."""
    path = cache_path(model, system, user, schema)
    key = path.stem
    if path.exists():
        rec = json.loads(path.read_text(encoding="utf-8"))
        print(f"llm model={model} cache=hit in={rec['input_tokens']} out={rec['output_tokens']} key={key[:12]}", file=sys.stderr)
        return rec["text"]
    if os.environ.get("LLM_OFFLINE") == "1":
        raise OfflineMiss(f"LLM_OFFLINE=1 and no cache entry {path.name} (model={model})")
    budget = float(os.environ.get("LLM_BUDGET_EUR", "50"))
    total = spent()
    # Worst case before the call: ~2 chars per input token, and the full output allowance.
    worst = _eur((len(system) + len(user) + len(json.dumps(schema.model_json_schema()))) // 2, MAX_OUTPUT_TOKENS)
    if total["eur"] + worst > budget:
        raise BudgetExceeded(f"spent {total['eur']:.4f} EUR + worst case {worst:.4f} EUR would pass LLM_BUDGET_EUR={budget}")
    rec = _call(model, system, user, schema)
    cost = _eur(rec["input_tokens"], rec["output_tokens"])
    CACHE.mkdir(exist_ok=True)
    path.write_text(json.dumps(rec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    total = {"eur": round(total["eur"] + cost, 6), "calls": total["calls"] + 1,
             "input_tokens": total["input_tokens"] + rec["input_tokens"], "output_tokens": total["output_tokens"] + rec["output_tokens"]}
    _spend_file().write_text(json.dumps(total, indent=2) + "\n", encoding="utf-8")
    print(f"llm model={model} version={rec['model_version']} cache=miss in={rec['input_tokens']} out={rec['output_tokens']} "
          f"eur={cost:.5f} total_eur={total['eur']:.4f} key={key[:12]}", file=sys.stderr)
    return rec["text"]


def structured(system: str, user: str, schema: type[BaseModel], model: str = EXTRACT_MODEL) -> BaseModel | None:
    """Ask `model` for JSON matching `schema`. One retry with the validation error appended; never a partial object."""
    text = _raw(model, system, user, schema)
    try:
        return schema.model_validate_json(text or "")
    except ValidationError as e:
        retry_user = f"{user}\n\nYour previous answer was invalid: {e}\nReturn only JSON that matches the schema."
    text = _raw(model, system, retry_user, schema)
    try:
        return schema.model_validate_json(text or "")
    except ValidationError as e:
        raise ValueError(f"{model} returned invalid JSON twice for {schema.__name__}: {e}\nraw: {text!r}") from e
