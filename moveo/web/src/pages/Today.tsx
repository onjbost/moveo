import { api, fmtDay, fmtDuration, fmtTime, relativeDay, ymd, type Break, type PlanSession } from '../api';
import { Link, navigate } from '../router';
import { CatChip, ErrorBox, Loading, useData, useToast } from '../ui';

const STATUS: Record<Break['status'], string> = {
  pending: 'in programma', sent: 'da fare', done: 'fatta ✓', skipped: 'saltata', missed: 'persa',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function SessionRow({ s, compact = false }: { s: PlanSession; compact?: boolean }) {
  const play = () => navigate(`/play/${s.programId}/${s.sessionId}?w=${s.week}&ps=${s.id}`);
  return (
    <div className={`session-row ${s.done ? 'done' : ''} ${s.category ? `cat-${s.category}` : ''}`}>
      <div className="bar" />
      <div className="when"><b>{s.time}</b>{relativeDay(s.date)}</div>
      <div className="grow stack tight">
        <div className="row nowrap"><h3 className="ellipsis">{s.title}</h3>{s.done && <span className="chip ok">fatto</span>}</div>
        {!compact && <div className="faint small ellipsis">{s.programTitle} · sett. {s.week}{s.weeks ? `/${s.weeks}` : ''} · ≈ {s.durationMin} min</div>}
      </div>
      {!s.done && <button className="btn sm primary" onClick={play}>▶</button>}
    </div>
  );
}

export function TodayPage() {
  const toast = useToast();
  const { data, error, reload } = useData(() => api.today());
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!data) return <Loading />;

  const { stats } = data;
  const main = data.sessionsToday.find((s) => !s.done) || null;
  const next = main ? null : data.upcoming[0];
  const openBreak = data.breaks.find((b) => b.status === 'sent') || null;
  const nextBreak = data.breaks.find((b) => b.status === 'pending') || null;

  const snooze = async (b: Break) => {
    await api.snoozeBreak(b.id, 10);
    toast('Ti ricordo tra 10 minuti');
    reload();
  };
  const skip = async (b: Break) => {
    await api.skipBreak(b.id);
    reload();
  };
  const togglePause = async () => {
    await api.pauseToday(!data.paused);
    toast(data.paused ? 'Pause riattivate' : 'Pause sospese per oggi');
    reload();
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>{greeting()} 👋</h1>
          <div className="sub">{fmtDay(new Date()).replace(/^./, (c) => c.toUpperCase())}</div>
        </div>
        <div className="row">
          <div className="card flat stat" style={{ padding: '12px 16px' }}><span className="v num">{stats.streak}</span><span className="l">giorni di fila 🔥</span></div>
          <div className="card flat stat" style={{ padding: '12px 16px' }}><span className="v num">{stats.week.minutes}</span><span className="l">min questa settimana</span></div>
          <div className="card flat stat" style={{ padding: '12px 16px' }}><span className="v num">{stats.breaksToday.done}/{stats.breaksToday.total}</span><span className="l">pause oggi</span></div>
        </div>
      </div>

      {data.proposal && (
        <div className="card hero row between" style={{ borderColor: 'var(--teal)' }}>
          <div className="stack tight">
            <span className="chip" style={{ alignSelf: 'flex-start' }}>✨ Nuovo programma pronto</span>
            <h2>{data.proposal.title}</h2>
            {data.proposal.summary && <span className="muted small">{data.proposal.summary}</span>}
          </div>
          <Link to="/prossimo" className="btn primary">Guarda la proposta →</Link>
        </div>
      )}

      {openBreak && (
        <div className="card hero cat-desk row between" style={{ borderColor: 'var(--coral)' }}>
          <div className="stack tight">
            <span className="chip" style={{ color: 'var(--coral)', borderColor: 'var(--coral)', alignSelf: 'flex-start' }}>È ora di una pausa</span>
            <h2>{openBreak.title}</h2>
            <span className="muted small">3-5 minuti, in piedi vicino alla scrivania</span>
          </div>
          <div className="row">
            <button className="btn ghost sm" onClick={() => skip(openBreak)}>Salta</button>
            <button className="btn sm" onClick={() => snooze(openBreak)}>Tra 10 min</button>
            <button className="btn coral" onClick={() => navigate(`/play/pause-scrivania/${openBreak.sessionId}?b=${openBreak.id}`)}>▶ Inizia</button>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="card hero stack">
          <div className="card-title"><h2>{main ? 'Allenamento di oggi' : 'Prossimo allenamento'}</h2>{(main || next) && <CatChip category={(main || next)!.category} />}</div>
          {main || next ? (
            <>
              <div className="stack tight">
                <div className="faint small">{(main || next)!.programTitle} · settimana {(main || next)!.week}</div>
                <h1 style={{ fontSize: '1.9rem' }}>{(main || next)!.title}</h1>
                <div className="muted">{relativeDay((main || next)!.date)} alle {(main || next)!.time} · circa {(main || next)!.durationMin} minuti</div>
              </div>
              <div className="row">
                <button className="btn primary lg" onClick={() => { const s = (main || next)!; navigate(`/play/${s.programId}/${s.sessionId}?w=${s.week}&ps=${s.id}`); }}>
                  ▶ {main ? 'Inizia ora' : 'Anticipa ad adesso'}
                </button>
              </div>
            </>
          ) : (
            <div className="stack">
              <p className="muted">Non hai ancora un piano in calendario. Il punto di partenza consigliato dopo un periodo fermo è <b>Ripartenza dolce</b>: due settimane leggere, poi scegli tra yoga, pilates, calisthenics e surf.</p>
              <div className="row">
                <Link to="/programmi/ripartenza-dolce" className="btn primary">🌿 Ripartenza dolce</Link>
                <Link to="/programmi" className="btn">Tutti i programmi</Link>
              </div>
            </div>
          )}
        </section>

        <section className="card stack">
          <div className="card-title">
            <h2>Pause di oggi</h2>
            {data.breakSettings.enabled && data.breaks.length > 0 && (
              <button className="btn sm ghost" onClick={togglePause}>{data.paused ? 'Riattiva' : 'Sospendi oggi'}</button>
            )}
          </div>
          {!data.breakSettings.enabled ? (
            <div className="empty">Pause disattivate. <Link to="/impostazioni" style={{ color: 'var(--teal)' }}>Attivale</Link></div>
          ) : data.breaks.length === 0 ? (
            <div className="empty">{data.paused ? 'Pause sospese per oggi.' : 'Oggi non sono previste pause (giorno non lavorativo).'}</div>
          ) : (
            <div className="timeline">
              {data.breaks.map((b) => (
                <button key={b.id} className={`slot ${b.status}`} style={{ cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => navigate(`/play/pause-scrivania/${b.sessionId}?b=${b.id}`)}>
                  <span className="t">{fmtTime(b.dueAt)}</span>
                  <span className="small">{b.title}</span>
                  <span className="faint tiny">{STATUS[b.status]}{b.postponed ? ` · rimandata ${b.postponed}×` : ''}</span>
                </button>
              ))}
            </div>
          )}
          {nextBreak && <div className="faint small">Prossima alle {fmtTime(nextBreak.dueAt)}. Se sei in riunione (da Calendary) la rimando di 15 minuti.</div>}
          <Link to="/pausa" className="btn coral" style={{ alignSelf: 'flex-start' }}>🪑 Fai una pausa adesso</Link>
        </section>
      </div>

      <div className="grid-2">
        <section className="card stack">
          <div className="card-title"><h2>In arrivo</h2><Link to="/piano" className="btn sm ghost">Piano →</Link></div>
          {data.upcoming.length ? data.upcoming.slice(0, 5).map((s) => <SessionRow key={s.id} s={s} />) : <div className="empty">Nessuna sessione pianificata</div>}
        </section>
        <section className="card stack">
          <div className="card-title"><h2>Ultimi allenamenti</h2><Link to="/storico" className="btn sm ghost">Storico →</Link></div>
          {data.recent.length ? data.recent.map((l) => (
            <div key={l.id} className={`session-row cat-${l.category}`}>
              <div className="bar" />
              <div className="when"><b>{fmtTime(l.finishedAt)}</b>{relativeDay(ymd(new Date(l.finishedAt)))}</div>
              <div className="grow"><h3 className="ellipsis">{l.title}</h3><div className="faint small">{fmtDuration(l.durationSec)}{l.completion < 1 ? ` · ${Math.round(l.completion * 100)}%` : ''}{l.effort ? ` · fatica ${l.effort}/10` : ''}</div></div>
            </div>
          )) : <div className="empty">Ancora niente: la prima sessione è la più importante.</div>}
        </section>
      </div>
    </div>
  );
}
