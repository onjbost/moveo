import crypto from 'node:crypto';
import { config } from './config.js';
import { db, getSetting, setSetting } from './db.js';
import { exerciseMap, findProgram } from './content.js';
import { calendary, calendaryEnabled, haEnabled, notifyAll } from './integrations.js';
import { categoryEmoji, playUrl, upcomingSessions } from './plans.js';
import { httpError, nowIso, ymd } from './util.js';

export const BREAK_PROGRAM = 'pause-scrivania';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_BREAK_SETTINGS = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  start: '09:30',
  end: '18:00',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  count: 4,
  skipBusy: true,
  sessionReminder: 15,
};

export function breakSettings() {
  try {
    return { ...DEFAULT_BREAK_SETTINGS, ...JSON.parse(getSetting('break_settings') || '{}') };
  } catch {
    return { ...DEFAULT_BREAK_SETTINGS };
  }
}

export function saveBreakSettings(patch) {
  const next = { ...breakSettings(), ...patch };
  next.enabled = !!next.enabled;
  next.skipBusy = !!next.skipBusy;
  next.days = [...new Set((next.days || []).map(Number))].filter((d) => d >= 0 && d <= 6).sort();
  next.count = Math.max(1, Math.min(10, Math.round(Number(next.count) || 4)));
  next.sessionReminder = Math.max(0, Math.min(240, Math.round(Number(next.sessionReminder) || 0)));
  for (const k of ['start', 'end', 'lunchStart', 'lunchEnd']) {
    if (next[k] && !TIME_RE.test(next[k])) throw httpError(400, `Orario non valido: ${next[k]}`);
  }
  if (toMin(next.end) - toMin(next.start) < 60) throw httpError(400, 'La finestra di lavoro deve durare almeno un\'ora');
  setSetting('break_settings', JSON.stringify(next));
  // Rebuild today's future slots with the new settings.
  db.prepare("DELETE FROM breaks WHERE date = ? AND status IN ('pending', 'missed')").run(ymd(new Date()));
  ensureToday();
  return next;
}

const toMin = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/** Evenly spread slot minutes in the work window, skipping the lunch break. */
export function slotMinutes(s) {
  const start = toMin(s.start);
  const end = toMin(s.end);
  let segments = [[start, end]];
  if (s.lunchStart && s.lunchEnd && toMin(s.lunchEnd) > toMin(s.lunchStart)) {
    const ls = toMin(s.lunchStart);
    const le = toMin(s.lunchEnd);
    segments = [[start, Math.min(end, ls)], [Math.max(start, le), end]].filter(([a, b]) => b > a);
  }
  const total = segments.reduce((sum, [a, b]) => sum + (b - a), 0);
  const out = [];
  for (let i = 0; i < s.count; i += 1) {
    let pos = ((i + 0.5) * total) / s.count;
    for (const [a, b] of segments) {
      if (pos <= b - a) {
        out.push(Math.round((a + pos) / 5) * 5); // round to 5 minutes
        break;
      }
      pos -= b - a;
    }
  }
  return out;
}

function nextBreakSession() {
  const program = findProgram(BREAK_PROGRAM);
  if (!program) return null;
  const ids = program.sessions.map((x) => x.id);
  const i = Number(getSetting('break_rotation') || 0);
  setSetting('break_rotation', (i + 1) % ids.length);
  return ids[i % ids.length];
}

