import type { VideoTimeline } from "../grow/timeline";
// Mirrors the backend contracts (docs/process/BACKEND_PROMPT.md sections 4, 5 and 8, plus addendum A1).
// The backend's contracts/ folder is the source of truth: when it exists, re-check these
// types against it and change the types and the adapters here, never the backend.

// ---- contracts/vocabulary.md ----
export type EventName = "sfp_replaced" | "dispatch_created" | "alarm_raised" | (string & {});
export type Symptom =
  | "link_up"
  | "link_down"
  | "optics_normal"
  | "optics_low"
  | "counters_zero"
  | "counters_rising"
  | "alarms_cleared"
  | (string & {});
export type Action =
  | "interface.bounce"
  | "node.reboot"
  | "sfp.replace"
  | "counters.check"
  | "site.access_key"
  | "other"
  | (string & {});
export type Trust = "hunch" | "stated" | "verified_by_outcome";
export type AssertionStatus = "open" | "decided" | "disputed" | "review";
export type Outcome = "proposed" | "declined" | "ambiguous";

// ---- 4.1 message ----
export type Role = "field_engineer" | "expert" | "agent" | "other";
export type Channel = "teams" | "email" | "agent_thread" | "context_chat";

export interface Incident {
  entity_id: string;
  event: EventName;
  symptoms: Symptom[];
}

export interface Message {
  id: string;
  author: string;
  role: Role;
  timestamp: string;
  channel: Channel;
  thread_id: string;
  text: string;
  incident?: Incident;
}

// ---- 4.2 topology ----
export interface Node {
  id: string;
  type: string;
  model: string;
  install_year: number;
  firmware: string;
  site: string;
}

export interface Site {
  id: string;
  name: string;
  region: string;
  access: string;
}

// ---- 4.4 assertion ----
export interface Trigger {
  kind: "incident" | "workflow";
  event: EventName;
  symptoms?: Symptom[];
}

export interface Candidate {
  predicate: string;
  support: number;
  against: number;
  basis: string;
}

export interface Case {
  entity: string;
  at: string;
  outcome: "recovered" | "failed" | (string & {});
}

export interface Assertion {
  id: string;
  trigger: Trigger;
  applies_to: {
    entity_type: string;
    candidates: Candidate[];
    decided: string | null;
  };
  action: Action;
  action_text: string;
  avoid: Action[];
  evidence: {
    cases: Case[];
    sources: string[];
    excerpt: string;
    said_by_role: Role;
    said_by: string;
  };
  trust: Trust;
  status: AssertionStatus;
  question_asked: boolean;
  recorded_at: string;
  valid_from: string;
  valid_to: string | null;
  valid_while: string | null;
  // addendum A1
  supersedes?: string | null;
  superseded_by?: string | null;
  // addendum B2 (optional; derived in derive.ts when missing)
  label?: string;
}

// ---- 4.6 / 5.4 get_context ----
export interface QuestionOption {
  label: string;
  sets_decided: string | null;
}

export interface Question {
  assertion_id: string;
  to: string;
  thread_id: string;
  text: string;
  options: QuestionOption[];
  /** Real backend: identifies a question across beat and thread files. */
  key?: string;
  entity_id?: string;
}

export interface ContextResult {
  // The contract says `assertion`; the backend may send the id or the full object.
  assertion: string | Assertion;
  outcome: Outcome;
  reason: string;
  question?: Question;
}

// ---- 5.7 notification ----
export interface Notification {
  to: string;
  text: string;
  // Optional extras the frontend uses when present.
  assertion_id?: string;
  entity_id?: string;
  at?: string;
}

// ---- section 8: out/graph.json ----
export type GraphNodeKind = "assertion" | "node" | "site" | "source" | "region" | "model" | (string & {});

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  attrs: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: string;
  support?: number;
  against?: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---- section 8: out/thread_<id>.json ----
// "The messages of a thread plus any question and notification targeting it, in display order."
// Real backend: replay (adapt.ts threadAtBeat) marks questions and notifications with the beat they belong to.
export type ThreadItem = (
  | ({ type: "message" } & Message)
  | ({ type: "question" } & Question & {
      at?: string;
      answer?: { option_index: number; label: string; at?: string } | null;
    })
  | ({ type: "notification" } & Notification & { result?: ContextResult })
) & { beat?: number };

export interface Thread {
  thread_id: string;
  participants?: string[];
  items: ThreadItem[];
  /** Real backend: the message whose text holds each tip's excerpt. */
  captured?: { message_id: string; assertion_id: string }[];
  /** Real backend: the file is the final state after all beats, so replay filters it (adapt.ts threadAtBeat). */
  cumulative?: boolean;
}

// ---- section 8: out/beat_N.json ("everything printed in that beat, as data") ----
export interface Beat {
  beat: number;
  title: string;
  at_time: string;
  incident?: Incident & { at_time?: string };
  results?: ContextResult[];
  agent_text?: string;
  assertions: Assertion[];
  thread_id?: string;
  thread?: Thread;
  notifications?: Notification[];
  /** Real backend: the question this beat asked, and the tap that answered it. */
  question?: Question;
  answer?: { option_index: number };
}

// ---- POST /chat (addendum B4) ----
export interface ChatReply {
  kind: "ask" | "add";
  reply: string;
  assertion_ids: string[];
}

export interface IncidentArgs {
  entity_id: string;
  event: string;
  symptoms: string[];
  at_time: string;
}

export interface DataSource {
  getGraph(): Promise<Graph>;
  getThread(id: string): Promise<Thread>;
  getAssertion(id: string): Promise<Assertion>;
  reportIncident(args: IncidentArgs): Promise<{ results: ContextResult[]; agent_text: string }>;
  answer(assertion_id: string, option_index: number): Promise<void>;
  getContextFor?(entity_id: string): Promise<Assertion[]>; // backend extra B3; optional
  chat?(text: string): Promise<ChatReply>; // B4; optional
  getBeat?(n: number): Promise<Beat>; // out/beat_N.json, for beat replay
  getVideoTimeline?(name?: string): Promise<VideoTimeline>; // out/video_timeline[_<name>].json, for /grow and /tree
}
