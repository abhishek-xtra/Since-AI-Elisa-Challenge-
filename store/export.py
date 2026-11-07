"""pyvis HTML export of graph() output: the fallback when Neo4j Browser is not available."""
from pathlib import Path

from pyvis.network import Network

COLORS = {"assertion": "#ffb000", "node": "#4f9dde", "site": "#4fc08d", "region": "#a070d0", "model": "#7f8c99", "source": "#d06070"}


def export_pyvis(graph: dict, path: str) -> None:
    net = Network(height="900px", width="100%", directed=True, bgcolor="#111418", font_color="#e6e6e6", cdn_resources="in_line")
    for n in graph["nodes"]:
        big = n["kind"] == "assertion"
        net.add_node(n["id"], label=n["label"], title=f"{n['id']} ({n['kind']})", color=COLORS[n["kind"]],
                     size=30 if big else 12, shape="star" if big else "dot")
    for e in graph["edges"]:
        net.add_edge(e["from"], e["to"], label=e["kind"], title=e.get("predicate", e["kind"]))
    # generate_html + utf-8 write: pyvis's write_html uses the locale encoding and breaks on 'ä' on Windows
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(net.generate_html(), encoding="utf-8")
