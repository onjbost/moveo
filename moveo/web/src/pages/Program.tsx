import { useEffect, useMemo, useState } from 'react';
import { CategoryPicker } from '../components/CategoryPicker';
import { AttachmentsEditor } from '../components/AttachmentsEditor';
import { api, DAY_SHORT, fmtShort, ymd, type Exercise, type PlanInput, type ProgramDetail, type Session } from '../api';
import { Link, navigate } from '../router';
import { CatChip, ErrorBox, Loading, Modal, useData, useToast } from '../ui';
import { HowTo } from './Player';

function describeItem(it: Session['blocks'][number]['items'][number]) {
  const amount = it.duration ? `${it.duration}s` : `${it.reps} rip.`;
  return it.sets && it.sets > 1 ? `${it.sets}×${amount}` : amount;
}

export function ProgramPage({ id }: { id: string }) {
  const toast = useToast();
  const { data: p, error, reload } = useData(() => api.program(id), [id]);
  const { data: exercises } = useData(() => api.exercises());
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [how, setHow] = useState<Exercise | null>(null);
  const exMap = useMemo(() => new Map((exercises || []).map((e) => [e.id, e])), [exercises]);

  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!p) return <Loading />;

  const remove = async () => {
    if (!confirm(`Eliminare il programma "${p.title}"?`)) return;
    try {
      await api.deleteProgram(p.id);
      toast('Programma eliminato');
      navigate('/programmi', { replace: true });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div><Link to="/programmi" className="muted small">← Programmi</Link></div>
      <section className={`card hero stack cat-${p.category}`}>
        <div className="row"><CatChip category={p.category} />{p.level && <span className="chip">{p.level}</span>}
          {p.kind !== 'collection' && p.schedule && <span className="chip">{p.schedule.length} settimane</span>}
          {p.source === 'generated' && <span className="chip">✨ generato per te</span>}
          {p.kind === 'external' && <span className="chip">esterno</span>}</div>
        <h1>{p.title}</h1>
        {p.summary && <p className="muted" style={{ fontSize: '1.05rem' }}>{p.summary}</p>}
        <div className="row">
          {p.kind !== 'collection' && <button className="btn primary lg" onClick={() => setPlanning(true)}>🗓️ Pianifica in Calendary</button>}
          <a className="btn" href={`/api/export?program=${p.id}`}>⬇ Esporta JSON</a>
          {p.kind === 'external' && p.url && <a className="btn" href={p.url} target="_blank" rel="noopener">↗ Apri su {new URL(p.url).hostname.replace(/^www\./, '')}</a>}
          {p.source !== 'builtin' && <button className="btn" onClick={() => setEditing(true)}>✏️ Nome e categoria</button>}
          {p.source !== 'builtin' && <button className="btn danger" onClick={remove}>Elimina</button>}
        </div>
      </section>

      <ProgramBody p={p} exMap={exMap} onHow={setHow} tryable={p.kind !== 'external'} />

      {editing && <EditMeta p={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); toast('Programma aggiornato'); }} />}
      {planning && <PlanForm program={p} onClose={() => setPlanning(false)} onDone={() => { setPlanning(false); toast('Piano creato e aggiunto a Calendary 🗓️'); navigate('/piano'); }} />}
      {how && <HowTo ex={how} onClose={() => setHow(null)} />}
    </div>
  );
}

export function PlanForm({ program, onClose, onDone, onSubmit, submitLabel = 'Crea piano', heading }: {
  program: ProgramDetail; onClose: () => void; onDone: () => void;
  /** custom action (e.g. approve a proposal); default: create the plan of a saved program */
  onSubmit?: (input: PlanInput) => Promise<void>;
  submitLabel?: string;
  heading?: string;
}) {
  const perWeek = Math.max(...(program.schedule || []).map((w) => w.sessions.length));
  const [startDate, setStartDate] = useState(ymd(new Date()));
  const [days, setDays] = useState<number[]>(program.suggestedDays || [1, 3, 5]);
  const [time, setTime] = useState('18:30');
  const [reminder, setReminder] = useState('15');
  const [preview, setPreview] = useState<{ week: number; sessionId: string; date: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (days.length < perWeek || onSubmit) { setPreview([]); return; }
    api.previewPlan({ programId: program.id, startDate, days }).then((r) => setPreview(r.dates)).catch(() => setPreview([]));
  }, [program.id, startDate, days, perWeek, onSubmit]);

  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const input = { startDate, days, time, reminderMinutes: reminder === '' ? null : Number(reminder) };
      if (onSubmit) await onSubmit(input);
      else await api.createPlan({ programId: program.id, ...input });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  const title = (sid: string) => program.sessions.find((s) => s.id === sid)?.title || sid;
  const last = preview[preview.length - 1];

  return (
    <Modal title={heading || `Pianifica: ${program.title}`} sub={`${perWeek} sessioni a settimana per ${program.schedule?.length} settimane`} onClose={onClose}>
      <div className="stack">
        {error && <div className="alert error">{error}</div>}
        <div className="field">Giorni (almeno {perWeek})
          <div className="weekdays">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" className={days.includes(d) ? 'on' : ''} onClick={() => toggle(d)}>{DAY_SHORT[d]}</button>)}
          </div>
        </div>
        <div className="grid-3">
          <label className="field">Inizio<input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="field">Ora<input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="field">Promemoria
            <select className="input" value={reminder} onChange={(e) => setReminder(e.target.value)}>
              <option value="">Nessuno</option><option value="0">All'inizio</option><option value="10">10 min prima</option>
              <option value="15">15 min prima</option><option value="30">30 min prima</option><option value="60">1 ora prima</option>
            </select>
          </label>
        </div>
        {preview.length > 0 && (
          <div className="card flat stack tight small">
            <div className="muted">Prime sessioni:</div>
            {preview.slice(0, 4).map((d, k) => <div key={k}>{fmtShort(d.date)} · {time} — <b>{title(d.sessionId)}</b></div>)}
            {last && <div className="faint">… fine programma {fmtShort(last.date)} ({preview.length} sessioni)</div>}
          </div>
        )}
        <p className="faint small">Ogni sessione diventa un evento nel calendario “Allenamento” di Calendary, con il pulsante ▶ che apre direttamente il player.</p>
        <div className="row">
          <button className="btn primary" onClick={submit} disabled={busy || days.length < perWeek}>{busy ? 'Creazione…' : submitLabel}</button>
          <button className="btn ghost" onClick={onClose}>Annulla</button>
        </div>
      </div>
    </Modal>
  );
}

