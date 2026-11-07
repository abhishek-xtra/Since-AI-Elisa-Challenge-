import { useState, type FormEvent } from 'react';
import { EVENTS, SYMPTOMS, type IncidentBody, type Topology } from './data';

/** Local wall-clock time with its UTC offset; the API rejects naive times (422). */
export function nowWithOffset(d = new Date()): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
    + `${off >= 0 ? '+' : '-'}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`;
}

export function ReportFault({ topology, onSubmit, onClose }: {
  topology: Topology; onSubmit: (b: IncidentBody) => Promise<void>; onClose: () => void;
}) {
  const [entity, setEntity] = useState(topology.nodes[0]?.id ?? '');
  const [event, setEvent] = useState(EVENTS[0]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [when, setWhen] = useState(nowWithOffset().slice(0, 16)); // local wall clock, minute precision, for the picker
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // the time matters: validity, expiry and supersession are evaluated at it (a dispatch before valid_from is declined)
    try { await onSubmit({ entity_id: entity, event, symptoms, at_time: nowWithOffset(new Date(when)) }); } finally { setBusy(false); }
  };
  return (
    <form className="report-form" onSubmit={submit} aria-label="Report fault">
      <h2>Report fault</h2>
      <label>Device or site
        <select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <optgroup label="Devices">
            {topology.nodes.map((n) => <option key={n.id} value={n.id}>{n.id} · {n.model} · {n.install_year} · {n.site}</option>)}
          </optgroup>
          <optgroup label="Sites">
            {topology.sites.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
          </optgroup>
        </select>
      </label>
      <label>Event
        <select value={event} onChange={(e) => setEvent(e.target.value)}>
          {EVENTS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label>When
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </label>
      <fieldset>
        <legend>Symptoms</legend>
        {SYMPTOMS.map((s) => (
          <label key={s} className="check">
            <input type="checkbox" checked={symptoms.includes(s)}
              onChange={(e) => setSymptoms(e.target.checked ? [...symptoms, s] : symptoms.filter((x) => x !== s))} />
            {s}
          </label>
        ))}
      </fieldset>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy || !entity}>Post</button>
      </div>
    </form>
  );
}
