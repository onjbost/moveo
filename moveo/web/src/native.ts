import { api } from './api';

// Capacitor injects window.Capacitor when the page runs inside the Moveo Android app (remote server.url):
// plugins are reached through the bridge, nothing to bundle here.
interface CapPlugin { [method: string]: (...args: any[]) => Promise<any> }
declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins: Record<string, CapPlugin | undefined> };
  }
}

export const isNative = () => !!window.Capacitor?.isNativePlatform?.();
const plugin = (name: string) => window.Capacitor?.Plugins?.[name];

/** Keeps the screen on (native plugin in the app, Wake Lock API in the browser). Returns a release function. */
export async function keepAwake(): Promise<() => void> {
  const ka = plugin('KeepAwake');
  if (ka && isNative()) {
    await ka.keepAwake().catch(() => {});
    return () => { ka.allowSleep().catch(() => {}); };
  }
  let lock: WakeLockSentinel | null = null;
  const acquire = async () => {
    try { lock = await navigator.wakeLock?.request('screen'); } catch { /* not allowed */ }
  };
  await acquire();
  const onVis = () => document.visibilityState === 'visible' && acquire();
  document.addEventListener('visibilitychange', onVis);
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    lock?.release().catch(() => {});
  };
}

/**
 * Opens a page of Calendary. Inside the Android app, calendary://open?url=… hands it to the Calendary app;
 * if that isn't installed (or in a browser) it opens in a new tab.
 */
function openInCalendaryApp(url: string, preopened?: Window | null) {
  if (isNative()) {
    let left = false;
    const onHide = () => { left = true; };
    document.addEventListener('visibilitychange', onHide, { once: true });
    window.location.href = `calendary://open?url=${encodeURIComponent(url)}`;
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      if (!left && document.visibilityState === 'visible') window.open(url, '_blank');
    }, 1500);
    return;
  }
  if (preopened && !preopened.closed) preopened.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

/** Opens Calendary at `path` already signed in (single-use ticket). */
export async function openCalendary(path = '/') {
  const tab = isNative() ? null : window.open('about:blank', '_blank');
  try {
    const { url } = await api.suiteLink(path);
    openInCalendaryApp(url, tab);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/** moveo://open?url=https://moveo…/play/… → shows that page in this app (links coming from Calendary). */
export function listenDeepLinks() {
  const app = plugin('App');
  if (!app || !isNative()) return;
  const handle = (raw?: string) => {
    if (!raw) return;
    try {
      const target = new URL(new URL(raw).searchParams.get('url') || '');
      if (target.origin === window.location.origin && target.href !== window.location.href) window.location.href = target.href;
    } catch { /* malformed link */ }
  };
  app.addListener('appUrlOpen', (e: { url: string }) => handle(e.url));
  // the launch link stays the same for the whole process, also after a page reload: open it only once,
  // otherwise opening the app from a link reloads the page forever
  app.getLaunchUrl?.().then((r: { url?: string } | undefined) => {
    const launch = r?.url;
    let handled: string | null = null;
    try { handled = sessionStorage.getItem('moveo:launch-handled'); } catch { /* storage unavailable */ }
    if (!launch || launch === handled) return;
    try { sessionStorage.setItem('moveo:launch-handled', launch); } catch { /* storage unavailable */ }
    handle(launch);
  }).catch(() => {});
}