/** Description, weeks and sessions of a program (saved or still a proposal). */
export function ProgramBody({ p, exMap, onHow, tryable = true }: {
  p: ProgramDetail; exMap: Map<string, Exercise>; onHow: (e: Exercise) => void; tryable?: boolean;
}) {
  const sessionTitle = (sid: string) => p.sessions.find((s) => s.id === sid)?.title || sid;
  return (
    <>
      <div className="grid-2">
        <section className="card stack">
          <h2>Il programma</h2>
          {p.description && <p className="muted">{p.description}</p>}
          {!!p.goals?.length && (
            <div className="stack tight"><b className="small">Obiettivi</b>
              <ul style={{ margin: 0, paddingLeft: 18 }} className="muted small">{p.goals.map((g) => <li key={g}>{g}</li>)}</ul></div>
          )}
          {!!p.equipment?.length && <div className="small"><b>Attrezzatura:</b> <span className="muted">{p.equipment.join(', ')}</span></div>}
          {!!p.sources?.length && (
            <div className="stack tight small"><b>Fonti</b>
              {p.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener" className="muted" style={{ textDecoration: 'underline' }}>{s.title}</a>)}
            </div>
          )}
        </section>

        {p.kind !== 'collection' && p.schedule && (
          <section className="card stack">
            <h2>Settimane</h2>
            <table className="table">
              <thead><tr><th>Sett.</th><th>Sessioni</th></tr></thead>
              <tbody>
                {p.schedule.map((w) => (
                  <tr key={w.week}>
                    <td className="num"><b>{w.week}</b></td>
                    <td>
                      <div>{w.sessions.map(sessionTitle).join(' · ')}</div>
                      {w.adjust && <div className="faint tiny">{Object.entries(w.adjust).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${{ reps: 'rip.', duration: 's', sets: 'serie', rounds: 'giri' }[k] || k}`).join(', ')}</div>}
                      {w.note && <div className="faint tiny">{w.note}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {p.kind === 'external' ? (
        <>
        <section className="card stack">
          <h2>Come funziona</h2>
          <p className="muted">Le sessioni di questo programma sono sul sito originale{p.url ? ` (${new URL(p.url).hostname.replace(/^www\./, '')})` : ''}: Moveo le mette in calendario, apre il link del giorno e registra quando le completi. Immagini e testi restano sul sito dell'autore.</p>
          {p.url && <a className="btn primary" style={{ alignSelf: 'flex-start' }} href={p.url} target="_blank" rel="noopener">↗ Apri il programma</a>}
        </section>
        <AttachmentsEditor program={p} />
        </>
      ) : (
      <section className="stack">
        <h2>Sessioni</h2>
        <div className="cards">
          {p.sessions.map((s) => (
            <article key={s.id} className={`card stack cat-${p.category}`}>
              <div className="row between"><h3>{s.title}</h3><span className="chip">≈ {s.minutes} min</span></div>
              {s.focus && <div className="faint small">{s.focus}</div>}
              <div className="stack tight">
                {s.blocks.map((b, bi) => (
                  <div key={bi} className="small">
                    <div className="faint tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                      {b.title}{b.rounds && b.rounds > 1 ? ` · ${b.rounds} giri` : ''}
                    </div>
                    {b.items.map((it, ii) => {
                      const ex = exMap.get(it.exercise);
                      return (
                        <div key={ii} className="row between nowrap" style={{ padding: '2px 0' }}>
                          <button className="ellipsis" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
                            onClick={() => ex && onHow(ex)}>{ex?.name || it.exercise}{ex?.perSide ? ' ↔' : ''}</button>
                          <span className="faint num">{describeItem(it)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {tryable && <button className="btn sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => navigate(`/play/${p.id}/${s.id}`)}>▶ Prova ora</button>}
            </article>
          ))}
        </div>
        <div className="faint tiny">↔ = da fare su entrambi i lati. Tocca un esercizio per vedere come si esegue.</div>
      </section>
      )}
    </>
  );
}

/** Rename / re-categorize a program you made, imported or linked (the built-in ones can't be changed). */
function EditMeta({ p, onClose, onSaved }: { p: ProgramDetail; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(p.title);
  const [category, setCategory] = useState(p.category);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.updateProgram(p.id, { title, category });
      onSaved();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal title="Nome e categoria" onClose={onClose}>
      <div className="stack">
        <label className="field">Nome<input className="input" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></label>
        {p.category === 'desk' ? <div className="faint small">Le pause da scrivania restano nella loro categoria.</div> : <CategoryPicker value={category} onChange={setCategory} />}
        <div className="faint small">Anche i prossimi allenamenti già messi in Calendary prendono il nuovo nome e la nuova emoji.</div>
        <div className="row"><button className="btn primary" onClick={save} disabled={busy || !title.trim()}>Salva</button><button className="btn ghost" onClick={onClose}>Annulla</button></div>
      </div>
    </Modal>
  );
}
