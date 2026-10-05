// Where to go back after a workout: the tablet view if this device uses it, otherwise "Oggi".
const KEY = 'moveo:home';

export function rememberHome(path: '/' | '/tablet') {
  try { localStorage.setItem(KEY, path); } catch { /* private mode */ }
}

export function homePath() {
  try { return localStorage.getItem(KEY) === '/tablet' ? '/tablet' : '/'; } catch { return '/'; }
}
