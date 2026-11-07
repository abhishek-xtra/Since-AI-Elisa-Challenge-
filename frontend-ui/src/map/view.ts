// Chooses what is in view and counts badges (FRONTEND_PROMPT 5.3). Pure, so it is easy to test.
import { attachments, boundTargets, formatDay, isHunch, isLive, labelFor, regionId, scopeHolds, withNetworkEdges } from "../data/derive";
import type { Assertion, Graph, GraphNode } from "../data/types";
import { findRegion } from "./regions";

export type ViewNodeKind = "device" | "site" | "region" | "model" | "tip" | "badge";

export interface Badge {
  text: string;
  tips: number;
  /** Site ids to expand in place, or "zoom-out" for the rest of the network, or a region id to zoom into. */
  action: { type: "expand"; sites: string[] } | { type: "zoom-out" } | { type: "focus"; id: string };
}

export interface ViewNode {
  id: string;
  kind: ViewNodeKind;
  label: string;
  /** A short second line in plain words. */
  sublabel?: string;
  /** A background device: drawn as a dot only, its details in a tooltip. */
  quiet?: boolean;
  /** Tooltip text. */
  title?: string;
  focus?: boolean;
  tip?: Assertion;
  hunch?: boolean;
  badge?: Badge;
  /** Beat replay: a tip that no longer applies (replaced, expired, under review) stays, faded, with this word. */
  stale?: string;
  /** Beat replay: what the beat decided for this device, shown under it; dimmed when it was declined. */
  note?: string;
  dim?: boolean;
}

export interface ViewEdge {
  from: string;
  to: string;
  /** "scope": a tip's candidate scope, drawn until the expert's answer decides it. */
  kind: "net" | "tip" | "scope" | "badge";
}

export interface MapView {
  nodes: ViewNode[];
  edges: ViewEdge[];
  tips: Assertion[];
  focusId: string;
}

export interface ViewOptions {
  focus: string;
  showHunches: boolean;
  expanded: string[];
  at: Date;
  /** Beat replay: keep tips that no longer apply, marked stale, instead of dropping them. */
  keepStale?: boolean;
}

const NET_KINDS = new Set(["IN_SITE", "IN_REGION", "OF_MODEL"]);
const KIND: Record<string, ViewNodeKind> = { node: "device", site: "site", region: "region", model: "model" };

function adjacency(g: Graph) {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const e of g.edges) {
    if (!NET_KINDS.has(e.kind)) continue;
    link(e.from, e.to);
    link(e.to, e.from);
  }
  return adj;
}

function within(adj: Map<string, Set<string>>, start: string, depth: number): Set<string> {
  const seen = new Set([start]);
  let frontier = [start];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) for (const n of adj.get(id) ?? []) if (!seen.has(n)) (seen.add(n), next.push(n));
    frontier = next;
  }
  return seen;
}

/** Region id that a network entity belongs to, or undefined (e.g. a model group). */
function regionOfEntity(g: Graph, id: string): string | undefined {
  const node = g.nodes.find((n) => n.id === id);
  if (!node) return undefined;
  if (node.kind === "region") return node.id;
  if (node.kind === "site") return typeof node.attrs.region === "string" ? regionId(node.attrs.region) : undefined;
  if (node.kind === "node") {
    if (typeof node.attrs.region === "string") return regionId(node.attrs.region);
    const site = g.nodes.find((n) => n.id === node.attrs.site);
    return site && typeof site.attrs.region === "string" ? regionId(site.attrs.region) : undefined;
  }
  return undefined;
}

function siteOfEntity(g: Graph, id: string): string | undefined {
  const node = g.nodes.find((n) => n.id === id);
  if (!node) return undefined;
  if (node.kind === "site") return node.id;
  if (node.kind === "node" && typeof node.attrs.site === "string") return node.attrs.site;
  return undefined;
}

export function visibleTips(assertions: Assertion[], showHunches: boolean, at: Date, keepStale = false) {
  return assertions.filter((a) => (keepStale || isLive(a, at)) && (showHunches || !isHunch(a)));
}

