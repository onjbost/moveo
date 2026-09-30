import crypto from 'node:crypto';
import { db } from './db.js';
import { findProgram } from './content.js';
import { BREAK_PROGRAM, breaksOn, markBreakDone } from './breaks.js';
import { setHaState } from './integrations.js';
import { markPlanSessionDone, upcomingSessions } from './plans.js';
import { addDays, httpError, startOfDay, ymd } from './util.js';

function mapLog(r) {
  return {
    id: r.id,
    programId: r.program_id,
    sessionId: r.session_id,
    title: r.title,
    category: r.category,
    planSessionId: r.plan_session_id,
    breakId: r.break_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    durationSec: r.duration_sec,
    completion: r.completion,
    effort: r.effort,
    note: r.note || '',
  };
}

export async function addLog(input) {
  const program = findProgram(String(input.programId || ''));
  if (!program) throw httpError(400, 'Programma sconosciuto');
  const session = program.sessions.find((s) => s.id === input.sessionId);
  if (!session) throw httpError(400, 'Sessione sconosciuta');
  const duration = Math.max(0, Math.min(6 * 3600, Math.round(Number(input.durationSec) || 0)));
  const completion = Math.max(0, Math.min(1, Number(input.completion ?? 1)));
  const effort = input.effort === null || input.effort === undefined || input.effort === '' ? null
    : Math.max(1, Math.min(10, Math.round(Number(input.effort))));
  const finished = new Date();
  const started = input.startedAt && !Number.isNaN(Date.parse(input.startedAt))
    ? new Date(input.startedAt) : new Date(finished.getTime() - duration * 1000);
  const id = crypto.randomUUID();
  const planSessionId = input.planSessionId ? String(input.planSessionId) : null;
  const breakId = input.breakId ? String(input.breakId) : null;
  db.prepare(`INSERT INTO logs (id, program_id, session_id, title, category, plan_session_id, break_id, started_at,
      finished_at, duration_sec, completion, effort, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, program.id, session.id, session.title, program.category, planSessionId, breakId,
    started.toISOString(), finished.toISOString(), duration, completion, effort, String(input.note || '').slice(0, 1000),
  );
  // Half a session still counts: the goal is showing up.
  if (completion >= 0.5) {
    if (planSessionId) await markPlanSessionDone(planSessionId, id);
    if (breakId) markBreakDone(breakId);
    else if (program.id === BREAK_PROGRAM) {
      // a spontaneous desk routine closes the next open break of today
      const open = db.prepare("SELECT id FROM breaks WHERE date = ? AND status IN ('sent', 'pending') AND due_at <= ? ORDER BY slot LIMIT 1")
        .get(ymd(finished), new Date(finished.getTime() + 30 * 60e3).toISOString());
      if (open) markBreakDone(open.id);
    }
  }
  publishSensors().catch(() => {});
  return mapLog(db.prepare('SELECT * FROM logs WHERE id = ?').get(id));
}

export function listLogs(limit = 100) {
  return db.prepare('SELECT * FROM logs ORDER BY finished_at DESC LIMIT ?').all(Math.min(500, limit)).map(mapLog);
}

export function deleteLog(id) {
  const res = db.prepare('DELETE FROM logs WHERE id = ?').run(id);
  if (!res.changes) throw httpError(404, 'Allenamento non trovato');
  db.prepare('UPDATE plan_sessions SET log_id = NULL WHERE log_id = ?').run(id);
}

/** Monday of the week containing d. */
function weekStart(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function stats(now = new Date()) {
  const days = new Set(db.prepare('SELECT finished_at FROM logs WHERE completion >= 0.5').all().map((r) => ymd(r.finished_at)));
  // Streak: consecutive days with at least one workout or break, ending today (or yesterday, if today is still open).
  let streak = 0;
  let cursor = startOfDay(now);
  if (!days.has(ymd(cursor))) cursor = addDays(cursor, -1);
  while (days.has(ymd(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const weeks = [];
  const thisWeek = weekStart(now);
  for (let i = 7; i >= 0; i -= 1) {
    const from = addDays(thisWeek, -7 * i);
    const to = addDays(from, 7);
    const rows = db.prepare('SELECT category, duration_sec FROM logs WHERE finished_at >= ? AND finished_at < ?')
      .all(from.toISOString(), to.toISOString());
    const byCategory = {};
    for (const r of rows) byCategory[r.category] = (byCategory[r.category] || 0) + r.duration_sec / 60;
    weeks.push({
      week: ymd(from),
      minutes: Math.round(rows.reduce((s, r) => s + r.duration_sec, 0) / 60),
      sessions: rows.length,
      byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, Math.round(v)])),
    });
  }
  const today = breaksOn(ymd(now));
  return {
    streak,
    week: weeks[weeks.length - 1],
    weeks,
    total: db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(duration_sec), 0) AS s FROM logs').get(),
    breaksToday: { done: today.filter((b) => b.status === 'done').length, total: today.length },
  };
}

/** sensor.moveo_* for Home Assistant dashboards and automations. */
export async function publishSensors() {
  const s = stats();
  const next = upcomingSessions(ymd(new Date()), 1)[0];
  await setHaState('sensor.moveo_streak', s.streak, {
    friendly_name: 'Moveo serie di giorni attivi', unit_of_measurement: 'giorni', icon: 'mdi:fire',
  });
  await setHaState('sensor.moveo_minutes_week', s.week.minutes, {
    friendly_name: 'Moveo minuti questa settimana', unit_of_measurement: 'min', icon: 'mdi:timer-outline',
    sessions: s.week.sessions, state_class: 'measurement',
  });
  await setHaState('sensor.moveo_breaks_today', s.breaksToday.done, {
    friendly_name: 'Moveo pause fatte oggi', icon: 'mdi:human-handsup', planned: s.breaksToday.total,
  });
  await setHaState('sensor.moveo_next_session', next ? new Date(`${next.date}T${next.time}:00`).toISOString() : 'unknown', {
    friendly_name: 'Moveo prossimo allenamento', device_class: 'timestamp', icon: 'mdi:calendar-clock',
    title: next?.title, program: next?.programTitle, url: next?.url, duration_min: next?.durationMin,
  });
}

