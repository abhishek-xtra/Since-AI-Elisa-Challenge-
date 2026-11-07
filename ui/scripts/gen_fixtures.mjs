// Generates the hand-written mock fixtures for ui/src/data/mock. Run once; the JSON is committed.
import fs from "node:fs";
import path from "node:path";

const [chatPath, outDir] = process.argv.slice(2);
const chat = JSON.parse(fs.readFileSync(chatPath, "utf8"));
const w = (rel, obj) => {
  const p = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
};
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- topology (BACKEND_PROMPT 4.2 seed, synthetic) ----------
const sites = [
  { id: "OULU-07", name: "Oulu, Kaukovainio hut", region: "north", access: "" },
  { id: "OULU-11", name: "Oulu, Ritaharju mast", region: "north", access: "" },
  { id: "OULU-03", name: "Ii, forest mast", region: "north", access: "Private road with a locked barrier" },
  { id: "HKI-02", name: "Helsinki, Pasila exchange", region: "south", access: "" },
  { id: "HKI-05", name: "Espoo, Leppävaara rooftop", region: "south", access: "" },
];
const N = (id, model, install_year, firmware, site, type = "transmission_node") => ({ id, type, model, install_year, firmware, site });
const nodes = [
  N("TRN-042", "TX-200", 2019, "4.1", "OULU-07"),
  N("TRN-043", "TX-300", 2022, "5.2", "OULU-07"),
  N("RTR-007", "RX-10", 2021, "2.3", "OULU-07", "router"),
  N("TRN-087", "TX-200", 2018, "4.1", "OULU-11"),
  N("TRN-088", "TX-250", 2018, "4.6", "OULU-11"),
  N("TRN-089", "TX-300", 2023, "5.2", "OULU-11"),
  N("TRN-031", "TX-200", 2016, "3.9", "OULU-03"),
  N("TRN-032", "TX-300", 2021, "5.1", "OULU-03"),
  N("TRN-101", "TX-300", 2023, "5.2", "HKI-02"),
  N("TRN-102", "TX-250", 2020, "4.6", "HKI-02"),
  N("RTR-021", "RX-10", 2019, "2.1", "HKI-02", "router"),
  N("TRN-150", "TX-300", 2024, "5.2", "HKI-05"),
  N("TRN-151", "TX-250", 2019, "4.6", "HKI-05"),
  N("TRN-152", "TX-200", 2020, "4.2", "HKI-05"),
];
const regionOf = (siteId) => sites.find((s) => s.id === siteId).region;

// ---------- assertions ----------
const SFP = { kind: "incident", event: "sfp_replaced", symptoms: ["link_up", "optics_normal", "counters_zero"] };
const DISPATCH = { kind: "workflow", event: "dispatch_created", symptoms: [] };
const base = (o) => ({
  question_asked: false,
  valid_while: null,
  valid_to: null,
  supersedes: null,
  superseded_by: null,
  avoid: [],
  ...o,
});

const ca1Excerpt = "Disable the interface, wait a little, then enable it again. Don't reboot the whole unit unless that fails.";
const CA1_captured = base({
  id: "CA-0001",
  trigger: SFP,
  applies_to: {
    entity_type: "transmission_node",
    candidates: [
      { predicate: "install_year <= 2019", support: 1, against: 0, basis: "expert: 'older units, around 2019'" },
      { predicate: "model == 'TX-200'", support: 1, against: 0, basis: "attribute of TRN-042" },
      { predicate: "firmware == '4.1'", support: 1, against: 0, basis: "attribute of TRN-042" },
      { predicate: "site == 'OULU-07'", support: 1, against: 0, basis: "attribute of TRN-042" },
      { predicate: "region == 'north'", support: 1, against: 0, basis: "attribute of TRN-042's site" },
    ],
    decided: null,
  },
  action: "interface.bounce",
  action_text: "disable the interface, wait a little, then enable it again",
  avoid: ["node.reboot", "sfp.replace"],
  evidence: {
    cases: [{ entity: "TRN-042", at: "2026-11-01T09:25:00Z", outcome: "recovered" }],
    sources: ["teams:thread-001", "email:001"],
    excerpt: ca1Excerpt,
    said_by_role: "expert",
    said_by: "Erkki",
  },
  trust: "verified_by_outcome",
  status: "open",
  recorded_at: "2026-11-01T09:30:00Z",
  valid_from: "2026-11-01T00:00:00Z",
});
const CA1_asked = clone(CA1_captured);
CA1_asked.question_asked = true;
const CA1 = clone(CA1_asked);
CA1.applies_to.decided = "install_year <= 2019";
CA1.status = "decided";
CA1.evidence.cases.push({ entity: "TRN-087", at: "2026-11-07T10:40:00Z", outcome: "recovered" });
for (const c of CA1.applies_to.candidates) {
  if (c.predicate === "site == 'OULU-07'") c.against = 1;
  else c.support = 2;
}

