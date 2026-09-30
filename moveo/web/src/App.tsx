import { useEffect, useState } from 'react';
import { api } from './api';
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

const NAV = [
  { to: '/', label: 'Oggi', ico: '☀️' },
  { to: '/programmi', label: 'Programmi', ico: '📚' },
  { to: '/piano', label: 'Piano', ico: '🗓️' },
  { to: '/storico', label: 'Storico', ico: '📈' },
  { to: '/esercizi', label: 'Esercizi', ico: '🧩' },
  { to: '/impostazioni', label: 'Impostazioni', ico: '⚙️' },
];
const TABS = NAV.filter((n) => n.to !== '/esercizi');

export function App() {
  const [auth, setAuth] = useState<'loading' | 'ok' | 'login'>('loading');
  const { path, query } = useLocation();

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

  const programMatch = path.match(/^\/programmi\/([\w-]+)\/?$/);
  let page;
  if (path === '/') page = <TodayPage />;
  else if (programMatch) page = <ProgramPage id={programMatch[1]} />;
  else if (path.startsWith('/programmi')) page = <ProgramsPage />;
  else if (path.startsWith('/piano')) page = <PlansPage />;
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
          <Link to="/pausa" className="btn coral">🪑 Pausa adesso</Link>
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
