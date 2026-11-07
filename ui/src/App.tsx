import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { source as defaultSource, type Beat, type DataSource, type IncidentBody, type Thread, type Topology } from './data';
import { buildChannels, itemsOf, type Item, type LiveIncident, type ModelInput } from './model';
import { longDate, PostCard, TypingRow, type Play } from './Thread';
import { applyReveal, EASE, motionOK, revealSteps, TIMING, typist, urlReveal } from './reveal';
import { ReportFault } from './ReportFault';
import * as I from './icons';

const THREAD_IDS = ['thread-001', 'email-001', 'email-12_barrier', 'thread-12b_barrier_update', 'thread-13_second_technician',
  'thread-14_road_closed', 'thread-15_retraction'];
const VIEWER = 'Erkki Expert'; // the demo is watched from Erkki's seat
const DEFAULT_CHANNEL: Record<number, string> = {
  1: 'faults', 2: 'experts', 3: 'faults', 4: 'faults', 5: 'site-access', 6: 'site-access', 7: 'faults', 8: 'site-access', 9: 'experts',
};

/** beat_1, beat_2, ... until the first one the source does not have. */
async function loadBeats(src: DataSource): Promise<Beat[]> {
  const beats: Beat[] = [];
  for (let n = 1; ; n++) {
    try { beats.push(await src.getBeat(n)); } catch { return beats; }
  }
}

// ?beat=3&channel=experts, or #beat-3-experts where only a hash reaches the page (the hosted copy)
export function urlParams(search = window.location.search, hash = window.location.hash): { beat: string | null; channel: string | null } {
  const q = new URLSearchParams(search);
  const m = /^#beat-(\d+)(?:-([a-z-]+))?$/.exec(hash);
  return { beat: q.get('beat') ?? m?.[1] ?? null, channel: q.get('channel') ?? m?.[2] ?? null };
}

export function beatFromUrl(search = window.location.search, hash = window.location.hash): number | null {
  const n = Number(urlParams(search, hash).beat);
  return Number.isInteger(n) && n >= 1 ? n : null; // the upper bound is the number of beat files, checked after loading
}

const fetchThreads = async (src: DataSource) =>
  Object.fromEntries(await Promise.all(THREAD_IDS.map(async (id) => [id, await src.getThread(id)] as const))) as Record<string, Thread>;

