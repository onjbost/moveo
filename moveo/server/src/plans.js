import crypto from 'node:crypto';
import { config } from './config.js';
import { db, transaction } from './db.js';
import { estimateSeconds, exerciseMap, expandSession, findProgram, getProgram, getSession } from './content.js';
import { calendary, calendaryEnabled, ensureCalendar } from './integrations.js';
import { addDays, httpError, isYmd, nowIso, parseYmd, ymd } from './util.js';

export const CATEGORY_EMOJI = { desk: '🪑', recovery: '🌿', yoga: '🧘', pilates: '⭕', calisthenics: '💪', surf: '🏄' };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const playUrl = (programId, sessionId, params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
  return `${config.publicUrl}/play/${programId}/${sessionId}${q.size ? `?${q}` : ''}`;
};

/**
 * Dates of the plan: every chosen weekday from startDate on, grouped in "weeks" of days.length slots.
 * Week k of the program uses the first N slots of group k (N = sessions that week).
 */
export function computeSchedule(program, startDate, days) {
  const slotsPerWeek = days.length;
  const needed = program.schedule.length * slotsPerWeek;
  const dates = [];
  for (let d = parseYmd(startDate); dates.length < needed; d = addDays(d, 1)) {
    if (days.includes(d.getDay())) dates.push(ymd(d));
  }
  const out = [];
  program.schedule.forEach((w, wi) => {
    w.sessions.forEach((sid, si) => out.push({ week: w.week, sessionId: sid, date: dates[wi * slotsPerWeek + si] }));
  });
  return out;
}

function mapPlan(r) {
  const program = findProgram(r.program_id);
  const sessions = db.prepare('SELECT * FROM plan_sessions WHERE plan_id = ? ORDER BY date, time').all(r.id).map(mapPlanSession);
  return {
    id: r.id,
    programId: r.program_id,
    programTitle: program?.title || r.program_id,
    category: program?.category || null,
    startDate: r.start_date,
    days: JSON.parse(r.days),
    time: r.time,
    reminderMinutes: r.reminder_minutes,
    calendaryStatus: r.calendary_status,
    createdAt: r.created_at,
    total: sessions.length,
    done: sessions.filter((s) => s.done).length,
    sessions,
  };
}

function mapPlanSession(r) {
  const program = findProgram(r.program_id);
  const session = program?.sessions.find((s) => s.id === r.session_id);
  return {
    id: r.id,
    planId: r.plan_id,
    programId: r.program_id,
    programTitle: program?.title || r.program_id,
    category: program?.category || null,
    sessionId: r.session_id,
    title: session?.title || r.session_id,
    week: r.week,
    weeks: program?.schedule?.length || null,
    date: r.date,
    time: r.time,
    durationMin: r.duration_min,
    synced: !!r.calendary_event_id,
    done: !!r.log_id,
    url: playUrl(r.program_id, r.session_id, { w: r.week, ps: r.id }),
  };
}

export const listPlans = () => db.prepare('SELECT * FROM plans ORDER BY created_at DESC').all().map(mapPlan);

export function getPlan(id) {
  const r = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
  if (!r) throw httpError(404, 'Piano non trovato');
  return mapPlan(r);
}

export function upcomingSessions(fromDate, limit = 10) {
  return db.prepare(`SELECT * FROM plan_sessions WHERE date >= ? AND log_id IS NULL ORDER BY date, time LIMIT ?`)
    .all(fromDate, limit).map(mapPlanSession);
}

export function sessionsBetween(from, to) {
  return db.prepare('SELECT * FROM plan_sessions WHERE date >= ? AND date <= ? ORDER BY date, time').all(from, to).map(mapPlanSession);
}

