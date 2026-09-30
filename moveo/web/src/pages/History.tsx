import { api, CATEGORY_LABEL, fmtDuration, fmtShort, fmtTime, type Category } from '../api';
import { CatChip, ErrorBox, Loading, useData, useToast } from '../ui';

const CAT_ORDER: Category[] = ['desk', 'recovery', 'yoga', 'pilates', 'calisthenics', 'surf'];

export function HistoryPage() {
  const toast = useToast();
  const stats = useData(() => api.stats());
  const logs = useData(() => api.logs());
  if (stats.error || logs.error) return <ErrorBox error={(stats.error || logs.error)!} retry={() => { stats.reload(); logs.reload(); }} />;
  if (!stats.data || !logs.data) return <Loading />;
  const s = stats.data;
  const max = Math.max(30, ...s.weeks.map((w) => w.minutes));
  const used = CAT_ORDER.filter((c) => s.weeks.some((w) => w.byCategory[c]));

  const remove = async (id: string) => {
    if (!confirm('Eliminare questo allenamento dallo storico?')) return;
    await api.deleteLog(id);
    toast('Eliminato');
    stats.reload();
    logs.reload();
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Storico</h1><div className="sub">La costanza conta più dell'intensità.</div></div></div>
      <div className="grid-3">
        <div className="card stat"><span className="v num">{s.streak}</span><span className="l">giorni di fila attivi</span></div>
        <div className="card stat"><span className="v num">{s.week.minutes}</span><span className="l">minuti questa settimana · {s.week.sessions} sessioni</span></div>
        <div className="card stat"><span className="v num">{s.total.n}</span><span className="l">allenamenti in totale · {fmtDuration(s.total.s)}</span></div>
      </div>
      <section className="card stack">
        <h2>Minuti per settimana</h2>
        <div className="bars" role="img" aria-label="Minuti di allenamento nelle ultime 8 settimane">
          {s.weeks.map((w) => (
            <div key={w.week} className="stack tight" style={{ height: '100%' }}>
              <div className="val num">{w.minutes || ''}</div>
              <div className="col" title={`${w.minutes} min`}>
                {CAT_ORDER.filter((c) => w.byCategory[c]).reverse().map((c) => (
                  <div key={c} className="seg" style={{ height: `${(w.byCategory[c] / max) * 100}%`, background: `var(--c-${c})` }} />
                ))}
              </div>
              <div className="lbl">{fmtShort(w.week).split(' ').slice(1).join(' ')}</div>
            </div>
          ))}
        </div>
        {used.length > 0 && <div className="row small">{used.map((c) => <span key={c} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: `var(--c-${c})`, display: 'inline-block' }} />{CATEGORY_LABEL[c]}</span>)}</div>}
      </section>
      <section className="card stack">
        <h2>Allenamenti</h2>
        {logs.data.length === 0 && <div className="empty">Ancora nessun allenamento registrato.</div>}
        <table className="table">
          <tbody>
            {logs.data.map((l) => (
              <tr key={l.id}>
                <td className="num faint" style={{ whiteSpace: 'nowrap' }}>{fmtShort(new Date(l.finishedAt))}<br />{fmtTime(l.finishedAt)}</td>
                <td><b>{l.title}</b><div className="row" style={{ marginTop: 4 }}><CatChip category={l.category} /></div>{l.note && <div className="muted small" style={{ marginTop: 4 }}>{l.note}</div>}</td>
                <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDuration(l.durationSec)}{l.completion < 1 && <div className="faint tiny">{Math.round(l.completion * 100)}% completato</div>}{l.effort && <div className="faint tiny">fatica {l.effort}/10</div>}</td>
                <td><button className="btn sm ghost" onClick={() => remove(l.id)} aria-label="Elimina">🗑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
