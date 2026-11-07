# Predicates

A candidate scope (`applies_to.candidates[].predicate`, `applies_to.decided.predicate`, `Option.sets_decided`) is one predicate over one topology entity.

## Grammar

```
predicate := attr SP op SP value
attr      := id | type | model | install_year | firmware | site | region
op        := == | != | < | <= | > | >=
value     := 'single-quoted string' | integer
```

- `attr` is a `Node` attribute (`contracts/topology.schema.json`) or `region`, which is resolved through the node's site (`topology.sites[node.site].region`).
- `id == 'X'` is allowed. It is only ever produced when the text or the expert's answer limits the rule to that one unit ("only this one", the "No" option). It is never a default candidate.
- `firmware` is compared by the numeric tuple of the dotted version: `'5.10' > '5.2'`, `'4.1' == '4.1.0'` is false (tuples of different length compare as Python tuples).
- `install_year` compares as an integer. Every other attribute compares as a string; `<`/`>` on a plain string attribute is an error.
- Exactly one space either side of `op`. No `and`/`or`: a conjunction is several candidates.
- `peer.<attr>` (an attribute of a linked device) is **reserved**. Links are pending Elisa's answer; the evaluator raises `NotImplementedError` for it.

## Evaluator

```python
def evaluate(predicate: str, node: Node, topology: Topology, edge: str = "closed") -> Literal["holds", "fails", "unknown", "missing"]
```

Lives in `predicates/evaluate.py` (module 3). Pure, deterministic, no model call.

| Result | When |
|---|---|
| `holds` | the comparison is true |
| `fails` | the comparison is false, and the candidate is `closed` (or the op is `==`/`!=`) |
| `unknown` | only for an `edge="open"` candidate whose op is `<=`/`<` and the node's value is above the number (or `>=`/`>` and the value is below it). The number is the newest value known to be in, not a boundary, so the system does not claim the rule stops there. |
| `missing` | the attribute does not exist on this node (or the node's site is not in the topology, for `region`). Treated as a failure everywhere. An open edge never turns `missing` into `unknown`. |

Examples on the seed topology:

| Predicate | Edge | Node | Result |
|---|---|---|---|
| `install_year <= 2019` | open | TRN-087 (2018) | holds |
| `install_year <= 2019` | open | TRN-120 (2020) | unknown |
| `install_year <= 2019` | closed | TRN-120 (2020) | fails |
| `region == 'north'` | closed | TRN-101 (HEL-02, south) | fails |
| `firmware < '5.2'` | closed | TRN-102 (5.10) | fails |
| `site == 'OULU-07'` | closed | TRN-087 | fails |
| `vendor == 'X'` | closed | any | missing |
