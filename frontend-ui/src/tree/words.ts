// Plain-language templates for /tree. Every label is built from backend fields by these tables; nothing per node.
import type { Candidate, IncidentEv, Result, Tip, TimelineEvent } from "../grow/timeline";

export interface Branch { id: string; parent: string; name: string; caption: string }

// The fixed filing system, drawn from the first frame. One sub-branch per event in contracts/vocabulary.md for faults.
export const ROOT = "What the team knows";
export const TOP: Branch[] = [
  { id: "faults", parent: "root", name: "Faults", caption: "when something breaks" },
  { id: "access", parent: "root", name: "Site access", caption: "getting on site" },
  { id: "other", parent: "root", name: "Other", caption: "fits nowhere yet" },
];
export const SUB: Branch[] = [
  { id: "sfp_replaced", parent: "faults", name: "Optical module swaps", caption: "fixes that worked" },
  { id: "alarm_raised", parent: "faults", name: "Alarms", caption: "what an alarm means" },
  { id: "fault_other", parent: "faults", name: "Other faults", caption: "any other fault" },
  { id: "keys", parent: "access", name: "Keys and codes", caption: "where the key is" },
  { id: "route", parent: "access", name: "Getting there", caption: "how to reach the site" },
  { id: "unsorted", parent: "other", name: "Unsorted", caption: "no branch fits" },
];

/** The one sub-branch a tip is filed under, from its trigger and action. */
export function branchOf(t: Pick<Tip, "trigger" | "action">): string {
  if (t.trigger.kind === "incident") return SUB.some((b) => b.id === t.trigger.event && b.parent === "faults") ? t.trigger.event : "fault_other";
  if (t.trigger.event === "dispatch_created") return t.action === "site.access_key" ? "keys" : "route";
  return "unsorted";
}

const CITY: Record<string, string> = { OULU: "Oulu", HEL: "Helsinki" };
/** "OULU-07" -> "Oulu 07"; unknown prefixes keep the id. */
export function place(site: string): string {
  const [p, n] = site.split("-");
  return CITY[p] ? `${CITY[p]} ${n}` : site;
}
export const city = (site: string) => CITY[site.split("-")[0]] ?? site;

const first = (name: string) => name.split(/\s+/)[0];
const clause = (s: string) => s.split(/[,.;]/)[0].trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const day = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/** A scope predicate in words. */
export function leafWords(c: Pick<Candidate, "predicate" | "edge">): string {
  const m = c.predicate.match(/^(\w+)\s*(<=|>=|==|<|>)\s*'?([^']*)'?$/);
  if (!m) return c.predicate;
  const [, attr, op, v] = m;
  if (attr === "install_year") {
    if (op === "<=" || op === "<") return c.edge === "open" ? "older units" : `built ${v} or earlier`;
    if (op === ">=" || op === ">") return `built ${v} or later`;
    return `built in ${v}`;
  }
  if (attr === "model") return v;
  if (attr === "firmware") return `firmware ${v}`;
  if (attr === "site") return place(v);
  if (attr === "region") return `the ${v}`;
  if (attr === "id") return `only ${v}`;
  return c.predicate;
}

const ACTION: Record<string, string> = {
  "interface.bounce": "Bounce the port", "node.reboot": "Reboot the unit", "sfp.replace": "Swap the SFP again",
  "counters.check": "Check the counters",
};
const AVOID: Record<string, string> = { "node.reboot": "don't reboot", "sfp.replace": "don't swap the SFP" };

/** "Bounce the port, don't reboot · Erkki". Value-carrying and 'other' actions use the first clause of action_text. */
export function tipWords(t: Pick<Tip, "action" | "action_text" | "avoid" | "said_by">): string {
  const what = ACTION[t.action] ?? (t.action === "site.access_key" ? `Key ${clause(t.action_text)}` : cap(clause(t.action_text)));
  const avoid = t.avoid.includes("node.reboot") ? "node.reboot" : t.avoid.length === 1 ? t.avoid[0] : undefined;
  return `${what}${avoid && AVOID[avoid] ? `, ${AVOID[avoid]}` : ""} · ${first(t.said_by)}`;
}

