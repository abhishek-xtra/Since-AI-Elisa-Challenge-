// Mirrors the backend JSON (docs/TEAMS_CLONE_HANDOFF.md section 2) field for field.

export type Role = 'field_engineer' | 'expert' | 'other';

export interface Message {
  id: string;
  author: string;
  role: Role | string;
  timestamp: string;
  channel: string;
  thread_id: string;
  text: string;
  incident: unknown | null;
}

export interface QuestionOption {
  label: string;
  sets_decided: string | null;
  edge: string | null;
  edge_answer: 'raise' | 'close' | null;
}

export interface Question {
  assertion_id: string;
  key: string;
  to: string;
  thread_id: string;
  text: string;
  options: QuestionOption[];
  entity_id?: string;
  answered?: boolean;
}

export interface Notification {
  to: string;
  text: string;
  assertion_id: string;
  entity_id: string;
  at: string;
}

export interface Thread {
  thread_id: string;
  channel: string;
  messages: Message[];
  questions: Question[];
  notifications: Notification[];
  captured: { message_id: string; assertion_id: string }[];
}

export interface Assertion {
  id: string;
  action: string;
  action_text: string;
  avoid: string[];
  evidence: { said_by: string; said_by_role: string; sources: string[]; excerpt: string; cases: unknown[] };
  trust: string;
  status: string;
  supersedes: string | null;
  superseded_by: string | null;
  valid_from: string | null;
  valid_to: string | null;
  [k: string]: unknown;
}

export interface ContextResult {
  assertion: Assertion;
  outcome: 'proposed' | 'declined' | 'ambiguous';
  reason: string;
  question: Question | null;
}

export interface BeatData {
  results?: ContextResult[];
  results_before?: ContextResult[];
  agent_text?: string;
  question?: Question;
  answer?: { option_index: number };
  assertion?: Assertion;
  assertions?: Assertion[];
  notifications?: Notification[];
  incident?: { entity_id: string; event: string; symptoms: string[]; at: string };
  counters?: Record<string, number>;
  [k: string]: unknown;
}

export interface Beat {
  beat: number;
  title: string;
  lines: string[];
  data: BeatData;
}

export interface Topology {
  sites: { id: string; name: string; region: string; access: string }[];
  nodes: { id: string; type: string; model: string; install_year: number; firmware: string; site: string }[];
}

/** A hand-written technician report (mock folder, both modes), already in Thread shape. */
export interface ReportThread extends Thread {
  entity_id: string;
}

export interface IncidentBody {
  entity_id: string;
  event: string;
  symptoms: string[];
  at_time: string;
}

export interface DataSource {
  getThread(id: string): Promise<Thread>;
  getBeat(n: number): Promise<Beat>;
  getAssertions(): Promise<Assertion[]>;
  getTopology(): Promise<Topology>;
  listFillerThreads(): Promise<Thread[]>;
  /** Not in the handoff interface: the synthetic TRN-087 / TRN-101 reports, read from the mock folder in both modes. */
  listReportThreads(): Promise<ReportThread[]>;
  reportIncident(body: IncidentBody): Promise<{ results: ContextResult[]; agent_text: string }>;
  answer(assertion_id: string, option_index: number): Promise<void>;
}
