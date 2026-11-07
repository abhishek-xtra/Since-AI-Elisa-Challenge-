import { useState } from 'react';
import { AGENT_NAME, CAPTURE_LINE, type Item, type Post } from './model';
import { AtIcon, BookmarkIcon, CheckIcon, EventIcon, InfoIcon, MailIcon, NetworkIcon } from './icons';

const PALETTE = ['#5B5FC7', '#E3008C', '#CA5010', '#0078D4', '#038387', '#C239B3'];
const colorFor = (name: string) => PALETTE[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
export const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Dates exactly as the data gives them: the wall-clock part of the ISO string, no timezone conversion. */
export const fmt = (ts: string) => (ts.length >= 16 ? `${ts.slice(0, 10)} ${ts.slice(11, 16)}` : ts);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "7 November 2026" for the day divider. */
export const longDate = (ts: string) => `${Number(ts.slice(8, 10))} ${MONTHS[Number(ts.slice(5, 7)) - 1]} ${ts.slice(0, 4)}`;
/** Time only on the post's own day (the divider names it); a reply on a later day also gets "7 Nov". */
const stamp = (ts: string, day: string) =>
  ts.slice(0, 10) === day ? ts.slice(11, 16) : `${Number(ts.slice(8, 10))} ${MONTHS[Number(ts.slice(5, 7)) - 1].slice(0, 3)} ${ts.slice(11, 16)}`;

const Avatar = ({ name }: { name: string }) => (
  <span className="avatar" style={{ background: colorFor(name) }} aria-hidden="true">{initials(name)}</span>
);
const AppAvatar = () => <span className="avatar app-avatar" aria-hidden="true"><NetworkIcon /></span>;

type Answer = (item: Extract<Item, { kind: 'agent' }>, index: number) => Promise<void>;

export function QuestionCard({ item, onAnswer }: { item: Extract<Item, { kind: 'agent' }>; onAnswer?: Answer }) {
  const [busy, setBusy] = useState(false);
  const q = item.question!;
  return (
    <div className="adaptive-card" role="group" aria-label={`Question to ${item.to}`}>
      <p className="card-title">{item.text}</p>
      {item.answeredLabel != null ? (
        <p className="answered"><CheckIcon /> Answered: {item.answeredLabel}</p>
      ) : (
        <div className="card-actions">
          {q.options.map((o, i) => (
            <button key={o.label} type="button" className="card-button" disabled={!onAnswer || busy}
              onClick={async () => { setBusy(true); try { await onAnswer!(item, i); } finally { setBusy(false); } }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemView({ item, onAnswer, isRoot, day }: { item: Item; onAnswer?: Answer; isRoot: boolean; day: string }) {
  if (item.kind === 'status') {
    return (
      <div className={`status-card status-${item.outcome}`} data-kind="status" title={item.text}>
        <p className="status-head">
          <span className="chip">{item.outcome === 'proposed' ? <CheckIcon /> : <InfoIcon />}{item.outcome}</span>
          <span className="status-lead">{item.lead}</span>
        </p>
        {item.struck && <p className="status-reason"><del>{item.struck.text}</del>{item.struck.until && <> (valid to {fmt(item.struck.until)})</>}</p>}
        <p className="status-reason">{item.reason}</p>
      </div>
    );
  }
  if (item.kind === 'event') {
    return (
      <div className="msg" data-kind="event">
        <span className="avatar app-avatar event-avatar" aria-hidden="true"><EventIcon /></span>
        <div className="msg-body"><div className="msg-head"><time>{stamp(item.ts, day)}</time></div><p className="msg-text">{item.text}</p></div>
      </div>
    );
  }
  if (item.kind === 'agent') {
    return (
      <div className={`msg agent agent-${item.agent}`} data-kind={item.agent}>
        <AppAvatar />
        <div className="msg-body">
          <div className="msg-head"><strong>{AGENT_NAME}</strong><span className="app-tag">APP</span><time>{stamp(item.ts, day)}</time></div>
          {item.agent === 'proposal' && <p className="msg-text">{item.text}</p>}
          {item.agent === 'question' && <QuestionCard item={item} onAnswer={onAnswer} />}
          {item.agent === 'notice' && (
            <p className="notice"><AtIcon /><span><span className="notice-head">{AGENT_NAME} mentioned {item.to}</span> {item.text}</span></p>
          )}
        </div>
      </div>
    );
  }
  const [subject, ...body] = item.email ? item.text.split('\n') : [];
  return (
    <div className="msg" data-kind="message">
      <Avatar name={item.author} />
      <div className="msg-body">
        <div className="msg-head"><strong>{item.author}</strong><time>{stamp(item.ts, day)}</time>{item.email && <span className="via"><MailIcon /> Email</span>}</div>
        {item.email ? (
          <><p className="msg-subject">{subject.replace(/^Subject:\s*/, '')}</p><p className="msg-text">{body.join('\n').trim()}</p></>
        ) : <p className="msg-text">{item.text}</p>}
        {item.text.includes('Traffic is back') && !isRoot && <span className="reaction" aria-label="1 like reaction">👍 1</span>}
        {item.captured && <p className="capture-line"><BookmarkIcon /> {CAPTURE_LINE}</p>}
        {item.note && <p className="capture-line" data-kind="status"><InfoIcon /> {item.note}</p>}
      </div>
    </div>
  );
}

export function PostCard({ post, onAnswer }: { post: Post; onAnswer?: Answer }) {
  const day = post.root.ts.slice(0, 10);
  return (
    <article className="post" aria-label={`Post at ${fmt(post.root.ts)}`}>
      <ItemView item={post.root} onAnswer={onAnswer} isRoot day={day} />
      {post.replies.length > 0 && (
        <div className="replies">
          {post.replies.map((r) => <ItemView key={r.id} item={r} onAnswer={onAnswer} isRoot={false} day={day} />)}
        </div>
      )}
      <button type="button" className="reply-link" disabled>Reply</button>
    </article>
  );
}
