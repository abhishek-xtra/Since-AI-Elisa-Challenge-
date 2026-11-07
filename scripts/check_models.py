"""Step 0: one call to each model ID; print model_version and write the 'Models used' section of README.md."""
import json
import re
import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import llm  # noqa: E402


class Ping(BaseModel):
    ok: Literal["yes", "no"]


SYSTEM = "Reply with JSON."
USER = "Are you available? Answer yes."
USES = {llm.EXTRACT_MODEL: "extractor: reads Teams/email threads and returns the structured rule (EXTRACT_MODEL)",
        llm.GENERATE_MODEL: "synthetic scenario threads from scripts, a different model on purpose (GENERATE_MODEL)"}

rows = []
for model, use in USES.items():
    assert llm.structured(SYSTEM, USER, Ping, model=model).ok in ("yes", "no")
    version = json.loads(llm.cache_path(model, SYSTEM, USER, Ping).read_text(encoding="utf-8"))["model_version"]
    print(f"{model}: model_version={version}")
    rows.append(f"| `{model}` | `{version}` | {use} |")

section = ("## Models used\n\nGemini on Google Cloud Vertex AI (location `global`, Application Default Credentials, no API key). "
           "All calls go through `llm.py` and are cached in `.llm_cache/`.\n\n"
           "| Model ID | model_version (from the response) | Used for |\n|---|---|---|\n" + "\n".join(rows) + "\n")
readme = ROOT / "README.md"
text = readme.read_text(encoding="utf-8") if readme.exists() else "# Elisa hidden-knowledge context layer\n"
if "## Models used" in text:  # replace the section on re-run, keep everything else
    text = re.sub(r"^## Models used\n.*?(?=^## |\Z)", lambda m: section + "\n", text, flags=re.S | re.M).rstrip() + "\n"
else:
    text = text.rstrip() + "\n\n" + section
readme.write_text(text, encoding="utf-8")
print(f"wrote {readme}")
