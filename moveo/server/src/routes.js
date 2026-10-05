import fs from 'node:fs';
import * as categories from './categories.js';
import * as content from './content.js';
import * as breaks from './breaks.js';
import { config } from './config.js';
import { getSetting } from './db.js';
import { calendary, haStatus, notifyAll } from './integrations.js';
import * as logs from './logs.js';
import * as plans from './plans.js';
import { signTicket, suiteSecretOk } from './suite.js';
import * as gen from './generator.js';
import * as attachments from './attachments.js';
import { parseYouTube, resolvePlaylist, watchUrl } from './youtube.js';
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
  app.patch('/programs/:id', async (req) => {
    const p = content.updateProgramMeta(req.params.id, req.body || {});
    plans.retitleProgramEvents(p.id).catch(() => {}); // upcoming Calendary events get the new name/emoji
    return p;
  });
  app.get('/exercises', async () => content.listExercises());

  // ------------------------------------------------------------ categories (built-in + yours)
  app.get('/categories', async () => categories.list());
  app.post('/categories', async (req) => categories.create(req.body));
  app.patch('/categories/:id', async (req) => categories.update(req.params.id, req.body));
  app.delete('/categories/:id', async (req) => {
    categories.remove(req.params.id);
    return { ok: true };
  });
  app.delete('/exercises/:id', async (req) => {
    content.deleteImported('exercise', req.params.id);
    return { ok: true };
  });

  app.put('/exercises/:id/video', async (req) => content.setExerciseVideo(req.params.id, req.body?.url));

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
      proposal: gen.listProposals().filter((x) => x.status === 'pending').map((x) => ({ id: x.id, title: x.program.title, summary: x.program.summary || '' }))[0] || null,
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

  // ------------------------------------------------------------- next program (AI / rules)
  app.get('/generator', async () => ({
    ai: gen.aiConfigured(),
    model: config.ai.model,
    settings: gen.genSettings(),
    nearEnd: gen.plansNearEnd().map(({ s }) => s),
    proposals: gen.listProposals(),
  }));
  app.put('/generator/settings', async (req) => gen.saveGenSettings(req.body || {}));
  app.post('/generator/propose', async (req) => gen.propose({ request: req.body?.request, planId: req.body?.planId, engine: req.body?.engine }));
  app.get('/generator/proposals/:id', async (req) => gen.getProposal(req.params.id));
  app.post('/generator/proposals/:id/approve', async (req) => gen.approve(req.params.id, req.body || {}));
  app.post('/generator/proposals/:id/reject', async (req) => gen.reject(req.params.id));

  // ------------------------------------------------------------- external programs (links)
  /** A program that lives on another site (e.g. DAREBEE): Moveo only plans it and tracks it, the content stays there. */
  app.post('/external', async (req) => {
    const b = req.body || {};
    const url = String(b.url || '').trim();
    if (!/^https:\/\//i.test(url)) throw httpError(400, 'Serve il link https:// del programma');
    const title = String(b.title || '').trim().slice(0, 100);
    if (!title) throw httpError(400, 'Serve il nome del programma');
    const days = Math.round(Number(b.days));
    const perWeek = Math.round(Number(b.perWeek));
    if (!(days >= 1 && days <= 120)) throw httpError(400, 'Numero di giorni tra 1 e 120');
    if (!(perWeek >= 1 && perWeek <= 7)) throw httpError(400, 'Sessioni a settimana tra 1 e 7');
    const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'esterno';
    let id = `ext-${slug}`;
    for (let k = 2; content.findProgram(id); k += 1) id = `ext-${slug}-${k}`;
    const host = new URL(url).hostname.replace(/^www\./, '');
    const sessions = Array.from({ length: days }, (_, i) => ({ id: `giorno-${i + 1}`, title: `Giorno ${i + 1}` }));
    const schedule = [];
    for (let i = 0; i < days; i += perWeek) schedule.push({ week: schedule.length + 1, sessions: sessions.slice(i, i + perWeek).map((s) => s.id) });
    return content.saveProgram({
      id,
      title,
      category: categories.forProgram(b.category, 'calisthenics'),
      kind: 'external',
      url,
      minutes: Math.max(5, Math.min(180, Math.round(Number(b.minutes) || 30))),
      summary: `Programma su ${host}: Moveo lo mette in calendario e tiene traccia delle sessioni, il contenuto resta sul sito originale.`,
      description: String(b.notes || '').slice(0, 1000),
      sessions,
      schedule,
    }, 'external');
  });

  // ------------------------------------------------------------- personal attachments of external programs
  // PDF or posters downloaded by the user from the author's site: kept in /data and shown unchanged.
  app.addContentTypeParser(Object.keys(attachments.MIME), { parseAs: 'buffer', bodyLimit: attachments.MAX_BYTES }, (req, body, done) => done(null, body));
  const externalProgram = (id) => {
    const p = content.findProgram(id);
    if (!p) throw httpError(404, 'Programma non trovato');
    if (p.kind !== 'external') throw httpError(400, 'Gli allegati sono solo per i programmi esterni');
    return p;
  };
  app.get('/programs/:id/attachments', async (req) => {
    externalProgram(req.params.id);
    return attachments.list(req.params.id);
  });
  app.put('/programs/:id/attachments/:scope', { bodyLimit: attachments.MAX_BYTES }, async (req) => {
    const p = externalProgram(req.params.id);
    const scope = req.params.scope;
    if (scope !== '_' && !p.sessions.some((s) => s.id === scope)) throw httpError(404, 'Sessione non trovata');
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim();
    let name = 'allegato';
    try { name = decodeURIComponent(String(req.headers['x-file-name'] || name)); } catch { /* keep default */ }
    return attachments.save(p.id, scope, { mime, buffer: req.body, name, firstPage: req.query.firstPage });
  });
  app.patch('/programs/:id/attachments/:scope', async (req) => {
    externalProgram(req.params.id);
    return attachments.setFirstPage(req.params.id, req.params.scope, req.body?.firstPage);
  });
  app.delete('/programs/:id/attachments/:scope', async (req) => {
    externalProgram(req.params.id);
    attachments.remove(req.params.id, req.params.scope);
    return { ok: true };
  });
  app.get('/programs/:id/attachments/:scope/file', async (req, reply) => {
    const f = attachments.filePath(req.params.id, req.params.scope);
    reply.header('Content-Type', f.mime);
    reply.header('Cache-Control', 'private, max-age=31536000, immutable');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Content-Disposition', 'inline');
    return reply.send(fs.createReadStream(f.path));
  });

  // ------------------------------------------------------------- YouTube playlists → plan
  app.post('/youtube/resolve', async (req) => resolvePlaylist(req.body?.url));

  /** Builds a program from chosen playlist videos: one session per video, cycled over the weeks. */
  app.post('/youtube/program', async (req) => {
    const b = req.body || {};
    const p = parseYouTube(b.url);
    if (!p?.playlistId) throw httpError(400, 'Serve il link di una playlist YouTube');
    const title = String(b.title || '').trim().slice(0, 100);
    if (!title) throw httpError(400, 'Serve il nome del programma');
    const videos = (Array.isArray(b.videos) ? b.videos : []).slice(0, 200).map((v, i) => ({
      index: Math.round(Number(v.index)) || i + 1,
      videoId: typeof v.videoId === 'string' && /^[A-Za-z0-9_-]{6,20}$/.test(v.videoId) ? v.videoId : null,
      title: String(v.title || `Video ${i + 1}`).trim().slice(0, 120),
      minutes: v.minutes ? Math.max(1, Math.min(180, Math.round(Number(v.minutes)))) : null,
    }));
    if (!videos.length) throw httpError(400, 'Scegli almeno un video');
    const perWeek = Math.round(Number(b.perWeek));
    if (!(perWeek >= 1 && perWeek <= 7)) throw httpError(400, 'Sessioni a settimana tra 1 e 7');
    const weeks = Math.max(1, Math.min(26, Math.round(Number(b.weeks)) || Math.ceil(videos.length / perWeek)));
    const minutes = Math.max(5, Math.min(180, Math.round(Number(b.minutes)) || 20));
    const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'playlist';
    let id = `yt-${slug}`;
    for (let k = 2; content.findProgram(id); k += 1) id = `yt-${slug}-${k}`;
    const sessions = videos.map((v, i) => ({
      id: `video-${i + 1}`,
      title: v.title,
      ...(v.minutes ? { minutes: v.minutes } : {}),
      video: v.videoId ? { videoId: v.videoId, playlistId: p.playlistId } : { playlistId: p.playlistId, index: v.index },
    }));
    const schedule = [];
    let n = 0;
    for (let w = 1; w <= weeks; w += 1) {
      const list = [];
      for (let d = 0; d < perWeek; d += 1) list.push(sessions[(n++) % sessions.length].id);
      schedule.push({ week: w, sessions: list });
    }
    return content.saveProgram({
      id,
      title,
      category: categories.forProgram(b.category, 'yoga'),
      kind: 'external',
      provider: 'youtube',
      url: watchUrl({ playlistId: p.playlistId }),
      minutes,
      summary: `Playlist YouTube trasformata in piano: ${videos.length} video, ${perWeek} sessioni a settimana per ${weeks} settimane.`,
      description: String(b.notes || '').slice(0, 1000),
      sessions,
      schedule,
    }, 'external');
  });

  // ------------------------------------------------------------- suite (Calendary)
  /** A planned session as Calendary shows it (path opens the player directly). */
  const pick = (s) => s && ({
    title: s.title, programTitle: s.programTitle, category: s.category, emoji: categories.emoji(s.category), date: s.date, time: s.time,
    durationMin: s.durationMin, week: s.week, weeks: s.weeks,
    path: `/play/${s.programId}/${s.sessionId}?w=${s.week}&ps=${s.id}`,
  });

  /** Compact summary for Calendary's dashboard and kiosk card (Bearer: shared suite token). */
  app.get('/suite/today', async () => {
    const now = new Date();
    breaks.ensureToday(now);
    const today = ymd(now);
    const todays = plans.sessionsBetween(today, today);
    const upcoming = plans.upcomingSessions(today, 3);
    const list = breaks.breaksOn(today);
    const open = list.find((b) => b.status === 'sent');
    const nextBreak = list.find((b) => b.status === 'pending');
    const st = logs.stats(now);
    const relPath = (u) => u.slice(config.publicUrl.length);
    return {
      date: today,
      session: pick(todays.find((s) => !s.done)) || null,
      next: pick(upcoming.find((s) => s.date !== today) || null) || null,
      doneToday: logs.listLogs(20).filter((l) => ymd(new Date(l.finishedAt)) === today && l.programId !== breaks.BREAK_PROGRAM)
        .map((l) => ({ title: l.title, category: l.category })),
      breaks: {
        done: st.breaksToday.done,
        total: st.breaksToday.total,
        paused: getSetting('breaks_paused_date') === today,
        open: open ? { title: open.title, path: relPath(open.url) } : null,
        next: nextBreak ? { title: nextBreak.title, dueAt: nextBreak.dueAt, path: relPath(nextBreak.url) } : null,
      },
      streak: st.streak,
      minutesWeek: st.week.minutes,
    };
  });

  /**
   * Calendary's tablet "Moveo" tab: last workouts (desk breaks excluded), next planned sessions and the programs,
   * the planned ones first. Same Bearer token as /suite/today.
   */
  app.get('/suite/overview', async () => {
    const today = ymd(new Date());
    const planned = new Set(plans.listPlans().filter((p) => p.done < p.total).map((p) => p.programId));
    const recent = logs.listLogs(60).filter((l) => l.programId !== breaks.BREAK_PROGRAM).slice(0, 15).map((l) => ({
      title: l.title,
      programTitle: content.findProgram(l.programId)?.title || '',
      category: l.category,
      emoji: categories.emoji(l.category),
      finishedAt: l.finishedAt,
      durationSec: l.durationSec,
      completion: l.completion,
    }));
    const upcoming = plans.upcomingSessions(today, 12).filter((s) => !s.done).map(pick);
    const programs = content.listPrograms()
      .filter((p) => p.id !== breaks.BREAK_PROGRAM)
      .map((p) => ({
        id: p.id, title: p.title, category: p.category, emoji: categories.emoji(p.category), level: p.level, minutes: p.minutes,
        weeks: p.weeks, summary: p.summary, path: `/programmi/${p.id}`, planned: planned.has(p.id),
      }))
      .sort((a, b) => Number(b.planned) - Number(a.planned));
    return { recent, upcoming, programs };
  });

  /** Link to Calendary that signs you in automatically (single-use ticket, valid 2 minutes). */
  app.post('/suite/link', async (req) => {
    if (!suiteSecretOk()) throw httpError(400, 'Imposta calendary_token per collegare Calendary');
    const ticket = signTicket('moveo', req.body?.next);
    return { url: `${config.calendary.publicUrl}/sso?t=${encodeURIComponent(ticket)}` };
  });

  // ------------------------------------------------------------- status
  app.get('/status', async () => ({
    version: VERSION,
    publicUrl: config.publicUrl,
    calendaryPublicUrl: config.calendary.publicUrl,
    suite: suiteSecretOk(),
    calendary: await calendary.status(),
    homeAssistant: await haStatus(),
  }));
}