const APP_BAR: [string, (p: { size?: number }) => JSX.Element][] = [
  ['Activity', I.Bell], ['Chat', I.ChatIcon], ['Teams', I.TeamsIcon], ['Calendar', I.CalendarIcon], ['Calls', I.CallIcon], ['OneDrive', I.CloudIcon], ['Apps', I.MoreIcon],
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// the TIMING table as CSS variables, for app.css
const REVEAL_VARS = { ...Object.fromEntries(Object.entries(TIMING).map(([k, v]) => [`--rv-${k}`, `${v}ms`])), '--rv-ease': EASE } as React.CSSProperties;

export default function App({ source = defaultSource, beat = beatFromUrl(), reveal: revealParam = urlReveal() }:
  { source?: DataSource; beat?: number | null; reveal?: { auto: number | null } | null }) {
  const [reveal] = useState(() => (beat === null ? null : revealParam)); // replay only; fixed at mount so timers and memos hold
  const [input, setInput] = useState<ModelInput | null>(null);
  const [topology, setTopology] = useState<Topology | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ?channel=experts opens another channel first (for recording); otherwise the channel the beat is about
  const [selected, setSelected] = useState(urlParams().channel ?? (beat ? DEFAULT_CHANNEL[beat] : undefined) ?? 'faults');
  const postsRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set()); // items on screen this session (clears the Activity badge)
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [beats, threads, fillers, reports, topo] = await Promise.all([
        loadBeats(source),
        fetchThreads(source), source.listFillerThreads(), source.listReportThreads(), source.getTopology(),
      ]);
      const loaded: ModelInput = { beats: Object.fromEntries(beats.map((b) => [b.beat, b])), threads, fillers, reports, live: [], answers: {} };
      // Unread = added by this beat (replay) or since load (live).
      setSeen(new Set(buildChannels(loaded, beat === null ? null : beat - 1).flatMap(itemsOf).map((i) => i.id)));
      setTopology(topo);
      setInput(loaded);
    })().catch((e) => setError(String(e)));
  }, [source, beat]);

  const allChannels = useMemo(() => (input ? buildChannels(input, beat) : []), [input, beat]);
  // Reveal mode: per channel, the beat's new items as steps, and how many of them are on screen
  const steps = useMemo(() => {
    if (!reveal || !input || beat === null) return {};
    const prev = new Set(buildChannels(input, beat - 1).flatMap(itemsOf).map((i) => i.id));
    return Object.fromEntries(allChannels.map((c) => [c.id, revealSteps(c, prev)]));
  }, [reveal, input, beat, allChannels]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [play, setPlay] = useState<Play>({});
  const [dim, setDim] = useState(false);
  const channels = useMemo(() => (reveal ? allChannels.map((c) => applyReveal(c, steps[c.id] ?? [], progress[c.id] ?? 0)) : allChannels),
    [reveal, allChannels, steps, progress]);
  const current = channels.find((c) => c.id === selected);

  useEffect(() => {
    if (!current) return;
    const ids = itemsOf(current).map((i) => i.id);
    setSeen((s) => (s ? new Set([...s, ...ids]) : s));
    setOpened((s) => new Set([...s, ...ids]));
    setPlay({});
    if (postsRef.current) postsRef.current.scrollTop = postsRef.current.scrollHeight; // Teams opens at the newest post
  }, [selected, allChannels]); // eslint-disable-line react-hooks/exhaustive-deps -- not on every reveal step

  const busy = useRef(false);
  const next = async () => {
    const list = steps[selected] ?? [], n = progress[selected] ?? 0, step = list[n], ch = selected;
    if (busy.current || !step) return;
    busy.current = true;
    const motion = motionOK(), name = typist(step), id = step.item.id;
    if (motion && name) {
      setPlay({ typing: { post: step.root ? '' : step.post, name } });
      await wait(TIMING.typing);
    }
    if (motion && step.answer) {
      const q = step.item;
      const index = q.kind === 'agent' && q.question ? q.question.options.findIndex((o) => o.label === q.answeredLabel) : -1;
      setPlay({ answering: { id, index, pressed: false } });
      await wait(TIMING.cursor);
      setPlay({ answering: { id, index, pressed: true } });
      await wait(TIMING.press);
    }
    setProgress((p) => ({ ...p, [ch]: n + 1 }));
    setSeen((s) => s && new Set([...s, id]));
    setPlay({ fresh: step.answer ? null : id });
    if (motion && !step.answer) { setDim(true); setTimeout(() => setDim(false), TIMING.dim); }
    busy.current = false;
  };
  const back = () => {
    if (busy.current) return;
    setProgress((p) => ({ ...p, [selected]: Math.max(0, (p[selected] ?? 0) - 1) }));
    setPlay({});
  };
  const keys = useRef({ next, back });
  keys.current = { next, back };
  useEffect(() => {
    if (!reveal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); keys.current.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); keys.current.back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reveal]);
  const shown = progress[selected] ?? 0;
  useEffect(() => { // ?reveal=auto: the next step `every` ms after the last one landed
    if (!reveal?.auto || shown >= (steps[selected]?.length ?? 0)) return;
    const t = setTimeout(() => keys.current.next(), reveal.auto);
    return () => clearTimeout(t);
  }, [reveal, selected, shown, steps]);
  const scrolling = useRef(0);
  useEffect(() => { // keep the newest item (or typing row) in the lower third
    const c = postsRef.current, el = c?.querySelector('.typing, .reveal-in');
    if (!c || !el) return;
    const r = el.getBoundingClientRect(), bottom = r.top + Math.max(r.height, el.firstElementChild?.scrollHeight ?? 0);
    const from = c.scrollTop, to = Math.max(0, Math.min(from + bottom - c.getBoundingClientRect().top - c.clientHeight * 0.85, c.scrollHeight - c.clientHeight));
    cancelAnimationFrame(scrolling.current);
    if (!motionOK() || !window.requestAnimationFrame) { c.scrollTop = to; return; }
    // own easing instead of behavior: 'smooth', so the duration is in TIMING and headless frames advance it
    const t0 = performance.now(); // not the rAF timestamp: headless virtual time does not advance it
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / TIMING.scroll);
      c.scrollTop = from + (to - from) * (1 - (1 - k) ** 3);
      if (k < 1) scrolling.current = requestAnimationFrame(tick);
    };
    scrolling.current = requestAnimationFrame(tick);
  }, [play]);

  const unread = (items: Item[]) => !!seen && items.some((i) => !seen.has(i.id));
  // Activity: notices to the viewer (Erkki) on screen at this beat that he has not opened yet
  const unreadNotices = channels.flatMap(itemsOf)
    .filter((i) => i.kind === 'agent' && i.agent === 'notice' && i.to === VIEWER && !opened.has(i.id)).length;
  const siteOf = (entity?: string) =>
    entity && (topology?.nodes.find((n) => n.id === entity)?.site ?? topology?.sites.find((s) => s.id === entity)?.id);
  const newestSite = siteOf(current?.posts.at(-1)?.entity);

  const refresh = async (live: LiveIncident[], answers: Record<string, number>) => {
    const threads = await fetchThreads(source);
    setInput((prev) => prev && { ...prev, threads, live, answers });
  };

  const live = beat === null;
  const onAnswer = live && input ? async (item: Extract<Item, { kind: 'agent' }>, index: number) => {
    const q = item.question!;
    try {
      setError(null);
      await source.answer(q.assertion_id, index);
      // The demo's "Re-run": incidents that waited on this answer get their results again.
      const rerun = await Promise.all(input.live.map(async (l) =>
        l.results.some((r) => r.outcome === 'ambiguous' && r.assertion.id === q.assertion_id)
          ? { ...l, ...(await source.reportIncident({ entity_id: l.entity_id, event: l.event, symptoms: l.symptoms, at_time: l.at })) }
          : l));
      await refresh(rerun, { ...input.answers, [q.key]: index });
    } catch (e) { setError(String(e)); }
  } : undefined;

  const onReport = async (body: IncidentBody) => {
    if (!input) return;
    try {
      setError(null);
      const res = await source.reportIncident(body);
      const l: LiveIncident = { id: `live-${input.live.length + 1}-${body.entity_id}`, entity_id: body.entity_id, event: body.event, symptoms: body.symptoms, at: body.at_time, ...res };
      await refresh([...input.live, l], input.answers);
      setReporting(false);
      setSelected('faults');
    } catch (e) { setError(String(e)); }
  };

  return (
    <div className="app" style={reveal ? REVEAL_VARS : undefined}>
      <header className="titlebar">
        <span className="app-title">Microsoft Teams</span>
        <div className="title-center">
          <span className="nav-arrows">
            <button type="button" className="nav-btn" aria-label="Back"><I.ChevronLeft /></button>
            <button type="button" className="nav-btn" aria-label="Forward"><I.ChevronRight /></button>
          </span>
          <div className="search"><I.SearchIcon /><input aria-label="Search" placeholder="Search (Ctrl+E)" readOnly /></div>
        </div>
        <span className="avatar me" aria-label={`Your profile: ${VIEWER}, available`}>EE<span className="presence" aria-hidden="true" /></span>
      </header>
      <div className="workspace">
        <nav className="appbar" aria-label="App bar">
          {APP_BAR.map(([label, Icon]) => (
            <button key={label} type="button" className={`appbar-item${label === 'Teams' ? ' selected' : ''}`} aria-current={label === 'Teams' ? 'page' : undefined}>
              <span className="appbar-icon"><Icon />{label === 'Activity' && unreadNotices > 0 && (
                <span key={reveal ? unreadNotices : undefined} className={`badge${reveal ? ' bump' : ''}`} aria-label={`${unreadNotices} unread`}>{unreadNotices}</span>)}</span>
              <span className="appbar-label">{label}</span>
            </button>
          ))}
          <button type="button" className="appbar-item appbar-help"><span className="appbar-icon"><I.HelpIcon /></span><span className="appbar-label">Help</span></button>
        </nav>
        <nav className="rail" aria-label="Teams and channels">
          <div className="rail-head">
            <h1>Teams</h1>
            <button type="button" className="icon-btn" aria-label="Filter"><I.FilterIcon /></button>
            <button type="button" className="icon-btn" aria-label="Create or join a team"><I.PlusIcon /></button>
          </div>
          <div className="team-row"><I.ChevronDown /><span className="team-tile" aria-hidden="true">NO</span><span>Network Operations</span></div>
          <ul className="channel-list">
            {channels.map((c) => {
              const isUnread = c.id !== selected && unread(itemsOf(c));
              return (
                <li key={c.id}>
                  <button type="button" className={`channel-row${c.id === selected ? ' selected' : ''}${isUnread ? ' unread' : ''}`}
                    aria-current={c.id === selected ? 'page' : undefined} onClick={() => setSelected(c.id)}>
                    <span className="channel-name"><I.HashIcon />{c.name}</span>{isUnread && <span className="dot" aria-label="unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="rail-foot"><I.PeopleAddIcon /> Join or create a team</button>
        </nav>
        <main className="channel">
          <div className="channel-head">
            <div>
              <h2><I.HashIcon size={22} />{current?.name ?? ''}</h2>
              <select className="channel-picker" aria-label="Channel" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="tabs" role="tablist">
                <button type="button" role="tab" aria-selected="true" className="tab selected">Posts</button>
                <button type="button" role="tab" aria-selected="false" className="tab">Files</button>
                <button type="button" className="tab" aria-label="Add a tab"><I.PlusIcon /></button>
              </div>
            </div>
            <div className="head-actions">
              {live && topology && <button type="button" className="btn-secondary" onClick={() => setReporting(true)}>Report fault</button>}
              <button type="button" className="meet"><I.VideoIcon /> Meet <span className="meet-split"><I.ChevronDown size={14} /></span></button>
              <button type="button" className="icon-btn" aria-label="More options"><I.MoreIcon size={20} /></button>
            </div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {(() => {
            const rootTyping = play.typing?.post === '' ? play.typing.name : null;
            const posts = (
              <div className={`posts${reveal ? ' reveal-mode' : ''}${dim ? ' dim' : ''}`} ref={postsRef}>
                {reporting && topology && <ReportFault topology={topology} onSubmit={onReport} onClose={() => setReporting(false)} />}
                {current?.posts.length === 0 && !rootTyping && <p className="empty">No posts yet.</p>}
                {current?.posts.map((p, i, all) => (
                  <Fragment key={p.id}>
                    {p.root.ts.slice(0, 10) !== all[i - 1]?.root.ts.slice(0, 10) && (
                      <p className="day-divider" role="separator"><span>{longDate(p.root.ts)}</span></p>)}
                    <PostCard post={p} onAnswer={onAnswer} play={reveal ? play : undefined} />
                  </Fragment>
                ))}
                {rootTyping && <TypingRow name={rootTyping} />}
                {!!current?.posts.length && (
                  <p className="up-to-date"><I.CheckIcon /> You're up to date{newestSite && <> · {newestSite}</>}</p>)}
              </div>
            );
            // reveal mode: an invisible strip at the right edge advances on click (mouse-only recording)
            return reveal ? <div className="posts-area">{posts}<div className="reveal-strip" onClick={() => keys.current.next()} aria-hidden="true" /></div> : posts;
          })()}
          <div className="compose" aria-disabled={!live}>
            <div className="compose-box">
              <input aria-label="Start a post" placeholder="Start a post" readOnly disabled={!live} />
              <div className="compose-tools">
                <span className="tools">
                  {[I.FormatIcon, I.AttachIcon, I.EmojiIcon, I.GifIcon, I.StickerIcon].map((T, i) => <span key={i} className="tool"><T /></span>)}
                  <span className="tool"><I.MoreIcon size={20} /></span>
                </span>
                <button type="button" className="icon-btn" aria-label="Send" disabled><I.SendIcon /></button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
