"""One-off: the extractor reads four symptoms from Erkki's thread (incl. alarms_cleared); the
incident snapshots in expected.json must carry the same set or the trigger never matches."""
import json
import pathlib

n = 0
for p in pathlib.Path("data/scenarios").glob("*/expected.json"):
    d = json.loads(p.read_text(encoding="utf-8"))
    changed = False
    lists = [inc.get("symptoms", []) for inc in d.get("incidents", [])]
    trig = (d.get("assertion") or {}).get("trigger") or {}
    if trig.get("symptoms"):
        lists.append(trig["symptoms"])
    for s in lists:
        if "optics_normal" in s and "alarms_cleared" not in s:
            s.append("alarms_cleared")
            changed = True
    if changed:
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        n += 1
print("patched", n)
