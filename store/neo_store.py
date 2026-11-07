"""Neo4j store. Start Neo4j with:

    docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/hackathon neo4j:5

then NeoStore("bolt://localhost:7687", "neo4j", "hackathon"). Browse at http://localhost:7474.
Each assertion is (:Assertion {id, json}) with SCOPED_BY / EVIDENCED_BY / CASE relationships to (:Entity {id}).
Entity nodes only ever get an id; topology attributes are never written here.
"""
from neo4j import GraphDatabase

from contracts.models import Assertion
from store.base import Store, origin, scope_target

PUT = """
MERGE (a:Assertion {id: $id}) SET a.json = $json
WITH a OPTIONAL MATCH (a)-[r]->() DELETE r
WITH DISTINCT a
FOREACH (s IN $scoped | MERGE (e:Entity {id: s.to}) MERGE (a)-[r:SCOPED_BY {predicate: s.predicate}]->(e)
         SET r.support = s.support, r.against = s.against, r.edge = s.edge)
FOREACH (src IN $sources | MERGE (e:Entity {id: src}) MERGE (a)-[:EVIDENCED_BY]->(e))
FOREACH (c IN $cases | MERGE (e:Entity {id: c}) MERGE (a)-[:CASE]->(e))
"""


class NeoStore(Store):
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.driver.verify_connectivity()

    def _q(self, query: str, **params):
        return self.driver.execute_query(query, params).records

    def put(self, assertion: Assertion) -> None:
        o = origin(assertion)
        scoped = [{"to": to, "predicate": c.predicate, "support": c.support, "against": c.against, "edge": c.edge}
                  for c in assertion.applies_to.candidates if (to := scope_target(c.predicate, o))]
        self._q(PUT, id=assertion.id, json=assertion.model_dump_json(), scoped=scoped,
                sources=assertion.evidence.sources, cases=sorted({c.entity for c in assertion.evidence.cases}))

    def get(self, id: str) -> Assertion | None:
        recs = self._q("MATCH (a:Assertion {id: $id}) RETURN a.json AS j", id=id)
        return Assertion.model_validate_json(recs[0]["j"]) if recs else None

    def all(self) -> list[Assertion]:
        return [Assertion.model_validate_json(r["j"]) for r in self._q("MATCH (a:Assertion) RETURN a.json AS j ORDER BY a.id")]

    def replace_all(self, assertions: list[Assertion]) -> None:
        self._q("MATCH (a:Assertion) DETACH DELETE a")
        for a in assertions:
            self.put(a)

    def close(self):
        self.driver.close()
