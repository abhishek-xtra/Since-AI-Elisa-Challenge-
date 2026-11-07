import json
from pathlib import Path

import jsonschema

from adapters import load_email, load_teams

EX = Path("data/elisa_examples")
SCHEMA = json.loads(Path("contracts/message.schema.json").read_text(encoding="utf-8"))


def valid(messages):
    for m in messages:
        jsonschema.validate(m.model_dump(mode="json"), SCHEMA, cls=jsonschema.Draft202012Validator,
                            format_checker=jsonschema.Draft202012Validator.FORMAT_CHECKER)


def test_teams_chat():
    msgs = load_teams(EX / "teams_chat.json")
    assert len(msgs) == 12
    assert [m.id for m in msgs] == [f"teams:thread-001:{i}" for i in range(1, 13)]
    assert len({m.id for m in msgs}) == 12
    assert msgs[0].author == "Veikko Vikkelä" and msgs[0].role == "field_engineer"
    assert msgs[1].role == "expert"
    assert msgs[0].timestamp.isoformat() == "2026-11-01T09:14:00+02:00"
    assert msgs[-1].timestamp.isoformat() == "2026-11-01T09:27:00+02:00"
    assert all(m.thread_id == "thread-001" and m.channel == "teams" for m in msgs)
    valid(msgs)


def test_email():
    [m] = load_email(EX / "email.txt")
    assert m.id == "email:001" and m.channel == "email"
    assert m.author == "Erkki Expert" and m.role == "expert"
    assert m.text.startswith("Subject: RE: TRN-042 traffic not recovering after SFP replacement\n")
    assert "disabling and enabling the interface once" in m.text
    assert m.text.endswith("Erkki")
    assert m.timestamp.isoformat() == "2026-11-01T10:00:00+02:00"
    valid([m])


def test_scenario_date_and_other_role(tmp_path):
    p = tmp_path / "thread.json"
    p.write_text(json.dumps({"date": "2026-11-07", "messages": [
        {"seq": 2, "time": "08:05", "author": "B", "role": "Manager", "text": "ok"},
        {"seq": 1, "time": "08:00", "author": "Veikko Vikkelä", "role": "Field Engineer", "text": "the key moved"},
    ]}), encoding="utf-8")
    msgs = load_teams(p)
    assert [m.id for m in msgs] == ["teams:thread-thread:1", "teams:thread-thread:2"]
    assert msgs[0].timestamp.isoformat() == "2026-11-07T08:00:00+02:00"
    assert msgs[1].role == "other"
    assert load_teams(p, date="2026-10-02")[0].timestamp.isoformat() == "2026-10-02T08:00:00+02:00"
    valid(msgs)


def test_email_date_header(tmp_path):
    p = tmp_path / "barrier.txt"
    p.write_text("From: Someone\nTo: X\nSubject: key\nDate: Fri, 02 Oct 2026 14:30:00 +0300\n\n\nbody\n\n", encoding="utf-8")
    [m] = load_email(p)
    assert m.id == "email:barrier" and m.thread_id == "email-barrier" and m.role == "other"
    assert m.timestamp.isoformat() == "2026-10-02T14:30:00+03:00"
    assert m.text == "Subject: key\n\nbody"
