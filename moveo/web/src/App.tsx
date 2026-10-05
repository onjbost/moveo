import { useEffect, useState } from 'react';
import { reloadCategories, useCategories } from './categories';
import { api, DAREBEE_URL } from './api';
import { Link, useLocation } from './router';
import { ToastProvider } from './ui';
import { Login } from './pages/Login';
import { TodayPage } from './pages/Today';
import { ProgramsPage } from './pages/Programs';
import { ProgramPage } from './pages/Program';
import { ExercisesPage } from './pages/Exercises';
import { PlansPage } from './pages/Plans';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { Player, QuickBreak } from './pages/Player';
import { TabletPage } from './pages/Tablet';
import { NextProgramPage } from './pages/NextProgram';
import { YouTubePlanPage } from './pages/YouTubePlan';
import { listenDeepLinks, openCalendary } from './native';
import { rememberHome } from './home';

const NAV = [
  { to: '/', label: 'Oggi', ico: '☀️' },
  { to: '/programmi', label: 'Programmi', ico: '📚' },
  { to: '/piano', label: 'Piano', ico: '🗓️' },
  { to: '/prossimo', label: 'Prossimo programma', ico: '✨' },
  { to: '/storico', label: 'Storico', ico: '📈' },
  { to: '/esercizi', label: 'Esercizi', ico: '🧩' },
  { to: '/impostazioni', label: 'Impostazioni', ico: '⚙️' },
];
const TABS = NAV.filter((n) => n.to !== '/esercizi' && n.to !== '/prossimo');

export function App() {
  const [auth, setAuth] = useState<'loading' | 'ok' | 'login'>('loading');
  const { path, query } = useLocation();

  useCategories(); // re-render everything when your categories (labels, emoji, colors) are loaded or edited
  useEffect(() => { if (auth === 'ok') reloadCategories(); }, [auth]);

  // Android app: links from Calendary (moveo://open?url=…) land on the right page.
  useEffect(() => listenDeepLinks(), []);

  useEffect(() => {
    api.session().then((s) => setAuth(s.authenticated ? 'ok' : 'login')).catch(() => setAuth('login'));
    const onUnauthorized = () => setAuth('login');
    window.addEventListener('moveo:unauthorized', onUnauthorized);
    return () => window.removeEventListener('moveo:unauthorized', onUnauthorized);
  }, []);

  if (auth === 'loading') return null;
  if (auth === 'login') return <ToastProvider><Login onDone={() => setAuth('ok')} /></ToastProvider>;

  // Full-screen player: /play/:program/:session?w=&ps=&b=
  const play = path.match(/^\/play\/([\w-]+)\/([\w-]+)\/?$/);
  if (play) {
    return (
      <ToastProvider>
        <Player programId={play[1]} sessionId={play[2]} week={Number(query.get('w')) || 1}
          planSessionId={query.get('ps')} breakId={query.get('b')} />
      </ToastProvider>
    );
  }
  if (path === '/pausa') return <ToastProvider><QuickBreak /></ToastProvider>;
  if (path === '/tablet') return <ToastProvider><TabletPage /></ToastProvider>;

  const programMatch = path.match(/^\/programmi\/([\w-]+)\/?$/);
  let page;
  if (path === '/') page = <TodayPage />;
  else if (programMatch) page = <ProgramPage id={programMatch[1]} />;
  else if (path.startsWith('/programmi')) page = <ProgramsPage />;
  else if (path.startsWith('/piano')) page = <PlansPage />;
  else if (path.startsWith('/prossimo')) page = <NextProgramPage />;
  else if (path.startsWith('/youtube')) page = <YouTubePlanPage />;
  else if (path.startsWith('/storico')) page = <HistoryPage />;
  else if (path.startsWith('/esercizi')) page = <ExercisesPage />;
  else if (path.startsWith('/impostazioni')) page = <SettingsPage onLogout={() => setAuth('login')} />;
  else page = <div className="empty">Pagina non trovata. <Link to="/">Torna a Oggi</Link></div>;

  const active = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <ToastProvider>
      <div className="app">
        <aside className="sidebar">
          <Link to="/" className="brand"><img src="/img/icon.svg" alt="" /> Moveo</Link>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`nav-link ${active(n.to) ? 'active' : ''}`}>
              <span className="ico">{n.ico}</span>{n.label}
            </Link>
          ))}
          <div className="spacer" />
          <button className="nav-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
            onClick={() => openCalendary('/').catch(() => {})}><span className="ico">📅</span>Calendary ↗</button>
          <a className="nav-link" href={DAREBEE_URL} target="_blank" rel="noopener"><span className="ico">🌐</span>DAREBEE ↗</a>
          <Link to="/tablet" className="nav-link" onClick={() => rememberHome('/tablet')}><span className="ico">📱</span>Vista tablet</Link>
          <Link to="/pausa" className="btn coral" style={{ marginTop: 8 }}>🪑 Pausa adesso</Link>
        </aside>
        <main className="main">{page}</main>
        <nav className="tabbar">
          {TABS.map((n) => (
            <Link key={n.to} to={n.to} className={active(n.to) ? 'active' : ''}>
              <span className="ico">{n.ico}</span>{n.label}
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
