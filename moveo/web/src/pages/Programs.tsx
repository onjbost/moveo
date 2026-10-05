import { useState } from 'react';
import { api, DAREBEE_URL, type Category } from '../api';
import { catEmoji, catLabel, categoryIds, useCategories } from '../categories';
import { navigate } from '../router';
import { ErrorBox, Loading, useData } from '../ui';


export function ProgramsPage() {
  const { data, error, reload } = useData(() => api.programs());
  useCategories();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!data) return <Loading />;
  const ORDER = categoryIds();
  // only categories that have at least one program get a filter chip
  const usedCats = ORDER.filter((c) => data.some((p) => p.category === c));
  const list = data
    .filter((p) => filter === 'all' || p.category === filter)
    .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Programmi</h1>
          <div className="sub">Scritti per ripartire da zero e crescere settimana dopo settimana. Puoi anche importarne di tuoi o collegarne di esterni (Impostazioni).</div>
        </div>
      </div>
      <div className="row">
        <button className="btn sm" onClick={() => navigate('/youtube')}>▶ Da playlist YouTube</button>
        <button className="btn sm ghost" onClick={() => navigate('/impostazioni#esterni')}>＋ Programma esterno</button>
        <a className="btn sm ghost" href={DAREBEE_URL} target="_blank" rel="noopener">🌐 Sfoglia DAREBEE ↗</a>
      </div>
      <div className="row">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Tutti</button>
        {usedCats.map((c) => (
          <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>{catEmoji(c)} {catLabel(c)}</button>
        ))}
      </div>
      <div className="cards">
        {list.map((p) => (
          <article key={p.id} className={`card program-card cat-${p.category}`} onClick={() => navigate(`/programmi/${p.id}`)}
            tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/programmi/${p.id}`)}>
            <div className="row between"><span className="emoji">{catEmoji(p.category)}</span>
              {p.id === 'ripartenza-dolce' ? <span className="chip warn">Inizia da qui</span>
                : p.source === 'generated' ? <span className="chip">✨ generato</span>
                  : p.id.startsWith('yt-') ? <span className="chip">▶ YouTube</span>
                  : p.kind === 'external' ? <span className="chip">↗ esterno</span>
                    : p.source === 'import' ? <span className="chip">importato</span> : null}
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