const CA2_live = base({
  id: "CA-0002",
  trigger: DISPATCH,
  applies_to: {
    entity_type: "site",
    candidates: [{ predicate: "id == 'OULU-03'", support: 0, against: 0, basis: "site named in the email" }],
    decided: "id == 'OULU-03'",
  },
  action: "site.access_key",
  action_text: "[KEY LOCATION FROM THE EMAIL]",
  evidence: {
    cases: [],
    sources: ["email:002"],
    excerpt: "The barrier on the private road to the Ii mast is locked. [KEY LOCATION FROM THE EMAIL]",
    said_by_role: "field_engineer",
    said_by: "Marja",
  },
  trust: "stated",
  status: "decided",
  recorded_at: "2026-10-02T14:05:00Z",
  valid_from: "2026-10-02T14:00:00Z",
});
const CA2 = clone(CA2_live);
CA2.valid_to = "2026-11-07T08:40:00Z";
CA2.superseded_by = "CA-0003";

const CA3 = base({
  id: "CA-0003",
  trigger: DISPATCH,
  applies_to: {
    entity_type: "site",
    candidates: [{ predicate: "id == 'OULU-03'", support: 0, against: 0, basis: "site named in the message" }],
    decided: null,
  },
  action: "site.access_key",
  action_text: "in the site cabinet",
  evidence: {
    cases: [],
    sources: ["teams:thread-002"],
    excerpt: "The key moved, it's in the site cabinet now.",
    said_by_role: "field_engineer",
    said_by: "Veikko",
  },
  trust: "stated",
  status: "open",
  recorded_at: "2026-11-07T08:41:00Z",
  valid_from: "2026-11-07T08:40:00Z",
  supersedes: "CA-0002",
});

const CA4 = base({
  id: "CA-0004",
  trigger: DISPATCH,
  applies_to: {
    entity_type: "site",
    candidates: [{ predicate: "region == 'north'", support: 0, against: 0, basis: "expert: 'up north'" }],
    decided: null,
  },
  action: "other",
  action_text: "bring a portable generator in winter, power cuts are common up north",
  evidence: {
    cases: [],
    sources: ["email:003"],
    excerpt: "In winter, bring a portable generator. Power cuts are common up north.",
    said_by_role: "expert",
    said_by: "Liisa",
  },
  trust: "stated",
  status: "open",
  recorded_at: "2026-10-20T07:12:00Z",
  valid_from: "2026-10-20T07:00:00Z",
});

const CA5 = base({
  id: "CA-0005",
  trigger: SFP,
  applies_to: {
    entity_type: "transmission_node",
    candidates: [{ predicate: "model == 'TX-200'", support: 0, against: 0, basis: "speaker: 'on the TX-200s'" }],
    decided: null,
  },
  action: "other",
  action_text: "upgrade firmware to 5.0",
  evidence: {
    cases: [],
    sources: ["teams:thread-003"],
    excerpt: "Maybe firmware 5.0 fixes it on the TX-200s?",
    said_by_role: "field_engineer",
    said_by: "Jussi",
  },
  trust: "hunch",
  status: "open",
  recorded_at: "2026-11-03T12:02:00Z",
  valid_from: "2026-11-03T12:00:00Z",
});

