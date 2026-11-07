// The one place that knows which data source is active. Components import from here only.
import { createApiSource, NotAvailable } from "./apiSource";
import { adviceSentence, assertionIds, attachments, formatDay, isHunch, isLive, labelFor, regionId, scopeHolds, withNetworkEdges } from "./derive";
import { createMockSource } from "./mockSource";
import type { Assertion, ChatReply, DataSource, Graph } from "./types";

export type { DataSource } from "./types";

export function sourceFromEnv(env: { VITE_DATA_SOURCE?: string; VITE_API_URL?: string } = import.meta.env): DataSource {
  if (env.VITE_DATA_SOURCE === "api") return createApiSource(env.VITE_API_URL || "http://localhost:8000");
  return createMockSource();
}

let active: DataSource | null = null;
export function getSource(): DataSource {
  return (active ??= sourceFromEnv());
}
/** Tests swap the source here. */
export function setSource(s: DataSource | null) {
  active = s;
}

/** Every assertion the graph lists, as full objects. */
export async function loadAssertions(src: DataSource, graph?: Graph): Promise<Assertion[]> {
  const g = graph ?? (await src.getGraph());
  return Promise.all(assertionIds(g).map((id) => src.getAssertion(id)));
}

/** Network ids an entity sits in: itself, its site and its region. */
function containers(graph: Graph, entityId: string): string[] {
  const g = withNetworkEdges(graph);
  const out = [entityId];
  let frontier = [entityId];
  for (let i = 0; i < 2; i++) {
    const next = g.edges.filter((e) => frontier.includes(e.from) && (e.kind === "IN_SITE" || e.kind === "IN_REGION")).map((e) => e.to);
    out.push(...next);
    frontier = next;
  }
  const node = g.nodes.find((n) => n.id === entityId);
  if (node?.kind === "node" && typeof node.attrs.region === "string") out.push(regionId(node.attrs.region));
  return [...new Set(out)];
}

/** B3 fallback: live, non-hunch tips that touch the entity, its site or region, or whose scope holds for it. */
export async function contextFromGraph(src: DataSource, entityId: string): Promise<Assertion[]> {
  const graph = await src.getGraph();
  const all = await loadAssertions(src, graph);
  const g = withNetworkEdges(graph);
  const node = g.nodes.find((n) => n.id === entityId);
  const around = new Set(containers(graph, entityId));
  return all.filter(
    (a) => isLive(a) && !isHunch(a) && (attachments(a, graph).some((t) => around.has(t)) || (node ? scopeHolds(a, node) : false)),
  );
}

export async function lookupContext(src: DataSource, entityId: string): Promise<Assertion[]> {
  if (src.getContextFor) {
    try {
      return await src.getContextFor(entityId);
    } catch (e) {
      if (!(e instanceof NotAvailable)) throw e;
    }
  }
  return contextFromGraph(src, entityId);
}

export const ADD_NOT_CONNECTED = "Adding context from here isn't connected yet. Say it in your team chat and it will be picked up.";

/** A plain reply built from the tips found, with no model, for when chat() does not exist. */
export function plainReply(entityId: string, tips: Assertion[], all: Assertion[]): string {
  if (!tips.length) return `Nothing saved for ${entityId} yet.`;
  return tips
    .map((a) => {
      const old = a.supersedes ? all.find((x) => x.id === a.supersedes) : undefined;
      const updated = old ? ` Updated ${formatDay(a.valid_from)}, replacing earlier info from ${formatDay(old.valid_from)}.` : "";
      return `${labelFor(a)}: ${adviceSentence(a)}${updated}`;
    })
    .join(" ");
}

export async function sendChat(src: DataSource, text: string): Promise<ChatReply> {
  if (src.chat) {
    try {
      return await src.chat(text);
    } catch (e) {
      if (!(e instanceof NotAvailable)) throw e;
    }
  }
  const isAsk = /\?\s*$/.test(text.trim());
  if (!isAsk) return { kind: "add", reply: ADD_NOT_CONNECTED, assertion_ids: [] };

  const graph = await src.getGraph();
  const ids = graph.nodes.filter((n) => n.kind === "node" || n.kind === "site").map((n) => n.id);
  const squash = (s: string) => s.toUpperCase().replace(/[\s_-]+/g, "");
  const entity = ids.find((id) => squash(text).includes(squash(id)));
  if (!entity) return { kind: "ask", reply: "Name a device or site to look it up, for example TRN-087 or OULU-03.", assertion_ids: [] };
  const tips = await lookupContext(src, entity);
  const all = await loadAssertions(src, graph);
  return { kind: "ask", reply: plainReply(entity, tips, all), assertion_ids: tips.map((a) => a.id) };
}
