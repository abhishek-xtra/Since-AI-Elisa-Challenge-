// The only logic the UI owns (FRONTEND_PROMPT 7.2): filling in network edges and labels the
// backend may not send yet (addendum B1, B2), reading predicates to decide what is in view,
// and plain-language wording. Scope, trust, precedence and supersession come from the data.
import type { Assertion, Graph, GraphEdge, GraphNode, Trust } from "./types";

export const NETWORK_EDGE_KINDS = ["IN_SITE", "IN_REGION", "OF_MODEL"] as const;

export const regionId = (region: string) => `region:${region}`;
export const modelId = (model: string) => `model:${model}`;

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v));

/** Adds region and model nodes and IN_SITE / IN_REGION / OF_MODEL edges from node attrs, if the graph has none. */
export function withNetworkEdges(graph: Graph): Graph {
  if (graph.edges.some((e) => (NETWORK_EDGE_KINDS as readonly string[]).includes(e.kind))) return graph;

  const nodes: GraphNode[] = [...graph.nodes];
  const edges: GraphEdge[] = [...graph.edges];
  const have = new Set(nodes.map((n) => n.id));
  const add = (n: GraphNode) => {
    if (!have.has(n.id)) {
      have.add(n.id);
      nodes.push(n);
    }
  };

  for (const n of graph.nodes) {
    if (n.kind === "site") {
      const region = str(n.attrs.region);
      if (region) {
        add({ id: regionId(region), label: cap(region), kind: "region", attrs: {} });
        edges.push({ from: n.id, to: regionId(region), kind: "IN_REGION" });
      }
    }
  }
  for (const n of graph.nodes) {
    if (n.kind !== "node") continue;
    const site = str(n.attrs.site);
    const model = str(n.attrs.model);
    if (site) {
      if (!have.has(site)) {
        const region = str(n.attrs.region);
        add({ id: site, label: site, kind: "site", attrs: region ? { region } : {} });
        if (region) {
          add({ id: regionId(region), label: cap(region), kind: "region", attrs: {} });
          edges.push({ from: site, to: regionId(region), kind: "IN_REGION" });
        }
      }
      edges.push({ from: n.id, to: site, kind: "IN_SITE" });
    }
    if (model) {
      add({ id: modelId(model), label: model, kind: "model", attrs: {} });
      edges.push({ from: n.id, to: modelId(model), kind: "OF_MODEL" });
    }
  }
  return { nodes, edges };
}

// ---------- labels (addendum B2 template table) ----------
export function labelFor(a: Assertion): string {
  if (a.label) return a.label;
  if (a.action === "interface.bounce" && a.avoid.includes("node.reboot")) return "Bounce, don't reboot";
  if (a.action === "site.access_key") return "Site access";
  return cap(a.action_text.split(/\s+/).slice(0, 4).join(" ").replace(/[,;:.]+$/, ""));
}

// ---------- plain language ----------
export function trustInWords(t: Trust): string {
  switch (t) {
    case "verified_by_outcome":
      return "Verified";
    case "stated":
      return "Stated, not yet verified";
    case "hunch":
      return "A hunch. Agents won't use it until it's confirmed.";
  }
}

const AVOID_WORDS: Record<string, string> = {
  "node.reboot": "reboot the unit",
  "sfp.replace": "replace the SFP",
  "interface.bounce": "bounce the interface",
  "counters.check": "skip the counters",
};

/** One sentence: what to do, and what to avoid. */
export function adviceSentence(a: Assertion): string {
  const doText = a.action === "site.access_key" ? `Key: ${a.action_text}` : cap(a.action_text);
  const avoid = a.avoid.map((x) => AVOID_WORDS[x] ?? x.replace(/[._]/g, " "));
  const tail = avoid.length ? ` Don't ${avoid.join(" or ")}.` : "";
  return `${doText.replace(/[.\s]+$/, "")}.${tail}`;
}

// Day and time as written in the data: the backend's "09:14+02:00" is 09:14 in Finland, not 07:14.
const wallClock = (iso: string) => new Date(/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(iso) ? `${iso.slice(0, 16)}Z` : iso);

