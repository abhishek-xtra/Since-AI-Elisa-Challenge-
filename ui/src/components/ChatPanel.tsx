import { useEffect, useRef, useState } from "react";
import { getSource, sendChat } from "../data";
import type { ChatReply } from "../data/types";
import { ChatIcon, CloseIcon, SendIcon } from "./Icons";

interface Line {
  from: "me" | "them";
  text: string;
}

/** Collapsed by default. It answers or confirms what it saved; it never asks the engineer questions. */
export function ChatPanel({ onReply }: { onReply: (r: ChatReply) => void }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView?.({ block: "end" });
  }, [lines]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    setLines((l) => [...l, { from: "me", text: t }]);
    setBusy(true);
    try {
      const r = await sendChat(getSource(), t);
      setLines((l) => [...l, { from: "them", text: r.reply }]);
      onReply(r);
    } catch (err) {
      setLines((l) => [...l, { from: "them", text: `Couldn't reach the context layer. ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" className="chat-pill" onClick={() => setOpen(true)}>
        <ChatIcon /> Ask or add context
      </button>
    );

  return (
    <section className="chat-panel" aria-label="Ask or add context">
      <header className="chat-head">
        <h2>Ask or add context</h2>
        <button type="button" className="icon-btn" aria-label="Collapse" onClick={() => setOpen(false)}>
          <CloseIcon />
        </button>
      </header>
      <ol className="chat-list" ref={listRef} aria-live="polite">
        {lines.map((l, i) => (
          <li key={i} className={`chat-line chat-${l.from}`}>
            {l.text}
          </li>
        ))}
        {busy && <li className="chat-line chat-them muted">…</li>}
      </ol>
      <form className="chat-form" onSubmit={submit}>
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask, or tell it something new"
          autoComplete="off"
        />
        <button type="submit" className="icon-btn send" aria-label="Send" disabled={busy || !text.trim()}>
          <SendIcon />
        </button>
      </form>
    </section>
  );
}