/** Creates today's break slots (once per day) according to the settings. */
export function ensureToday(now = new Date()) {
  const s = breakSettings();
  const date = ymd(now);
  if (!s.enabled || !s.days.includes(now.getDay())) return;
  if (getSetting('breaks_paused_date') === date) return;
  const existing = new Set(db.prepare('SELECT slot FROM breaks WHERE date = ?').all(date).map((r) => r.slot));
  const ins = db.prepare(`INSERT OR IGNORE INTO breaks (id, date, slot, planned_at, due_at, status, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  // "slot" is the minute of the day: changing the settings never collides with breaks already done.
  slotMinutes(s).forEach((min) => {
    const slot = min;
    if (existing.has(slot)) return;
    const at = new Date(now);
    at.setHours(Math.floor(min / 60), min % 60, 0, 0);
    // A slot already long gone when the server starts is recorded as missed, without notifying.
    const status = at.getTime() < now.getTime() - 20 * 60e3 ? 'missed' : 'pending';
    const session = nextBreakSession();
    if (!session) return;
    ins.run(crypto.randomUUID(), date, slot, at.toISOString(), at.toISOString(), status, session);
  });
}

function mapBreak(r) {
  const program = findProgram(BREAK_PROGRAM);
  const session = program?.sessions.find((x) => x.id === r.session_id);
  return {
    id: r.id,
    date: r.date,
    plannedAt: r.planned_at,
    dueAt: r.due_at,
    status: r.status,
    postponed: r.postponed,
    sessionId: r.session_id,
    title: session?.title || r.session_id,
    url: playUrl(BREAK_PROGRAM, r.session_id, { b: r.id }),
  };
}

export function breaksOn(date) {
  return db.prepare('SELECT * FROM breaks WHERE date = ? ORDER BY slot').all(date).map(mapBreak);
}

export function getBreak(id) {
  const r = db.prepare('SELECT * FROM breaks WHERE id = ?').get(id);
  if (!r) throw httpError(404, 'Pausa non trovata');
  return mapBreak(r);
}

export function snoozeBreak(id, minutes = 10) {
  const b = getBreak(id);
  const due = new Date(Date.now() + minutes * 60e3).toISOString();
  db.prepare("UPDATE breaks SET due_at = ?, status = 'pending' WHERE id = ?").run(due, b.id);
  return getBreak(id);
}

export function skipBreak(id) {
  db.prepare("UPDATE breaks SET status = 'skipped' WHERE id = ? AND status != 'done'").run(getBreak(id).id);
  return getBreak(id);
}

export function markBreakDone(id) {
  db.prepare("UPDATE breaks SET status = 'done', done_at = ? WHERE id = ?").run(nowIso(), id);
}

export function pauseToday(paused = true) {
  const date = ymd(new Date());
  if (paused) {
    setSetting('breaks_paused_date', date);
    db.prepare("UPDATE breaks SET status = 'skipped' WHERE date = ? AND status = 'pending'").run(date);
  } else {
    setSetting('breaks_paused_date', '');
    db.prepare("DELETE FROM breaks WHERE date = ? AND status = 'skipped' AND due_at > ?").run(date, nowIso());
    ensureToday();
  }
  return { paused, breaks: breaksOn(date) };
}

/** True when Calendary has a busy event (a meeting…) going on right now, apart from our own workouts. */
async function busyNow(now) {
  if (!calendaryEnabled()) return false;
  try {
    const from = new Date(now.getTime() - 60e3).toISOString();
    const to = new Date(now.getTime() + 60e3).toISOString();
    const events = await calendary.events(from, to);
    const t = now.getTime();
    return events.some((e) => !e.allDay && e.busy !== false && e.source !== 'moveo'
      && Date.parse(e.start) <= t && Date.parse(e.end) > t);
  } catch {
    return false; // if Calendary is down, better a break too many than none
  }
}

const recentWorkout = (now, minutes) => !!db.prepare('SELECT 1 FROM logs WHERE finished_at > ? LIMIT 1')
  .get(new Date(now.getTime() - minutes * 60e3).toISOString());

export async function sendBreak(row) {
  const b = mapBreak(row);
  const program = findProgram(BREAK_PROGRAM);
  const session = program?.sessions.find((x) => x.id === row.session_id);
  const first = session ? [...new Set(session.blocks.flatMap((bl) => bl.items.map((i) => i.exercise)))].slice(0, 3) : [];
  const ex = exerciseMap();
  const results = await notifyAll({
    title: `🪑 Pausa movimento: ${b.title}`,
    body: `${first.map((id) => ex.get(id)?.name || id).join(' · ')}\nBastano pochi minuti: alzati dalla sedia.`,
    url: b.url,
    tag: `moveo-break-${b.id}`,
    important: false,
  });
  db.prepare("UPDATE breaks SET status = 'sent', sent_at = ? WHERE id = ?").run(nowIso(), row.id);
  return results;
}

async function checkBreaks(now) {
  ensureToday(now);
  const s = breakSettings();
  const date = ymd(now);
  const due = db.prepare("SELECT * FROM breaks WHERE date = ? AND status = 'pending' AND due_at <= ? ORDER BY slot")
    .all(date, now.toISOString());
  for (const row of due) {
    if (Date.parse(row.due_at) < now.getTime() - 20 * 60e3) {
      db.prepare("UPDATE breaks SET status = 'missed' WHERE id = ?").run(row.id);
      continue;
    }
    if (recentWorkout(now, 45)) {
      db.prepare("UPDATE breaks SET status = 'skipped' WHERE id = ?").run(row.id);
      continue;
    }
    if (s.skipBusy && row.postponed < 4 && (await busyNow(now))) {
      const next = new Date(now.getTime() + 15 * 60e3).toISOString();
      db.prepare('UPDATE breaks SET due_at = ?, postponed = postponed + 1 WHERE id = ?').run(next, row.id);
      continue;
    }
    await sendBreak(row);
  }
  // Sent but never started within 90 minutes: missed.
  db.prepare("UPDATE breaks SET status = 'missed' WHERE status = 'sent' AND sent_at < ?")
    .run(new Date(now.getTime() - 90 * 60e3).toISOString());
}

/**
 * Plan sessions: Calendary already sends its own web push for the event reminder.
 * Here we only add the Home Assistant companion-app notification, if configured.
 */
async function checkSessionReminders(now) {
  if (!haEnabled() || !config.ha.notifyServices.length) return;
  const lead = breakSettings().sessionReminder;
  for (const ps of upcomingSessions(ymd(now), 5)) {
    const start = new Date(`${ps.date}T${ps.time}:00`).getTime();
    const fireAt = start - lead * 60e3;
    if (now.getTime() < fireAt || now.getTime() > start + 30 * 60e3) continue;
    const key = `notified:${ps.id}`;
    if (getSetting(key)) continue;
    setSetting(key, nowIso());
    await notifyAll({
      title: `${categoryEmoji(ps.category) || '🏃'} ${lead ? `Tra ${lead} min` : 'Adesso'}: ${ps.title}`,
      body: `${ps.programTitle} · settimana ${ps.week} · circa ${ps.durationMin} min`,
      url: ps.url,
      tag: `moveo-session-${ps.id}`,
      important: true,
      haOnly: true,
    });
  }
}

let running = false;
export async function tick(now = new Date()) {
  if (running) return;
  running = true;
  try {
    await checkBreaks(now);
    await checkSessionReminders(now);
  } catch (err) {
    console.error('Scheduler pause:', err);
  } finally {
    running = false;
  }
}

export function startBreakScheduler() {
  setTimeout(tick, 10_000);
  setInterval(tick, 60_000);
}
