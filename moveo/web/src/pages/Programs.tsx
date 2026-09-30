import { useState } from 'react';
import { api, CATEGORY_EMOJI, CATEGORY_LABEL, type Category } from '../api';
import { navigate } from '../router';
import { ErrorBox, Loading, useData } from '../ui';

const ORDER: Category[] = ['recovery', 'desk', 'yoga', 'pilates', 'calisthenics', 'surf'];

export function ProgramsPage() {
  const { data, error, reload } = useData(() => api.programs());
  const [filter, setFilter] = useState<Category | 'all'>('all');
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!data) return <Loading />;
  const list = data
    .filter((p) => filter === 'all' || p.category === filter)
    .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Programmi</h1>
          <div className="sub">Scritti per ripartire da zero e crescere settimana dopo settimana. Puoi anche importarne di tuoi.</div>
        </div>
      </div>
      <div className="row">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Tutti</button>
        {ORDER.map((c) => (
          <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</button>
        ))}
      </div>
      <div className="cards">
        {list.map((p) => (
          <article key={p.id} className={`card program-card cat-${p.category}`} onClick={() => navigate(`/programmi/${p.id}`)}
            tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/programmi/${p.id}`)}>
            <div className="row between"><span className="emoji">{CATEGORY_EMOJI[p.category]}</span>
              {p.id === 'ripartenza-dolce' ? <span className="chip warn">Inizia da qui</span> : p.source === 'import' ? <span className="chip">importato</span> : null}
            </div>
            <h2>{p.title}</h2>
            <p className="muted small">{p.summary}</p>
            <div className="meta">
              {p.kind === 'collection' ? <span>Routine libere</span> : <span>{p.weeks} settimane · {p.sessionsPerWeek}×/sett.</span>}
              <span>≈ {p.minutes} min</span>
              {p.level && <span>{p.level}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