const CHANNEL: Record<string, string> = { teams: "Teams", email: "Email", agent_thread: "Agent" };
/** The source tag cited on a proposed tip: "Erkki · Teams, 1 Nov". */
export function sourceTag(t: Pick<Tip, "said_by" | "sources" | "valid_from">): string {
  const ch = t.sources[0]?.split(":")[0] ?? "";
  return `${first(t.said_by)} · ${CHANNEL[ch] ?? ch}, ${day(t.valid_from)}`;
}

/** One short reason line for a decline, in words. */
export function reasonWords(r: Result, tip: Pick<Tip, "said_by" | "valid_to">, inc: Pick<IncidentEv, "entity_site">): string {
  if (r.reason.startsWith("expired")) return `expired ${tip.valid_to ? day(tip.valid_to) : r.reason.slice(8)}`;
  if (r.reason.startsWith("superseded")) return "replaced by a newer fact";
  if (r.reason === "under review") return `${first(tip.said_by)} took it back`;
  if (r.reason.startsWith("hunch")) return "only a hunch";
  const year = r.reason.match(/install_year (\d+) fails install_year <=? ?(\d+)/);
  if (year) return `built in ${year[1]}, newer than anything ${first(tip.said_by)} has seen`;
  if (/site \S+ fails/.test(r.reason)) return `${place(inc.entity_site)} is a different site`;
  if (/model \S+ fails/.test(r.reason)) return "a different model";
  return "doesn't fit";
}

/** The result the view follows for an incident: a question first, then a proposal, then the most telling decline. */
export function primary(inc: IncidentEv, visible: Set<string>): Result | undefined {
  const rs = inc.results.filter((r) => visible.has(r.assertion_id));
  const rank = (r: Result) =>
    r.question ? 0 : r.outcome === "proposed" ? 1 : r.reason.startsWith("expired") ? 2 : r.reason === "under review" ? 3 : /install_year/.test(r.reason) ? 4 : 5;
  return [...rs].sort((a, b) => rank(a) - rank(b))[0];
}

/** The caption under the tree, at most about eight words. */
export function caption(e: TimelineEvent | undefined, events: TimelineEvent[], tips: Map<string, Tip>, visible: Set<string>): string {
  if (!e) return "";
  switch (e.kind) {
    case "message": return e.channel === "email" ? "Reading an email" : "Reading the team chat";
    case "no_capture": return "Just chat: nothing saved";
    case "capture":
      if (e.how === "new") return e.candidates.length > 1 ? "Filed under every scope it might be" : `${first(e.said_by)}'s tip, filed`;
      return e.how === "new_source" ? "Same fix, said twice: one tip" : "Seen again: one more case";
    case "answer": return `${first(e.to)} tapped: ${e.option_label}`;
    case "notification": return `${first(e.to)} hears the tip was used`;
    case "supersede": return "Key moved: old fact replaced";
    case "expire": return "Expired on its own";
    case "retract": return "Taken back";
    case "dispute": return "Two experts disagree";
    case "incident": {
      const r = primary(e, visible);
      if (!r) return "Nothing saved fits this";
      const tip = tips.get(r.assertion_id);
      const who = first(r.said_by);
      if (r.question) {
        const asked = events.slice(0, e.index).some((x) => x.kind === "answer" && x.assertion_id === r.assertion_id);
        return asked ? `One more question to ${who}` : `Asked ${who} once`;
      }
      if (r.outcome === "proposed") {
        if (tip?.trigger.kind === "workflow") return tip.action === "site.access_key" ? "Where the key is, before the drive" : "Heads-up before the drive";
        const home = tip?.candidates.find((c) => c.predicate.startsWith("site =="))?.predicate.match(/'([^']+)'/)?.[1];
        if (home && city(home) !== city(e.entity_site)) return `Reused in ${city(e.entity_site)}, nobody asked`;
        return `Found it: ${who}'s tip, ${day(tip!.valid_from)}`;
      }
      if (r.reason.startsWith("expired")) return "Expired on its own";
      if (r.reason === "under review") return "Taken back: not used";
      if (/install_year/.test(r.reason)) return "Doesn't apply here: too new";
      if (r.reason.startsWith("superseded")) return "Old fact, replaced";
      return "Doesn't apply here";
    }
  }
}