/** Why a tip no longer applies, in one word, or undefined while it does. */
export function staleWord(a: Assertion, at: Date): string | undefined {
  if (a.superseded_by) return "Replaced";
  if (!isLive(a, at)) return "Expired";
  if (a.status === "review") return "Under review";
  return undefined;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function regionName(node: GraphNode): string {
  const known = findRegion(node.id) ?? findRegion(node.label || "");
  if (known) return known.name;
  const key = node.id.replace(/^region:/, "");
  return `${(node.label || key).replace(/_/g, " ")} region`;
}

function displayName(node: GraphNode): string {
  if (node.kind === "region") return regionName(node);
  if (node.kind === "site" && typeof node.attrs.name === "string" && node.attrs.name) return node.attrs.name;
  if (node.kind === "model") return `${node.label} units`;
  return node.label || node.id;
}

function deviceDetails(node: GraphNode): string {
  const parts = [node.attrs.model, node.attrs.install_year ? `installed ${node.attrs.install_year}` : undefined].filter(Boolean);
  return parts.join(" · ");
}

export function localView(graph: Graph, assertions: Assertion[], opts: ViewOptions): MapView {
  const g = withNetworkEdges(graph);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const adj = adjacency(g);
  const focusNode = byId.get(opts.focus);

  const inView = focusNode ? within(adj, opts.focus, 2) : new Set<string>();
  for (const site of opts.expanded) {
    inView.add(site);
    for (const n of adj.get(site) ?? []) if (byId.get(n)?.kind === "node" || byId.get(n)?.kind === "region") inView.add(n);
  }

  const nodes: ViewNode[] = [];
  const edges: ViewEdge[] = [];
  for (const id of [...inView].sort()) {
    const n = byId.get(id);
    if (!n || !KIND[n.kind]) continue;
    const kind = KIND[n.kind];
    const node: ViewNode = { id, kind, label: displayName(n), focus: id === opts.focus };
    if (kind === "site" && node.label !== id) node.sublabel = id;
    if (kind === "device") {
      node.title = `${id} · ${deviceDetails(n)}`;
      if (node.focus) node.sublabel = deviceDetails(n);
    }
    nodes.push(node);
  }
  for (const e of g.edges) if (NET_KINDS.has(e.kind) && inView.has(e.from) && inView.has(e.to)) edges.push({ from: e.from, to: e.to, kind: "net" });

  const candidates = visibleTips(assertions, opts.showHunches, opts.at, opts.keepStale);
  const shown: Assertion[] = [];
  const outside: Assertion[] = [];
  for (const a of candidates) {
    const att = attachments(a, graph).filter((t) => inView.has(t));
    const viaScope = focusNode ? scopeHolds(a, focusNode) : false;
    if (!att.length && !viaScope) {
      outside.push(a);
      continue;
    }
    shown.push(a);
    nodes.push({ id: a.id, kind: "tip", label: labelFor(a), tip: a, hunch: isHunch(a), stale: staleWord(a, opts.at) });
    const targets = att.length ? att : [opts.focus];
    // Undecided scope: the edges that only exist through a candidate predicate are drawn as candidates.
    const scope = a.applies_to.decided ? [] : boundTargets(a);
    const cased = new Set(a.evidence.cases.map((c) => c.entity));
    for (const t of targets) edges.push({ from: a.id, to: t, kind: scope.includes(t) && !cased.has(t) ? "scope" : "tip" });
  }

  // Only devices that matter get a text label: the focus, and devices where a tip was used.
  const tipEnds = new Set(edges.filter((e) => e.kind === "tip" || e.kind === "scope").map((e) => e.to));
  for (const n of nodes) {
    if (n.kind !== "device" || n.focus) continue;
    if (!tipEnds.has(n.id)) {
      // A background device: a faint short label in plain words, no ID.
      n.quiet = true;
      const g0 = byId.get(n.id);
      const model = g0?.attrs.model;
      const year = g0?.attrs.install_year;
      n.label = [model, year].filter((x) => x !== undefined && x !== null && x !== "").join(" · ") || n.id;
      continue;
    }
    const used = shown.flatMap((a) => a.evidence.cases.filter((c) => c.entity === n.id)).sort((x, y) => x.at.localeCompare(y.at))[0];
    if (used) n.sublabel = `${used.outcome === "recovered" ? "Fixed here" : "Seen here"} ${formatDay(used.at)}`;
  }

  // Badges: one per region in view for its sites outside the view, one for the rest of the network.
  const regionsInView = nodes.filter((n) => n.kind === "region").map((n) => n.id);
  const sitesOutside = new Map<string, string[]>();
  for (const n of g.nodes) {
    if (n.kind !== "site" || inView.has(n.id)) continue;
    const r = regionOfEntity(g, n.id);
    if (r && regionsInView.includes(r)) sitesOutside.set(r, [...(sitesOutside.get(r) ?? []), n.id]);
  }
  // A tip outside the view counts toward its region's badge when that region is in view, otherwise toward the rest.
  const tipCount = new Map<string, number>();
  const tipSites = new Map<string, Set<string>>();
  let restTips = 0;
  for (const a of outside) {
    const att = attachments(a, graph);
    const region = att.map((t) => regionOfEntity(g, t)).find((r) => r && regionsInView.includes(r));
    if (!region) {
      restTips++;
      continue;
    }
    tipCount.set(region, (tipCount.get(region) ?? 0) + 1);
    const sites = tipSites.get(region) ?? new Set<string>();
    for (const t of att) {
      const site = siteOfEntity(g, t);
      if (site) sites.add(site);
    }
    tipSites.set(region, sites);
  }
  for (const region of regionsInView) {
    const sites = sitesOutside.get(region) ?? [];
    const tips = tipCount.get(region) ?? 0;
    if (!sites.length && !tips) continue;
    const id = `badge:${region}`;
    const tipText = tips ? plural(tips, "tip") : "no tips";
    const label = sites.length ? `${plural(sites.length, "more site")} nearby · ${tipText}` : `${plural(tips, "more tip")} nearby`;
    nodes.push({
      id,
      kind: "badge",
      label,
      badge: { text: "", tips, action: { type: "expand", sites: [...new Set([...sites, ...(tipSites.get(region) ?? [])])] } },
    });
    edges.push({ from: id, to: region, kind: "badge" });
  }
  const otherRegions = g.nodes.filter((n) => n.kind === "region" && !regionsInView.includes(n.id));
  if (otherRegions.length || restTips) {
    nodes.push({
      id: "badge:rest",
      kind: "badge",
      label: `${otherRegions.length && otherRegions.length <= 2 ? otherRegions.map(regionName).join(", ") : "Other regions"} · ${plural(restTips, "tip")}`,
      badge: { text: "", tips: restTips, action: { type: "zoom-out" } },
    });
    edges.push({ from: "badge:rest", to: opts.focus, kind: "badge" });
  }
  for (const n of nodes) if (n.badge) n.badge.text = n.label;

  return { nodes, edges, tips: shown, focusId: opts.focus };
}

/** Zoomed out: regions only, each with a badge of its tip count. */
export function regionView(graph: Graph, assertions: Assertion[], opts: Pick<ViewOptions, "showHunches" | "at">): MapView {
  const g = withNetworkEdges(graph);
  const regions = g.nodes.filter((n) => n.kind === "region").sort((a, b) => a.id.localeCompare(b.id));
  // A tip counts once in every region it touches, so one bound to two regions shows in both.
  const counts = new Map<string, number>();
  for (const a of visibleTips(assertions, opts.showHunches, opts.at)) {
    const touched = new Set(attachments(a, graph).map((t) => regionOfEntity(g, t)).filter((r): r is string => !!r));
    for (const r of touched) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const nodes: ViewNode[] = regions.map((r: GraphNode) => ({
    id: r.id,
    kind: "region",
    label: regionName(r),
    badge: { text: plural(counts.get(r.id) ?? 0, "tip"), tips: counts.get(r.id) ?? 0, action: { type: "focus", id: r.id } },
  }));
  return { nodes, edges: [], tips: [], focusId: "" };
}
