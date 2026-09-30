import { config } from './config.js';
import { getSetting, setSetting } from './db.js';

// ============================================================ Calendary

const CAL_COLOR = '#2dd4bf';

export const calendaryEnabled = () => !!(config.calendary.url && config.calendary.token);

async function cal(method, path, body) {
  if (!calendaryEnabled()) throw new Error('Calendary non configurato (calendary_url / calendary_token)');
  const res = await fetch(`${config.calendary.url}/api${path}`, {
    method,
    headers: {
      authorization: `Bearer ${config.calendary.token}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text.slice(0, 200) };
  }
  if (!res.ok) throw new Error(`Calendary ${res.status}: ${data?.error || res.statusText}`);
  return data;
}

/** Id of the "Allenamento" calendar in Calendary, created on first use. */
export async function ensureCalendar() {
  const cached = getSetting('calendary_calendar_id');
  const calendars = await cal('GET', '/calendars');
  if (cached && calendars.some((c) => c.id === cached)) return cached;
  const found = calendars.find((c) => c.type === 'local' && c.name.toLowerCase() === config.calendary.calendarName.toLowerCase());
  const id = found ? found.id : (await cal('POST', '/calendars', { name: config.calendary.calendarName, color: CAL_COLOR, type: 'local' })).id;
  setSetting('calendary_calendar_id', id);
  return id;
}

export const calendary = {
  status: async () => {
    if (!calendaryEnabled()) return { ok: false, configured: false, message: 'Non configurato' };
    try {
      const calendarId = await ensureCalendar();
      return { ok: true, configured: true, calendarId, message: 'Collegato' };
    } catch (err) {
      return { ok: false, configured: true, message: err.message };
    }
  },
  createEvents: (events, planId) => cal('POST', '/events/bulk', { events, planId, source: 'moveo' }),
  updateEvent: (id, patch) => cal('PATCH', `/events/${encodeURIComponent(id)}`, patch),
  deletePlan: (planId) => cal('DELETE', `/plans/${encodeURIComponent(planId)}`),
  events: (from, to) => cal('GET', `/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  notify: (payload) => cal('POST', '/notify', payload),
};

// ======================================================= Home Assistant

export const haEnabled = () => !!config.ha.token;

async function ha(method, path, body) {
  const res = await fetch(`${config.ha.url}/api${path}`, {
    method,
    headers: { authorization: `Bearer ${config.ha.token}`, 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Home Assistant ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Actionable notification for the HA companion app (Android and iOS):
 * tapping it — or the "Inizia" button — opens the workout.
 */
async function haNotify({ title, body, url, tag }) {
  const results = [];
  for (const service of config.ha.notifyServices) {
    try {
      await ha('POST', `/services/notify/${service}`, {
        title,
        message: body,
        data: {
          url, // iOS
          clickAction: url, // Android
          tag,
          group: 'moveo',
          channel: 'Moveo',
          actions: [
            { action: 'URI', title: '▶ Inizia', uri: url },
          ],
        },
      });
      results.push({ channel: `notify.${service}`, ok: true });
    } catch (err) {
      results.push({ channel: `notify.${service}`, ok: false, error: err.message });
    }
  }
  return results;
}

/** Sends a notification on every configured channel (Calendary web push + HA companion app). */
export async function notifyAll({ haOnly = false, ...payload }) {
  const results = [];
  if (!haOnly && calendaryEnabled() && config.calendary.push) {
    try {
      const r = await calendary.notify(payload);
      results.push({ channel: 'calendary', ok: r.sent > 0 || r.failed === 0, sent: r.sent, failed: r.failed });
    } catch (err) {
      results.push({ channel: 'calendary', ok: false, error: err.message });
    }
  }
  if (haEnabled() && config.ha.notifyServices.length) results.push(...(await haNotify(payload)));
  for (const r of results) if (!r.ok) console.warn(`Notifica non inviata su ${r.channel}: ${r.error || 'nessun dispositivo'}`);
  return results;
}

/** Publishes a sensor (e.g. sensor.moveo_streak) for dashboards and automations. */
export async function setHaState(entityId, state, attributes) {
  if (!haEnabled() || !config.ha.sensors) return;
  try {
    await ha('POST', `/states/${entityId}`, { state: String(state), attributes });
  } catch (err) {
    console.warn(`Sensore ${entityId} non aggiornato: ${err.message}`);
  }
}

export async function haStatus() {
  if (!haEnabled()) return { ok: false, configured: false, message: 'API di Home Assistant non disponibile (fuori dal Supervisor?)' };
  try {
    await ha('GET', '/');
    return { ok: true, configured: true, notifyServices: config.ha.notifyServices, message: 'Collegato' };
  } catch (err) {
    return { ok: false, configured: true, message: err.message };
  }
}
