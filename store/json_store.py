"""JSON-file store: {"assertions": [...]}, rewritten on every write, ordered by id."""
import json
import os
import secrets
from pathlib import Path

from contracts.models import Assertion
from store.base import Store


class JsonStore(Store):
    def __init__(self, path):
        self.path = Path(path)
        self._data: dict[str, Assertion] = {}
        if self.path.exists():
            for d in json.loads(self.path.read_text(encoding="utf-8"))["assertions"]:
                a = Assertion.model_validate(d)
                self._data[a.id] = a

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(f"{self.path.name}.{os.getpid()}.{secrets.token_hex(4)}.tmp")  # write-then-rename, unique per writer
        tmp.write_text(json.dumps({"assertions": [a.model_dump(mode="json") for a in self.all()]}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        tmp.replace(self.path)

    def put(self, assertion: Assertion) -> None:
        self._data[assertion.id] = assertion
        self._save()

    def get(self, id: str) -> Assertion | None:
        return self._data.get(id)

    def all(self) -> list[Assertion]:
        return [self._data[k] for k in sorted(self._data)]

    def replace_all(self, assertions: list[Assertion]) -> None:
        self._data = {a.id: a for a in assertions}
        self._save()
