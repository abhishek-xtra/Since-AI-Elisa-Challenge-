"""The one question (contracts/get_context.md): key, scope and edge questions, and applying an answer. No model call."""
from contracts.models import Assertion, Decided, Node, Option, Question, Topology
from extractor.vote import raise_edge
from predicates import lookup, parse
from predicates.evaluate import _attribute

from agent import append_json, read_json_list

FAILED = ("fails", "missing")


def question_key(results: dict[str, str]) -> str:
    """results: candidate predicate -> evaluation result. Any failure: every pair; otherwise only the unknown ones."""
    failing = any(r in FAILED for r in results.values())
    return " | ".join(sorted(f"{p}={r}" for p, r in results.items() if failing or r == "unknown"))


def parse_key(key: str) -> list[tuple[str, str]]:
    return [tuple(part.rsplit("=", 1)) for part in key.split(" | ")]


def _edges(a: Assertion) -> dict[str, str]:
    edges = {c.predicate: c.edge for c in a.applies_to.candidates}
    if a.applies_to.decided:
        edges[a.applies_to.decided.predicate] = a.applies_to.decided.edge
    return edges


def _broad(predicate: str) -> str:
    attr, op, value = parse(predicate)
    if attr == "install_year" and op != "==" and op != "!=":
        return "All older units" if "<" in op else "All newer units"
    if op == "==":
        return {"model": f"All {value} units", "firmware": f"All on firmware {value}", "site": f"All of {value}",
                "region": f"All of the {value} region"}.get(attr, f"All where {predicate}")
    return f"All where {predicate}"


def _narrow(predicate: str) -> str:
    _, op, value = parse(predicate)
    return f"Only {value}" if op == "==" else f"Only where {predicate}"


def _attr_results(results: dict[str, str]) -> dict[str, str]:
    return {parse(p)[0]: r for p, r in results.items()}


def _scope_text(entity, results: dict[str, str], topology: Topology) -> str:
    by_attr = _attr_results(results)
    parts = []
    if "model" in by_attr:
        parts.append("same model" if by_attr["model"] == "holds" else "different model")
    if "install_year" in by_attr and isinstance(entity, Node):
        parts.append(f"installed {entity.install_year}")
    parts += [f"different {attr.replace('_', ' ')}" for attr, r in by_attr.items()
              if r in FAILED and attr not in ("model", "install_year")]
    s = ", ".join(parts)
    return s[:1].upper() + s[1:] + "." if s else ""


def _edge_text(entity, results: dict[str, str], topology: Topology) -> str:
    parts = []
    for p, r in results.items():
        if r != "unknown":
            continue
        attr, op, _ = parse(p)
        word = "newer" if "<" in op else "older"
        name = "Installed" if attr == "install_year" else attr.replace("_", " ").capitalize()
        parts.append(f"{name} {_attribute(entity, attr, topology)}, {word} than any unit it has worked on")
    return "; ".join(parts) + "."


def build_question(assertion: Assertion, entity, results_by_candidate: dict[str, str], topology: Topology) -> Question:
    origin = assertion.evidence.cases[0].entity if assertion.evidence.cases else assertion.id
    edges = _edges(assertion)
    if any(r in FAILED for r in results_by_candidate.values()):
        detail = _scope_text(entity, results_by_candidate, topology)
        options = [Option(label=_broad(p), sets_decided=p, edge="open" if edges.get(p) == "open" else None)
                   for p, r in results_by_candidate.items() if r == "holds"]
        options += [Option(label=_narrow(p), sets_decided=p, edge="open" if edges.get(p) == "open" else None)
                    for p, r in results_by_candidate.items() if r in FAILED]
        options.append(Option(label="No", sets_decided=f"id == '{origin}'"))
    else:
        detail = _edge_text(entity, results_by_candidate, topology)
        options = [Option(label="Yes", edge_answer="raise"), Option(label="No", edge_answer="close")]
    return Question(
        assertion_id=assertion.id, key=question_key(results_by_candidate), to=assertion.evidence.said_by,
        thread_id=assertion.evidence.sources[0].split(":", 1)[-1] if assertion.evidence.sources else "",
        text=f"Your {origin} tip: does it apply to {entity.id} too? {detail}".strip(), options=options)


def record_question(question: Question, entity_id: str) -> None:
    """out/questions.json is the record answer() reads; the frontend shows it."""
    append_json("questions.json", {**question.model_dump(mode="json"), "entity_id": entity_id})


def answer(store, assertion_id: str, option_index: int, topology: Topology | None = None) -> Assertion:
    pending = [q for q in read_json_list("questions.json") if q["assertion_id"] == assertion_id]
    if not pending:
        raise ValueError(f"no question recorded for {assertion_id}")
    q = pending[-1]
    option = Option.model_validate(q["options"][option_index])  # IndexError on a bad index, nothing written
    a = store.get(assertion_id).model_copy(deep=True)
    if option.sets_decided:
        a.applies_to.decided = Decided(predicate=option.sets_decided, edge=option.edge or "closed")
        a.status = "decided"
    else:
        if topology is None:
            from pipeline import load_topology
            topology = load_topology()
        entity = lookup(topology, q["entity_id"])
        decided = a.applies_to.decided
        for predicate, result in parse_key(q["key"]):
            if result != "unknown":
                continue
            new = raise_edge(predicate, entity, topology) if option.edge_answer == "raise" else predicate
            for c in a.applies_to.candidates:
                if c.predicate == predicate:
                    c.predicate = new
                    if option.edge_answer == "close":
                        c.edge = "closed"
            if decided and decided.predicate == predicate:
                decided.predicate = new
                if option.edge_answer == "close":
                    decided.edge = "closed"  # decided is the candidate asked about; see docs/DECISIONS.md
    if q["key"] not in a.questions_asked:
        a.questions_asked.append(q["key"])
    store.put(a)
    return a