export async function createPlan(input) {
  const program = getProgram(input.programId);
  if (program.kind === 'collection') throw httpError(400, 'Questa è una raccolta di routine: avviale quando vuoi o usale come pause');
  const startDate = input.startDate || ymd(new Date());
  if (!isYmd(startDate)) throw httpError(400, 'Data di inizio non valida');
  const days = [...new Set((input.days || []).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const perWeek = Math.max(...program.schedule.map((w) => w.sessions.length));
  if (days.length < perWeek) throw httpError(400, `Questo programma prevede ${perWeek} sessioni a settimana: scegli almeno ${perWeek} giorni`);
  const time = String(input.time || '18:30');
  if (!TIME_RE.test(time)) throw httpError(400, 'Orario non valido (HH:MM)');
  const reminder = input.reminderMinutes === null || input.reminderMinutes === undefined || input.reminderMinutes === ''
    ? null : Math.max(0, Math.min(1440, Math.round(Number(input.reminderMinutes))));
  // Keep the weekday order starting from the start date's weekday, so the first session is the closest day.
  const startDow = parseYmd(startDate).getDay();
  days.sort((a, b) => ((a - startDow + 7) % 7) - ((b - startDow + 7) % 7));

  const ex = exerciseMap();
  const schedule = computeSchedule(program, startDate, days);
  const id = crypto.randomUUID();
  transaction(() => {
    db.prepare('INSERT INTO plans (id, program_id, start_date, days, time, reminder_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, program.id, startDate, JSON.stringify(days), time, reminder, nowIso());
    const ins = db.prepare(`INSERT INTO plan_sessions (id, plan_id, program_id, session_id, week, date, time, duration_min)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const s of schedule) {
      const steps = expandSession(program, getSession(program, s.sessionId), s.week, ex);
      ins.run(crypto.randomUUID(), id, program.id, s.sessionId, s.week, s.date, time, Math.max(5, Math.round(estimateSeconds(steps) / 60)));
    }
  });
  await syncPlan(id);
  return getPlan(id);
}

function eventFor(ps, program, calendarId, reminder) {
  const session = program.sessions.find((s) => s.id === ps.session_id);
  const start = new Date(`${ps.date}T${ps.time}:00`);
  const end = new Date(start.getTime() + ps.duration_min * 60e3);
  const names = session ? [...new Set(session.blocks.flatMap((b) => b.items.map((i) => i.exercise)))] : [];
  const ex = exerciseMap();
  return {
    calendarId,
    title: `${CATEGORY_EMOJI[program.category] || '🏃'} ${session?.title || ps.session_id}`,
    start: start.toISOString(),
    end: end.toISOString(),
    description: [
      `${program.title} · settimana ${ps.week} di ${program.schedule.length}`,
      session?.focus || '',
      names.length ? `Esercizi: ${names.map((n) => ex.get(n)?.name || n).join(', ')}` : '',
      'Creato da Moveo',
    ].filter(Boolean).join('\n'),
    reminderMinutes: reminder,
    linkUrl: playUrl(ps.program_id, ps.session_id, { w: ps.week, ps: ps.id }),
    linkLabel: 'Avvia allenamento',
  };
}

/** Creates the Calendary events still missing (first sync, or Calendary was offline). */
export async function syncPlan(planId) {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
  if (!plan) throw httpError(404, 'Piano non trovato');
  if (!calendaryEnabled()) {
    db.prepare('UPDATE plans SET calendary_status = ? WHERE id = ?').run('Calendary non configurato', planId);
    return;
  }
  const program = getProgram(plan.program_id);
  const missing = db.prepare('SELECT * FROM plan_sessions WHERE plan_id = ? AND calendary_event_id IS NULL AND date >= ? ORDER BY date')
    .all(planId, ymd(new Date()));
  try {
    if (missing.length) {
      const calendarId = await ensureCalendar();
      const created = await calendary.createEvents(missing.map((ps) => eventFor(ps, program, calendarId, plan.reminder_minutes)), `moveo:${planId}`);
      const upd = db.prepare('UPDATE plan_sessions SET calendary_event_id = ? WHERE id = ?');
      transaction(() => created.forEach((ev, i) => upd.run(ev.id, missing[i].id)));
    }
    db.prepare('UPDATE plans SET calendary_status = ? WHERE id = ?').run('ok', planId);
  } catch (err) {
    db.prepare('UPDATE plans SET calendary_status = ? WHERE id = ?').run(err.message.slice(0, 300), planId);
  }
}

export async function syncAllPlans() {
  for (const p of db.prepare("SELECT id FROM plans WHERE calendary_status IS NULL OR calendary_status != 'ok'").all()) {
    await syncPlan(p.id);
  }
}

export async function deletePlan(planId) {
  getPlan(planId);
  let calendaryResult = null;
  if (calendaryEnabled()) {
    try {
      calendaryResult = await calendary.deletePlan(`moveo:${planId}`);
    } catch (err) {
      calendaryResult = { error: err.message };
    }
  }
  db.prepare('DELETE FROM plans WHERE id = ?').run(planId);
  return { ok: true, calendary: calendaryResult };
}

/** Called when a workout of the plan is finished: ticks the Calendary event too. */
export async function markPlanSessionDone(planSessionId, logId) {
  const ps = db.prepare('SELECT * FROM plan_sessions WHERE id = ?').get(planSessionId);
  if (!ps) return;
  db.prepare('UPDATE plan_sessions SET log_id = ? WHERE id = ?').run(logId, planSessionId);
  if (ps.calendary_event_id && calendaryEnabled()) {
    const program = findProgram(ps.program_id);
    const session = program?.sessions.find((s) => s.id === ps.session_id);
    try {
      await calendary.updateEvent(ps.calendary_event_id, {
        title: `✓ ${CATEGORY_EMOJI[program?.category] || ''} ${session?.title || ps.session_id}`.replace(/\s+/g, ' '),
        reminderMinutes: null,
      });
    } catch (err) {
      console.warn('Evento Calendary non aggiornato:', err.message);
    }
  }
}
