"""Stand-in for the network operations agent (BACKEND_PROMPT 2b): ONE llm.structured call that turns get_context
results into a proposal. It has no tools and no say over scope; proposal_text is built in code, not by the model."""
import json

from pydantic import BaseModel, Field

import llm
from contracts.models import ContextResult
from contracts.vocabulary import Action

SYSTEM = ("You are the stand-in for the network operations agent. You have no tools. You must base the proposal only on "
          "the context results given; if none are proposed, fall back to the default field procedure (reboot the unit "
          "or replace the SFP again) and say so.")


class AgentProposal(BaseModel):
    """What the agent proposes for this incident."""
    action: Action = Field(description="The canonical action to take.")
    action_text: str = Field(description="One or two sentences to the field engineer: what to do.")
    avoid: list[Action] = Field(description="Actions to avoid, from the proposed context results.")
    cites: list[str] = Field(description="IDs of the context assertions the proposal is based on; empty if none.")


def _result_view(r: ContextResult) -> dict:
    a = r.assertion
    return {"id": a.id, "outcome": r.outcome, "reason": r.reason, "action": a.action, "action_text": a.action_text,
            "avoid": a.avoid, "said_by": a.evidence.said_by, "trust": a.trust, "cases": len(a.evidence.cases)}


def propose(results: list[ContextResult], entity_id: str, event: str, symptoms: list[str]) -> AgentProposal:
    user = (f"Incident: {event} on {entity_id}, symptoms: {', '.join(symptoms)}.\n"
            f"Context results:\n{json.dumps([_result_view(r) for r in results], indent=2, ensure_ascii=False)}")
    return llm.structured(SYSTEM, user, AgentProposal)


def proposal_text(results: list[ContextResult], proposal: AgentProposal) -> str:
    """Contract step 6: action_text, avoid list, said_by, source channel, number of cases, dispute note."""
    proposed = [r for r in results if r.outcome == "proposed"]
    cited = [r for r in proposed if r.assertion.id in proposal.cites] or proposed
    if not cited:
        return f"No captured context applies; default field procedure: {proposal.action_text}"
    lines = []
    for r in cited:
        a = r.assertion
        n = len(a.evidence.cases)
        channels = ", ".join(dict.fromkeys(s.split(":", 1)[0] for s in a.evidence.sources))
        line = f"{a.action_text.rstrip('.')}."
        if a.avoid:
            line += f" Avoid: {', '.join(a.avoid)}."
        line += f" Source: {a.evidence.said_by} ({channels}), {n} case{'' if n == 1 else 's'}, {a.trust}."
        if r.reason.startswith("disputed"):
            line += f" Note: {r.reason}."
        lines.append(f"[{a.id}] {line}")
    return "\n".join(lines)