export function formatDay(iso: string): string {
  const d = wallClock(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatTime(iso: string): string {
  const d = wallClock(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

const CHANNEL_WORDS: Record<string, string> = {
  teams: "Teams",
  email: "email",
  agent_thread: "agent thread",
  context_chat: "context chat",
};

export function channelInWords(a: Assertion): string {
  const ch = a.evidence.sources[0]?.split(":")[0] ?? "";
  return CHANNEL_WORDS[ch] ?? ch;
}

export function caseCountInWords(a: Assertion): string {
  const n = a.evidence.cases.length;
  if (n === 0) return "not used on a case yet";
  return n === 1 ? "1 case" : `${n} cases`;
}

// ---------- live / hunch filters ----------
export function isLive(a: Assertion, at: Date = new Date()): boolean {
  if (a.superseded_by) return false;
  if (a.valid_to && new Date(a.valid_to) <= at) return false;
  return true;
}

export const isHunch = (a: Assertion) => a.trust === "hunch";

// ---------- predicates (contracts/predicates.md grammar), only to choose what is in view ----------
const PRED = /^\s*([a-z_.]+)\s*(==|!=|<=|>=|<|>)\s*(?:'([^']*)'|"([^"]*)"|(-?\d+))\s*$/;

export interface ParsedPredicate {
  attr: string;
  op: "==" | "!=" | "<" | "<=" | ">" | ">=";
  value: string | number;
}

export function parsePredicate(p: string): ParsedPredicate | null {
  const m = PRED.exec(p);
  if (!m) return null;
  const value = m[5] !== undefined ? Number(m[5]) : (m[3] ?? m[4]);
  return { attr: m[1], op: m[2] as ParsedPredicate["op"], value };
}

const versionTuple = (v: string) => v.split(".").map((x) => Number(x) || 0);
function cmp(a: string | number, b: string | number, attr: string): number {
  if (attr === "firmware") {
    const x = versionTuple(String(a));
    const y = versionTuple(String(b));
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0);
      if (d) return d;
    }
    return 0;
  }
  if (typeof a === "number" || typeof b === "number") return Number(a) - Number(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Evaluates a predicate against a graph node. Returns null when the attribute does not exist. */
export function evaluate(p: string, node: GraphNode): boolean | null {
  const parsed = parsePredicate(p);
  if (!parsed) return null;
  const raw = parsed.attr === "id" ? node.id : node.attrs[parsed.attr];
  if (raw === undefined || raw === null) return null;
  const c = cmp(raw as string | number, parsed.value, parsed.attr);
  switch (parsed.op) {
    case "==":
      return c === 0;
    case "!=":
      return c !== 0;
    case "<":
      return c < 0;
    case "<=":
      return c <= 0;
    case ">":
      return c > 0;
    case ">=":
      return c >= 0;
  }
}

/** The predicates that currently define the scope: the decided one, or every candidate not yet voted against. */
export function scopePredicates(a: Assertion): string[] {
  if (a.applies_to.decided) return [a.applies_to.decided];
  return a.applies_to.candidates.filter((c) => c.against === 0).map((c) => c.predicate);
}

export function scopeHolds(a: Assertion, node: GraphNode): boolean {
  if (node.kind !== "node") return false;
  const preds = scopePredicates(a);
  return preds.length > 0 && preds.every((p) => evaluate(p, node) === true);
}

/** Network nodes a tip is directly bound to through its scope (a site, region or model named by an `==` predicate). */
export function boundTargets(a: Assertion): string[] {
  const out: string[] = [];
  for (const p of scopePredicates(a)) {
    const parsed = parsePredicate(p);
    if (!parsed || parsed.op !== "==") continue;
    const v = String(parsed.value);
    if (parsed.attr === "id" || parsed.attr === "site") out.push(v);
    else if (parsed.attr === "region") out.push(regionId(v));
    else if (parsed.attr === "model") out.push(modelId(v));
  }
  return out;
}

/** Entities a tip touches: its CASE edges (or evidence cases) plus its bound targets. */
export function attachments(a: Assertion, graph: Graph): string[] {
  const set = new Set<string>();
  for (const e of graph.edges) if (e.kind === "CASE" && e.from === a.id) set.add(e.to);
  for (const c of a.evidence.cases) set.add(c.entity);
  for (const t of boundTargets(a)) set.add(t);
  return [...set];
}

/** Assertion ids listed in a graph. */
export const assertionIds = (graph: Graph) => graph.nodes.filter((n) => n.kind === "assertion").map((n) => n.id);

export function normalise(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}