// Two southern tips so the "rest of the network" badge has something to count.
const CA6 = base({
  id: "CA-0006",
  trigger: DISPATCH,
  applies_to: {
    entity_type: "site",
    candidates: [{ predicate: "id == 'HKI-02'", support: 0, against: 0, basis: "site named in the email" }],
    decided: "id == 'HKI-02'",
  },
  action: "other",
  action_text: "check the tram works calendar before opening the shared duct",
  evidence: {
    cases: [],
    sources: ["email:004"],
    excerpt: "Check the tram works calendar before you open the shared duct at Pasila.",
    said_by_role: "expert",
    said_by: "Aino",
  },
  trust: "stated",
  status: "decided",
  recorded_at: "2026-09-14T10:00:00Z",
  valid_from: "2026-09-14T10:00:00Z",
});
const CA7 = base({
  id: "CA-0007",
  trigger: DISPATCH,
  applies_to: {
    entity_type: "site",
    candidates: [{ predicate: "id == 'HKI-05'", support: 0, against: 0, basis: "site named in the message" }],
    decided: "id == 'HKI-05'",
  },
  action: "site.access_key",
  action_text: "call the building manager, the roof door is locked",
  evidence: {
    cases: [{ entity: "HKI-05", at: "2026-10-11T09:00:00Z", outcome: "recovered" }],
    sources: ["teams:thread-004"],
    excerpt: "Call the building manager first, the roof door is locked.",
    said_by_role: "field_engineer",
    said_by: "Aino",
  },
  trust: "verified_by_outcome",
  status: "decided",
  recorded_at: "2026-10-11T09:05:00Z",
  valid_from: "2026-10-11T09:00:00Z",
});

const assertions = [CA1, CA2, CA3, CA4, CA5, CA6, CA7];
w("assertions.json", assertions);

// ---------- graph (section 8 shape, without the B1 network edges, so derive.ts is exercised) ----------
const graph = { nodes: [], edges: [] };
for (const s of sites) graph.nodes.push({ id: s.id, label: s.id, kind: "site", attrs: { name: s.name, region: s.region, access: s.access } });
for (const n of nodes)
  graph.nodes.push({ id: n.id, label: n.id, kind: "node", attrs: { type: n.type, model: n.model, install_year: n.install_year, firmware: n.firmware, site: n.site, region: regionOf(n.site) } });
const sources = new Set();
for (const a of assertions) {
  graph.nodes.push({
    id: a.id,
    label: a.id,
    kind: "assertion",
    attrs: { trust: a.trust, status: a.status, action: a.action, valid_to: a.valid_to, superseded_by: a.superseded_by ?? null },
  });
  for (const c of a.evidence.cases) graph.edges.push({ from: a.id, to: c.entity, kind: "CASE" });
  for (const s of a.evidence.sources) {
    sources.add(s);
    graph.edges.push({ from: a.id, to: s, kind: "FROM_SOURCE" });
  }
}
for (const s of sources) graph.nodes.push({ id: s, label: s, kind: "source", attrs: { channel: s.split(":")[0] } });
w("graph.json", graph);

// ---------- threads ----------
const roleMap = { "Field Engineer": "field_engineer", "Network Expert": "expert" };
const t1Messages = chat.messages.map((m) => ({
  type: "message",
  id: `thread-001-m${String(m.seq).padStart(2, "0")}`,
  author: m.author,
  role: roleMap[m.role] ?? "other",
  timestamp: `2026-11-01T${m.time}:00Z`,
  channel: "teams",
  thread_id: "thread-001",
  text: m.text,
}));
const question = {
  assertion_id: "CA-0001",
  to: "Erkki",
  thread_id: "thread-001",
  text: "Your TRN-042 tip: does it apply to TRN-087 too? Same model, installed 2018, different site.",
  options: [
    { label: "All older units", sets_decided: "install_year <= 2019" },
    { label: "Only OULU-07", sets_decided: "site == 'OULU-07'" },
    { label: "No", sets_decided: "id == 'TRN-042'" },
  ],
};
const questionItem = { type: "question", ...question, at: "2026-11-07T10:31:00Z", answer: null };
const notification = {
  to: "Erkki",
  text: "Your tip from 1 Nov was used on TRN-087 today.",
  assertion_id: "CA-0001",
  entity_id: "TRN-087",
  at: "2026-11-07T10:40:00Z",
};
const notificationItem = {
  type: "notification",
  ...notification,
  result: { assertion: "CA-0001", outcome: "proposed", reason: "decided: install_year <= 2019 holds for TRN-087" },
};
const thread1 = { thread_id: "thread-001", participants: ["Veikko Vikkelä", "Erkki Expert"], items: [...t1Messages, questionItem] };
w("threads/thread-001.json", thread1);
// Held back by mockSource until the question is answered, like the backend would write it.
w("notifications.json", [{ thread_id: "thread-001", item: notificationItem }]);

