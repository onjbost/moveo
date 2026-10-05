import { useRef, useState } from 'react';
import { api, DAREBEE_URL, type Attachment, type ProgramDetail } from '../api';
import { useData, useToast } from '../ui';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const kb = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} kB`);

/**
 * Files of an external program the user downloaded for personal use: one PDF of the whole program
 * (day N → page "first page" + N − 1) and/or a poster per day. They are shown unchanged in the player.
 */
export function AttachmentsEditor({ program }: { program: ProgramDetail }) {
  const toast = useToast();
  const { data, reload } = useData(() => api.attachments(program.id), [program.id]);
  const [busy, setBusy] = useState('');
  const [firstPage, setFirstPage] = useState<number | null>(null);
  const whole = data?.find((a) => a.scope === '_');
  const perDay = new Map((data || []).filter((a) => a.scope !== '_').map((a) => [a.scope, a]));
  const wholeInput = useRef<HTMLInputElement>(null);
  const daysInput = useRef<HTMLInputElement>(null);
  const dayInput = useRef<HTMLInputElement>(null);
  const [dayTarget, setDayTarget] = useState('');

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const uploadWhole = (f: File) => run('whole', () => api.uploadAttachment(program.id, '_', f, firstPage || undefined));
  // Several posters at once: sorted by file name and assigned to the days in order, from the first without a file.
  const uploadDays = (files: File[]) => run('days', async () => {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const start = program.sessions.findIndex((s) => !perDay.has(s.id));
    const targets = program.sessions.slice(start < 0 ? 0 : start);
    for (let i = 0; i < sorted.length && i < targets.length; i += 1) {
      await api.uploadAttachment(program.id, targets[i].id, sorted[i]);
    }
    toast(`${Math.min(sorted.length, targets.length)} immagini assegnate ai giorni`);
  });

  return (
    <section className="card stack">
      <div className="row between">
        <h2>Fogli dell'allenamento</h2>
        <a className="btn sm ghost" href={program.url || DAREBEE_URL} target="_blank" rel="noopener">↗ Scaricali dal sito</a>
      </div>
      <p className="muted small">
        Per uso personale: scarica dal sito dell'autore il PDF del programma o le schede dei giorni e caricali qui.
        Restano sul tuo server, non vengono modificati e compaiono così come sono nel player, accanto al cronometro.
      </p>

      <div className="stack tight">
        <h3>PDF o immagine del programma intero</h3>
        {whole ? (
          <div className="row">
            <span className="chip">{whole.mime === 'application/pdf' ? '📄' : '🖼'} {whole.name} · {kb(whole.size)}</span>
            {whole.mime === 'application/pdf' && (
              <label className="row small nowrap" style={{ gap: 6 }}>
                Il giorno 1 è a pagina
                <input className="input" type="number" min={1} style={{ width: 80 }} value={firstPage ?? whole.firstPage ?? 1}
                  onChange={(e) => setFirstPage(Number(e.target.value))} />
                {firstPage !== null && firstPage !== whole.firstPage && (
                  <button className="btn sm" onClick={() => run('page', async () => { await api.setFirstPage(program.id, firstPage); setFirstPage(null); })}>Salva</button>
                )}
              </label>
            )}
            <a className="btn sm ghost" href={whole.url} target="_blank" rel="noopener">Apri</a>
            <button className="btn sm ghost" onClick={() => wholeInput.current?.click()} disabled={!!busy}>Sostituisci</button>
            <button className="btn sm danger" onClick={() => run('rm', () => api.removeAttachment(program.id, '_'))} disabled={!!busy}>Rimuovi</button>
          </div>
        ) : (
          <div className="row">
            <button className="btn" onClick={() => wholeInput.current?.click()} disabled={!!busy}>{busy === 'whole' ? 'Carico…' : '📄 Carica il PDF del programma'}</button>
            <label className="row small nowrap" style={{ gap: 6 }}>
              giorno 1 a pagina
              <input className="input" type="number" min={1} style={{ width: 80 }} value={firstPage ?? 1} onChange={(e) => setFirstPage(Number(e.target.value))} />
            </label>
          </div>
        )}
        <div className="faint tiny">Nel player il giorno N apre la pagina (giorno 1 + N − 1); con le frecce sfogli il resto del PDF.</div>
        <input ref={wholeInput} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadWhole(f); }} />
      </div>

      <div className="stack tight">
        <div className="row between">
          <h3>Scheda di ogni giorno <span className="faint small">({perDay.size}/{program.sessions.length})</span></h3>
          <button className="btn sm" onClick={() => daysInput.current?.click()} disabled={!!busy}>{busy === 'days' ? 'Carico…' : '🖼 Carica più immagini'}</button>
        </div>
        <div className="faint tiny">Seleziona più file insieme: vengono ordinati per nome (giorno-1, giorno-2…) e assegnati ai giorni ancora vuoti. Una scheda del giorno ha la precedenza sul PDF.</div>
        <input ref={daysInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) uploadDays(fs); }} />
        <input ref={dayInput} type="file" accept={ACCEPT} hidden onChange={(e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (f && dayTarget) run('day', () => api.uploadAttachment(program.id, dayTarget, f));
        }} />
        <div className="attach-days">
          {program.sessions.map((s) => {
            const a: Attachment | undefined = perDay.get(s.id);
            return (
              <div key={s.id} className={`attach-day ${a ? 'has' : ''}`}>
                {a ? (a.mime.startsWith('image/') ? <img src={a.url} alt="" loading="lazy" /> : <span>📄</span>) : <span className="faint">—</span>}
                <div className="small">{s.title}</div>
                <div className="row tight" style={{ gap: 4 }}>
                  <button className="btn xs ghost" onClick={() => { setDayTarget(s.id); dayInput.current?.click(); }} disabled={!!busy}>{a ? 'Cambia' : 'Carica'}</button>
                  {a && <button className="btn xs ghost" onClick={() => run('rm', () => api.removeAttachment(program.id, s.id))} disabled={!!busy} aria-label="Rimuovi">✕</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
