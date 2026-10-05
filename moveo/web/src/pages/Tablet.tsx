import { useEffect, useState } from 'react';
import { api, CATEGORY_EMOJI, fmtTime, relativeDay, type Break } from '../api';
import { rememberHome } from '../home';
import { openCalendary } from '../native';
import { navigate } from '../router';
import { ErrorBox, Loading, useData, useToast } from '../ui';

const STATUS: Record<Break['status'], string> = {
  pending: 'in programma', sent: 'adesso', done: 'fatta ✓', skipped: 'saltata', missed: 'persa',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Tablet view: big touch targets, today's workout and breaks, one tap to Calendary. */
export function TabletPage() {
  const toast = useToast();
  const now = useClock();
  const { data, error, reload } = useData(() => api.today());
  useEffect(() => {
    rememberHome('/tablet');
    const id = window.setInterval(reload, 60_000);
    const onVis = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [reload]);

  const goCalendary = () => openCalendary('/kiosk').catch((e) => toast((e as Error).message));
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  if (error) return <div className="main"><ErrorBox error={error} retry={reload} /></div>;
  if (!data) return <div className="main"><Loading /></div>;

  const main = data.sessionsToday.find((s) => !s.done) || data.upcoming[0] || null;
  const isToday = !!main && main.date === data.date;
  const doneToday = data.sessionsToday.filter((s) => s.done);
  const openBreak = data.breaks.find((b) => b.status === 'sent');
  const play = (path: string) => navigate(path);

  return (
    <div className="tablet">
      <header className="tablet-top">
        <div>
          <div className="tablet-clock num">{now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="muted">{now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <span className="grow" />
        <div className="row">
          <div className="chip" style={{ fontSize: '0.95rem', padding: '6px 14px' }}>🔥 {data.stats.streak} giorni</div>
          <div className="chip" style={{ fontSize: '0.95rem', padding: '6px 14px' }}>{data.stats.week.minutes} min/sett.</div>
          <button className="btn lg" onClick={goCalendary}>📅 Calendary</button>
          <button className="btn icon" onClick={() => { rememberHome('/'); navigate('/'); }} aria-label="App completa" title="App completa">☰</button>
          <button className="btn icon" onClick={fullscreen} aria-label="Schermo intero" title="Schermo intero">⛶</button>
        </div>
      </header>

      <div className="tablet-body">
        <section className={`card hero tablet-main ${main?.category ? `cat-${main.category}` : ''}`}>
          {main ? (
            <>
              <div className="row">
                <span className="chip cat" style={{ fontSize: '0.9rem' }}>{main.category ? CATEGORY_EMOJI[main.category] : '🏃'} {main.programTitle}</span>
                <span className="chip">settimana {main.week}{main.weeks ? `/${main.weeks}` : ''}</span>
              </div>
              <div className="muted" style={{ fontSize: '1.1rem' }}>{isToday ? 'Allenamento di oggi' : 'Prossimo allenamento'} · {relativeDay(main.date)} alle {main.time}</div>
              <h1 className="tablet-title">{main.title}</h1>
              <div className="muted">circa {main.durationMin} minuti</div>
              <button className="btn primary tablet-play" onClick={() => play(`/play/${main.programId}/${main.sessionId}?w=${main.week}&ps=${main.id}`)}>
                ▶ {isToday ? 'Inizia' : 'Anticipa ad adesso'}
              </button>
            </>
          ) : (
            <>
              <h1 className="tablet-title">Nessun piano attivo</h1>
              <p className="muted" style={{ fontSize: '1.1rem' }}>Scegli un programma e premi “Pianifica in Calendary”: le sessioni compariranno qui e nel calendario.</p>
              <button className="btn primary tablet-play" onClick={() => navigate('/programmi')}>📚 Programmi</button>
            </>
          )}
          {doneToday.length > 0 && <div className="alert ok">Già fatto oggi: {doneToday.map((s) => s.title).join(', ')} 💪</div>}
        </section>

        <section className="card stack tablet-side">
          <button className="btn coral tablet-pause" onClick={() => play(openBreak ? `/play/pause-scrivania/${openBreak.sessionId}?b=${openBreak.id}` : '/pausa')}>
            🪑 {openBreak ? `Pausa: ${openBreak.title}` : 'Pausa adesso'}
          </button>
          <h2>Pause di oggi</h2>
          {data.breaks.length === 0 ? (
            <div className="empty">{data.paused ? 'Sospese per oggi' : 'Nessuna pausa prevista oggi'}</div>
          ) : (
            <div className="timeline">
              {data.breaks.map((b) => (
                <button key={b.id} className={`slot ${b.status}`} style={{ cursor: 'pointer', textAlign: 'left', minWidth: 140 }}
                  onClick={() => play(`/play/pause-scrivania/${b.sessionId}?b=${b.id}`)}>
                  <span className="t">{fmtTime(b.dueAt)}</span>
                  <span className="small">{b.title}</span>
                  <span className="faint tiny">{STATUS[b.status]}</span>
                </button>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 8 }}>In arrivo</h2>
          <div className="stack tight">
            {data.upcoming.filter((s) => s.id !== main?.id).slice(0, 3).map((s) => (
              <div key={s.id} className={`session-row ${s.category ? `cat-${s.category}` : ''}`}>
                <div className="bar" />
                <div className="when"><b>{s.time}</b>{relativeDay(s.date)}</div>
                <div className="grow ellipsis">{s.title}</div>
              </div>
            ))}
            {data.upcoming.length <= 1 && <div className="faint small">Niente altro in programma.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