const t2 = (id, author, role, time, text) => ({ type: "message", id, author, role, timestamp: `2026-11-07T${time}:00Z`, channel: "teams", thread_id: "thread-002", text });
const thread2 = {
  thread_id: "thread-002",
  participants: ["Aino Aaltonen", "Veikko Vikkelä"],
  items: [
    t2("thread-002-m01", "Aino Aaltonen", "expert", "08:31", "Has anyone been out to OULU-03 lately? There's a dispatch going there tomorrow."),
    t2("thread-002-m02", "Veikko Vikkelä", "field_engineer", "08:40", "Yes, this morning. The key moved, it's in the site cabinet now. The old spot is empty."),
    t2("thread-002-m03", "Aino Aaltonen", "expert", "08:41", "Good to know, thanks 👍"),
  ],
};
w("threads/thread-002.json", thread2);

// ---------- beats (out/beat_N.json stand-ins) ----------
const msgsOnly = { ...thread1, items: t1Messages };
const sfpIncident = (entity_id, at_time) => ({ entity_id, event: "sfp_replaced", symptoms: ["link_up", "optics_normal", "counters_zero"], at_time });
const beats = [
  {
    beat: 1,
    title: "The failure without context",
    at_time: "2026-11-07T10:30:00Z",
    incident: sfpIncident("TRN-087", "2026-11-07T10:30:00Z"),
    results: [],
    agent_text: "No context found for TRN-087. Proposed: replace the SFP again. If traffic does not return, reboot the unit.",
    assertions: [],
    thread_id: "thread-001",
    thread: msgsOnly,
  },
  {
    beat: 2,
    title: "Capture and link",
    at_time: "2026-11-07T10:00:00Z",
    results: [],
    agent_text: "12 messages and 1 email read. 1 tip saved: one case, two sources. Nobody was asked anything.",
    assertions: [CA1_captured],
    thread_id: "thread-001",
    thread: msgsOnly,
  },
  {
    beat: 3,
    title: "First use and the one question",
    at_time: "2026-11-07T10:40:00Z",
    incident: sfpIncident("TRN-087", "2026-11-07T10:30:00Z"),
    results: [{ assertion: "CA-0001", outcome: "proposed", reason: "decided by Erkki: install_year <= 2019" }],
    agent_text:
      "Check the traffic counters. If they stay at zero with the link up, disable the interface, wait a little, then enable it again. Don't reboot the unit or replace the SFP. From Erkki, Teams, 1 case.",
    assertions: [CA1],
    thread_id: "thread-001",
    thread: { ...thread1, items: [...t1Messages, questionItem] },
    notifications: [notification],
  },
  {
    beat: 4,
    title: "Decline",
    at_time: "2026-11-07T11:00:00Z",
    incident: sfpIncident("TRN-101", "2026-11-07T11:00:00Z"),
    results: [{ assertion: "CA-0001", outcome: "declined", reason: "install_year <= 2019 does not hold for TRN-101 (2023)" }],
    agent_text: "Erkki's tip does not apply to TRN-101: it covers units installed in 2019 or earlier, and this one is from 2023.",
    assertions: [CA1],
  },
  {
    beat: 5,
    title: "Barrier",
    at_time: "2026-11-06T13:00:00Z",
    incident: { entity_id: "OULU-03", event: "dispatch_created", symptoms: [], at_time: "2026-11-06T13:00:00Z" },
    results: [
      { assertion: "CA-0002", outcome: "proposed", reason: "bound to OULU-03" },
      { assertion: "CA-0004", outcome: "proposed", reason: "region == 'north' holds for OULU-03" },
    ],
    agent_text: "Before you drive: locked barrier on the private road to OULU-03. Key: [KEY LOCATION FROM THE EMAIL]. From an email, 2 Oct.",
    assertions: [CA1, CA2_live, CA4],
    notifications: [notification],
  },
  {
    beat: 6,
    title: "Update",
    at_time: "2026-11-08T09:00:00Z",
    incident: { entity_id: "OULU-03", event: "dispatch_created", symptoms: [], at_time: "2026-11-08T09:00:00Z" },
    results: [
      { assertion: "CA-0003", outcome: "proposed", reason: "bound to OULU-03" },
      { assertion: "CA-0002", outcome: "declined", reason: "superseded by CA-0003 on 2026-11-07" },
      { assertion: "CA-0004", outcome: "proposed", reason: "region == 'north' holds for OULU-03" },
    ],
    agent_text: "Before you drive: locked barrier on the private road to OULU-03. Key: in the site cabinet. Updated 7 Nov by Veikko, replacing an email from 2 Oct.",
    assertions: [CA1, CA2, CA3, CA4],
    thread_id: "thread-002",
    thread: thread2,
  },
];
for (const b of beats) w(`beats/beat_${b.beat}.json`, b);
console.log("fixtures written");
