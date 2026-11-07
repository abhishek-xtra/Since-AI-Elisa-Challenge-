"""Module 8 API (BACKEND_PROMPT section 8): serves the out/ files and the store. Run: uvicorn api.app:app

Same JSON shapes as the files. POST /incident and POST /answer change state, then regenerate out/ like a demo beat.
"""
import json
import re
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AwareDatetime, BaseModel, Field

import demo
import llm
from agent import out_path, read_json_list
from agent.get_context import get_context
from agent.questions import answer as apply_answer
from agent.stand_in import AgentProposal, propose, proposal_text
from contracts.vocabulary import Event, Symptom

app = FastAPI(title="Elisa context layer")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Incident(BaseModel):
    entity_id: str
    event: Event
    symptoms: list[Symptom] = []
    at_time: AwareDatetime  # a naive time cannot be compared with stored validity: 422, not 500


class Answer(BaseModel):
    assertion_id: str
    option_index: int = Field(ge=0)


LOCK = threading.Lock()  # /incident and /answer read-modify-write the whole store file; one at a time
_THREAD_ID = re.compile(r"[A-Za-z0-9_.-]+")


def read(name: str):
    p = out_path(name)
    if not p.exists():
        raise HTTPException(404, f"{name} not found; run demo.py first")
    return json.loads(p.read_text(encoding="utf-8"))


@app.get("/assertions")
def assertions():
    return read("assertions.json")


@app.get("/graph")
def graph():
    return read("graph.json")


@app.get("/threads/{thread_id}")
def thread(thread_id: str):
    # thread_id becomes part of a file path: no separators, no '..', and the result must stay inside out/
    if (not _THREAD_ID.fullmatch(thread_id) or ".." in thread_id
            or not out_path(f"thread_{thread_id}.json").resolve().is_relative_to(out_path("").resolve())):
        raise HTTPException(404, f"thread {thread_id} not found")
    return read(f"thread_{thread_id}.json")


@app.get("/beats/{n}")
def beat(n: int):
    return read(f"beat_{n}.json")


def agent_text(results, body: Incident) -> str:
    try:
        return proposal_text(results, propose(results, body.entity_id, body.event, body.symptoms))
    except llm.OfflineMiss:  # not a demo input and LLM_OFFLINE=1: the same text, built without the model
        proposed = [r.assertion for r in results if r.outcome == "proposed"]
        if not proposed:
            return "No captured context applies; default field procedure."
        a = proposed[0]
        return proposal_text(results, AgentProposal(action=a.action, action_text=a.action_text, avoid=a.avoid,
                                                    cites=[x.id for x in proposed]))


@app.post("/incident")
def incident(body: Incident):
    with LOCK:
        s = demo.store()
        try:
            results = get_context(s, demo.TOPO, body.entity_id, body.event, body.symptoms, body.at_time)
        except ValueError as e:
            raise HTTPException(404, str(e))
        demo.refresh(s)
    return {"results": [demo.dump(r) for r in results], "agent_text": agent_text(results, body)}  # model call outside the lock


@app.post("/answer")
def answer(body: Answer):
    with LOCK:
        s = demo.store()
        if s.get(body.assertion_id) is None:
            raise HTTPException(404, f"unknown assertion {body.assertion_id}")
        pending = [q for q in read_json_list("questions.json") if q["assertion_id"] == body.assertion_id]
        if not pending or pending[-1]["key"] in s.get(body.assertion_id).questions_asked:
            raise HTTPException(409, f"no question pending for {body.assertion_id}")
        if body.option_index >= len(pending[-1]["options"]):
            raise HTTPException(422, f"no option {body.option_index}")
        try:
            a = apply_answer(s, body.assertion_id, body.option_index, demo.TOPO)
        except ValueError as e:
            raise HTTPException(409, str(e))
        demo.refresh(s)
        return demo.dump(a)
