import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { source as defaultSource, type DataSource, type IncidentBody, type Thread, type Topology } from './data';
import { buildChannels, itemsOf, type Item, type LiveIncident, type ModelInput } from './model';
import { longDate, PostCard } from './Thread';
import { ReportFault } from './ReportFault';
import * as I from './icons';

const THREAD_IDS = ['thread-001', 'email-001', 'email-12_barrier', 'thread-12b_barrier_update', 'thread-13_second_technician'];
const VIEWER = 'Erkki Expert'; // the demo is watched from Erkki's seat
const DEFAULT_CHANNEL: Record<number, string> = { 1: 'faults', 2: 'experts', 3: 'faults', 4: 'faults', 5: 'site-access', 6: 'site-access', 7: 'faults' };

// ?beat=3&channel=experts, or #beat-3-experts where only a hash reaches the page (the hosted copy)
export function urlParams(search = window.location.search, hash = window.location.hash): { beat: string | null; channel: string | null } {
  const q = new URLSearchParams(search);
  const m = /^#beat-(\d+)(?:-([a-z-]+))?$/.exec(hash);
  return { beat: q.get('beat') ?? m?.[1] ?? null, channel: q.get('channel') ?? m?.[2] ?? null };
}

export function beatFromUrl(search = window.location.search, hash = window.location.hash): number | null {
  const n = Number(urlParams(search, hash).beat);
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
}

const fetchThreads = async (src: DataSource) =>
  Object.fromEntries(await Promise.all(THREAD_IDS.map(async (id) => [id, await src.getThread(id)] as const))) as Record<string, Thread>;

const APP_BAR: [string, (p: { size?: number }) => JSX.Element][] = [
  ['Activity', I.Bell], ['Chat', I.ChatIcon], ['Teams', I.TeamsIcon], ['Calendar', I.CalendarIcon], ['Calls', I.CallIcon], ['OneDrive', I.CloudIcon], ['Apps', I.MoreIcon],
];

export default function App({ source = defaultSource, beat = beatFromUrl() }: { source?: DataSource; beat?: number | null }) {
  const [input, setInput] = useState<ModelInput | null>(null);
  const [topology, setTopology] = useState<Topology | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ?channel=experts opens another channel first (for recording); otherwise the channel the beat is about
  const [selected, setSelected] = useState(urlParams().channel ?? (beat ? DEFAULT_CHANNEL[beat] : 'faults'));
  const postsRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set()); // items on screen this session (clears the Activity badge)
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [beats, threads, fillers, reports, topo] = await Promise.all([
        Promise.all([1, 2, 3, 4, 5, 6, 7].map((n) => source.getBeat(n))),
        fetchThreads(source), source.listFillerThreads(), source.listReportThreads(), source.getTopology(),
      ]);
      const loaded: ModelInput = { beats: Object.fromEntries(beats.map((b) => [b.beat, b])), threads, fillers, reports, live: [], answers: {} };
      // Unread = added by this beat (replay) or since load (live).
      setSeen(new Set(buildChannels(loaded, beat === null ? null : beat - 1).flatMap(itemsOf).map((i) => i.id)));
      setTopology(topo);
      setInput(loaded);
    })().catch((e) => setError(String(e)));
  }, [source, beat]);

  const channels = useMemo(() => (input ? buildChannels(input, beat) : []), [input, beat]);
  const current = channels.find((c) => c.id === selected);

  useEffect(() => {
    if (!current) return;
    const ids = itemsOf(current).map((i) => i.id);
    setSeen((s) => (s ? new Set([...s, ...ids]) : s));
    setOpened((s) => new Set([...s, ...ids]));
    if (postsRef.current) postsRef.current.scrollTop = postsRef.current.scrollHeight; // Teams opens at the newest post
  }, [current]);

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
    <div className="app">
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
                <span className="badge" aria-label={`${unreadNotices} unread`}>{unreadNotices}</span>)}</span>
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
          <div className="posts" ref={postsRef}>
            {reporting && topology && <ReportFault topology={topology} onSubmit={onReport} onClose={() => setReporting(false)} />}
            {current?.posts.length === 0 && <p className="empty">No posts yet.</p>}
            {current?.posts.map((p, i, all) => (
              <Fragment key={p.id}>
                {p.root.ts.slice(0, 10) !== all[i - 1]?.root.ts.slice(0, 10) && (
                  <p className="day-divider" role="separator"><span>{longDate(p.root.ts)}</span></p>)}
                <PostCard post={p} onAnswer={onAnswer} />
              </Fragment>
            ))}
            {!!current?.posts.length && (
              <p className="up-to-date"><I.CheckIcon /> You're up to date{newestSite && <> · {newestSite}</>}</p>)}
          </div>
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
