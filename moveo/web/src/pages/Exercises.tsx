import { useMemo, useState } from 'react';
import { api, CATEGORY_EMOJI, CATEGORY_LABEL, type Category, type Exercise } from '../api';
import { ErrorBox, Loading, useData } from '../ui';
import { HowTo } from './Player';

const CATS: (Category | 'mobility')[] = ['desk', 'recovery', 'yoga', 'pilates', 'calisthenics', 'surf', 'mobility'];
const label = (c: string) => (c === 'mobility' ? '🌀 Mobilità' : `${CATEGORY_EMOJI[c as Category]} ${CATEGORY_LABEL[c as Category]}`);

export function ExercisesPage() {
  const { data, error, reload } = useData(() => api.exercises());
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [open, setOpen] = useState<Exercise | null>(null);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data || []).filter((e) => (cat === 'all' || e.categories.includes(cat))
      && (!needle || `${e.name} ${e.targets.join(' ')} ${e.searchTerm || ''}`.toLowerCase().includes(needle)));
  }, [data, q, cat]);
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Esercizi</h1><div className="sub">{data.length} esercizi con spiegazione, indicazioni e varianti.</div></div></div>
      <input className="input" placeholder="Cerca per nome o zona (es. spalle, anche, collo)…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row">
        <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>Tutti</button>
        {CATS.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{label(c)}</button>)}
      </div>
      <div className="card" style={{ padding: 8 }}>
        {list.length === 0 && <div className="empty">Nessun esercizio trovato</div>}
        {list.map((e) => (
          <div key={e.id} className="list-ex" onClick={() => setOpen(e)} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && setOpen(e)}>
            <div className="grow">
              <div><b>{e.name}</b>{e.perSide ? <span className="faint"> ↔</span> : null}
                {e.animation ? <span className="chip" style={{ marginLeft: 8 }}>🎞 animazione</span> : null}
                {e.video ? <span className="chip" style={{ marginLeft: 6 }}>▶ video</span> : null}</div>
              <div className="faint small ellipsis">{[e.position, ...e.targets].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="row" style={{ gap: 4 }}>{e.categories.filter((c) => c !== 'mobility').slice(0, 3).map((c) => <span key={c} className={`chip cat cat-${c}`}>{CATEGORY_EMOJI[c as Category]}</span>)}</div>
          </div>
        ))}
      </div>
      {open && <HowTo ex={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
