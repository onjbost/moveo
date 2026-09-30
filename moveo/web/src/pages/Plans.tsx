import { api, DAY_SHORT, fmtShort, ymd } from '../api';
import { Link } from '../router';
import { CatChip, ErrorBox, Loading, useData, useToast } from '../ui';
import { SessionRow } from './Today';

export function PlansPage() {
  const toast = useToast();
  const { data, error, reload } = useData(() => api.plans());
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!data) return <Loading />;
  const today = ymd(new Date());

  const sync = async (id: string) => {
    const p = await api.syncPlan(id);
    toast(p.calendaryStatus === 'ok' ? 'Sincronizzato con Calendary' : `Calendary: ${p.calendaryStatus}`);
    reload();
  };
  const remove = async (id: string, title: string) => {
    if (!confirm(`Eliminare il piano "${title}"? Gli eventi verranno tolti anche da Calendary; lo storico degli allenamenti resta.`)) return;
    const r = await api.deletePlan(id);
    toast(r.calendary?.error ? `Piano eliminato (Calendary: ${r.calendary.error})` : `Piano eliminato${r.calendary?.deleted ? ` · ${r.calendary.deleted} eventi rimossi` : ''}`);
    reload();
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div><h1>Piano</h1><div className="sub">I programmi che hai messo in calendario.</div></div>
        <Link to="/programmi" className="btn primary">＋ Nuovo piano</Link>
      </div>
      {data.length === 0 && (
        <div className="empty">Nessun piano. Apri un programma e premi <b>Pianifica in Calendary</b>.</div>
      )}
      {data.map((p) => {
        const upcoming = p.sessions.filter((s) => s.date >= today && !s.done).slice(0, 4);
        const missed = p.sessions.filter((s) => s.date < today && !s.done).length;
        const finished = p.sessions.every((s) => s.done || s.date < today);
        return (
          <section key={p.id} className={`card stack cat-${p.category}`}>
            <div className="row between">
              <div className="stack tight">
                <div className="row"><CatChip category={p.category} />{finished && <span className="chip">concluso</span>}</div>
                <h2><Link to={`/programmi/${p.programId}`}>{p.programTitle}</Link></h2>
                <div className="faint small">Dal {fmtShort(p.startDate)} · {p.days.map((d) => DAY_SHORT[d]).join(', ')} alle {p.time}</div>
              </div>
              <div className="stat" style={{ alignItems: 'flex-end' }}>
                <span className="v num">{p.done}/{p.total}</span><span className="l">sessioni fatte</span>
              </div>
            </div>
            <div className="progress"><i style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} /></div>
            {upcoming.length > 0 && <div className="stack tight">{upcoming.map((s) => <SessionRow key={s.id} s={s} />)}</div>}
            <div className="row between">
              <div className="row small">
                {p.calendaryStatus === 'ok'
                  ? <span className="chip ok">✓ in Calendary</span>
                  : <span className="chip warn" title={p.calendaryStatus || ''}>Calendary: {p.calendaryStatus || 'non sincronizzato'}</span>}
                {missed > 0 && <span className="chip">{missed} saltate</span>}
              </div>
              <div className="row">
                {p.calendaryStatus !== 'ok' && <button className="btn sm" onClick={() => sync(p.id)}>Risincronizza</button>}
                <button className="btn sm danger" onClick={() => remove(p.id, p.programTitle)}>Elimina</button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
