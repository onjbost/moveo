import fs from 'node:fs';
import * as content from './content.js';
import * as breaks from './breaks.js';
import { config } from './config.js';
import { getSetting } from './db.js';
import { calendary, haStatus, notifyAll } from './integrations.js';
import * as logs from './logs.js';
import * as plans from './plans.js';
import { addDays, httpError, isYmd, ymd } from './util.js';

const VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

export async function registerRoutes(app) {
  app.get('/health', async () => ({ ok: true }));

  // ------------------------------------------------------------ library
  app.get('/programs', async () => content.listPrograms());
  app.get('/programs/:id', async (req) => content.programDetail(req.params.id));
  app.delete('/programs/:id', async (req) => {
    content.deleteImported('program', req.params.id);
    return { ok: true };
  });
  app.get('/exercises', async () => content.listExercises());
  app.delete('/exercises/:id', async (req) => {
    content.deleteImported('exercise', req.params.id);
    return { ok: true };
  });

  app.get('/play/:programId/:sessionId', async (req) => {
    const week = Math.max(1, Math.round(Number(req.query.w) || 1));
    return content.playable(req.params.programId, req.params.sessionId, week);
  });

  app.post('/import', async (req) => content.importContent(req.body));
  app.get('/export', async (req, reply) => {
    const id = req.query.program ? String(req.query.program) : null;
    reply.header('content-disposition', `attachment; filename="moveo-${id || 'libreria'}.json"`);
    return content.exportContent(id);
  });

  // -------------------------------------------------------------- plans
  app.get('/plans', async () => plans.listPlans());
  app.post('/plans', async (req) => plans.createPlan(req.body || {}));
  app.get('/plans/:id', async (req) => plans.getPlan(req.params.id));
  app.post('/plans/:id/sync', async (req) => {
    await plans.syncPlan(req.params.id);
    return plans.getPlan(req.params.id);
  });
  app.delete('/plans/:id', async (req) => plans.deletePlan(req.params.id));
  app.post('/plans/preview', async (req) => {
    const b = req.body || {};
    const program = content.getProgram(b.programId);
    if (program.kind === 'collection') throw httpError(400, 'Le raccolte non si pianificano');
    const days = (b.days || []).map(Number);
    const perWeek = Math.max(...program.schedule.map((w) => w.sessions.length));
    if (days.length < perWeek) return { dates: [], perWeek };
    const start = isYmd(b.startDate) ? b.startDate : ymd(new Date());
    const startDow = new Date(`${start}T12:00`).getDay();
    days.sort((a, c) => ((a - startDow + 7) % 7) - ((c - startDow + 7) % 7));
    return { perWeek, dates: plans.computeSchedule(program, start, days) };
  });

  // ------------------------------------------------------------- today
  app.get('/today', async () => {
    const now = new Date();
    breaks.ensureToday(now);
    const today = ymd(now);
    return {
      date: today,
      sessionsToday: plans.sessionsBetween(today, today),
      upcoming: plans.upcomingSessions(today, 6),
      breaks: breaks.breaksOn(today),
      breakSettings: breaks.breakSettings(),
      paused: getSetting('breaks_paused_date') === today,
      stats: logs.stats(now),
      recent: logs.listLogs(5),
    };
  });

  app.get('/week', async (req) => {
    const from = isYmd(req.query.from) ? req.query.from : ymd(new Date());
    const to = ymd(addDays(new Date(`${from}T12:00`), 13));
    return { from, to, sessions: plans.sessionsBetween(from, to) };
  });

  // ------------------------------------------------------------- breaks
  app.get('/breaks/settings', async () => breaks.breakSettings());
  app.put('/breaks/settings', async (req) => breaks.saveBreakSettings(req.body || {}));
  app.post('/breaks/pause-today', async (req) => breaks.pauseToday(req.body?.paused !== false));
  app.post('/breaks/:id/snooze', async (req) => breaks.snoozeBreak(req.params.id, Number(req.body?.minutes) || 10));
  app.post('/breaks/:id/skip', async (req) => breaks.skipBreak(req.params.id));
  app.post('/breaks/test', async () => {
    const program = content.getProgram(breaks.BREAK_PROGRAM);
    const s = program.sessions[Math.floor(Math.random() * program.sessions.length)];
    return notifyAll({
      title: '🪑 Prova notifica Moveo',
      body: `Tocca per aprire "${s.title}"`,
      url: plans.playUrl(program.id, s.id),
      tag: `moveo-test-${Date.now()}`,
    });
  });

  // --------------------------------------------------------------- logs
  app.get('/logs', async (req) => logs.listLogs(Number(req.query.limit) || 100));
  app.post('/logs', async (req) => logs.addLog(req.body || {}));
  app.delete('/logs/:id', async (req) => {
    logs.deleteLog(req.params.id);
    return { ok: true };
  });
  app.get('/stats', async () => logs.stats());

  // ------------------------------------------------------------- status
  app.get('/status', async () => ({
    version: VERSION,
    publicUrl: config.publicUrl,
    calendary: await calendary.status(),
    homeAssistant: await haStatus(),
  }));
}
