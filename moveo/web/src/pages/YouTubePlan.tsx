import { useMemo, useState } from 'react';
import { api, type Category, type PlaylistInfo } from '../api';
import { CategoryPicker } from '../components/CategoryPicker';
import { Link, navigate } from '../router';
import { useToast } from '../ui';

interface Row { index: number; videoId: string | null; title: string; minutes: number | null; thumbnail: string | null; on: boolean }

/** Turn a YouTube playlist into a training plan, choosing videos, order and rhythm by hand. */
export function YouTubePlanPage() {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<PlaylistInfo | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [manualCount, setManualCount] = useState(10);
  const [manualTitles, setManualTitles] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('yoga');
  const [perWeek, setPerWeek] = useState(3);
  const [weeks, setWeeks] = useState(0);
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);

  const resolve = async () => {
    setBusy(true);
    try {
      const r = await api.resolvePlaylist(url);
      setInfo(r);
      setTitle((t) => t || r.title || '');
      setRows(r.videos.map((v) => ({ ...v, on: true })));
      if (r.videos.length) {
        const mins = r.videos.map((v) => v.minutes || 0).filter(Boolean);
        if (mins.length) setMinutes(Math.round(mins.reduce((a, b) => a + b, 0) / mins.length));
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Without an API key: N videos, optional titles one per line.
  const manualRows: Row[] = useMemo(() => {
    const titles = manualTitles.split('\n').map((t) => t.trim()).filter(Boolean);
    return Array.from({ length: Math.max(1, Math.min(200, manualCount)) }, (_, i) => ({
      index: i + 1, videoId: null, title: titles[i] || `Video ${i + 1}`, minutes: null, thumbnail: null, on: true,
    }));
  }, [manualCount, manualTitles]);

  const list = info?.videos.length ? rows : manualRows;
  const chosen = list.filter((r) => r.on);
  const totalWeeks = weeks || Math.ceil(chosen.length / perWeek) || 1;

  const move = (i: number, d: -1 | 1) => setRows((rs) => {
    const j = i + d;
    if (j < 0 || j >= rs.length) return rs;
    const copy = [...rs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));

  const create = async () => {
    setBusy(true);
    try {
      const p = await api.createFromPlaylist({
        url: info!.url, title, category, perWeek, weeks: totalWeeks, minutes,
        videos: chosen.map((r) => ({ index: r.index, videoId: r.videoId, title: r.title, minutes: r.minutes })),
      });
      toast('Piano creato dalla playlist: ora puoi pianificarlo in Calendary');
      navigate(`/programmi/${p.id}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div><Link to="/programmi" className="muted small">← Programmi</Link></div>
      <div className="page-head">
        <div>
          <h1>Piano da playlist YouTube ▶</h1>
          <div className="sub">Ogni video diventa una sessione: scegli quali, in che ordine e con che ritmo. I video si guardano incorporati nel player di Moveo.</div>
        </div>
      </div>

      <section className="card stack">
        <label className="field">Link della playlist
          <div className="row nowrap">
            <input className="input" placeholder="https://www.youtube.com/playlist?list=…" value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && url && resolve()} />
            <button className="btn primary" onClick={resolve} disabled={busy || !url.trim()}>Carica</button>
          </div>
        </label>
        {info && !info.apiKey && (
          <div className="alert small">
            Senza <code>youtube_api_key</code> Moveo non può leggere l'elenco dei video: indica quanti sono e, se vuoi, i titoli (uno per riga).
            La sessione N riprodurrà l'N-esimo video della playlist.
          </div>
        )}
      </section>

      {info && (
        <>
          <section className="card stack">
            <h2>Nome e categoria</h2>
            <div className="grid-2">
              <label className="field">Nome del programma
                <input className="input" placeholder="Es. Yoga mattutino 30 giorni" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
                {!title.trim() && <span className="small" style={{ color: 'var(--coral)' }}>Scegli un nome per il programma</span>}
              </label>
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
            <div className="faint small">Il nome compare in Moveo e negli eventi di Calendary. Puoi creare una categoria tua (es. «Mobilità», «Corsa»): avrà la sua emoji e il suo colore.</div>
          </section>

          <section className="card stack">
            <h2>Video{info.videos.length ? ` (${chosen.length} di ${rows.length} scelti)` : ''}</h2>
            {info.videos.length ? (
              <div className="stack tight">
                {rows.map((r, i) => (
                  <div key={`${r.videoId}-${i}`} className={`session-row ${r.on ? '' : 'done'}`} style={{ gap: 10 }}>
                    <input type="checkbox" checked={r.on} onChange={(e) => patch(i, { on: e.target.checked })} aria-label="Includi" style={{ width: 18, height: 18, accentColor: 'var(--teal)' }} />
                    {r.thumbnail && <img src={r.thumbnail} alt="" width={96} height={54} style={{ borderRadius: 8, objectFit: 'cover' }} />}
                    <input className="input grow" value={r.title} onChange={(e) => patch(i, { title: e.target.value })} />
                    {r.minutes && <span className="chip">{r.minutes} min</span>}
                    <button className="btn icon sm ghost" onClick={() => move(i, -1)} aria-label="Su">↑</button>
                    <button className="btn icon sm ghost" onClick={() => move(i, 1)} aria-label="Giù">↓</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid-2">
                <label className="field">Numero di video nella playlist<input className="input" type="number" min={1} max={200} value={manualCount} onChange={(e) => setManualCount(Number(e.target.value))} /></label>
                <label className="field">Titoli (facoltativi, uno per riga)
                  <textarea className="input" style={{ minHeight: 120, fontFamily: 'inherit' }} value={manualTitles} onChange={(e) => setManualTitles(e.target.value)} placeholder={'Giorno 1 – Mobilità\nGiorno 2 – Forza\n…'} />
                </label>
              </div>
            )}
          </section>

          <section className="card stack">
            <h2>Ritmo</h2>
            <div className="grid-3">
              <label className="field">Sessioni a settimana<input className="input" type="number" min={1} max={7} value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} /></label>
              <label className="field">Settimane (0 = ogni video una volta)<input className="input" type="number" min={0} max={26} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></label>
              <label className="field">Minuti per sessione (stima)<input className="input" type="number" min={5} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
            </div>
            <div className="faint small">
              {chosen.length} sessioni, {perWeek} a settimana per {totalWeeks} settimane{weeks && weeks * perWeek > chosen.length ? ': i video si ripetono in ordine' : ''}.
              Prima settimana: {Array.from({ length: Math.min(perWeek, 7) }, (_, k) => chosen[k % Math.max(1, chosen.length)]?.title).filter(Boolean).join(' · ')}
            </div>
            <div className="row"><button className="btn primary" onClick={create} disabled={busy || !chosen.length || !title.trim()}>Crea «{title.trim() || '…'}»</button></div>
          </section>
        </>
      )}
    </div>
  );
}
