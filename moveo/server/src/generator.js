import crypto from 'node:crypto';
import * as categories from './categories.js';
import { config } from './config.js';
import { db, getSetting, setSetting } from './db.js';
import {
  detailOf, estimateSeconds, exerciseMap, expandSession, findProgram, getProgram, listExercises,
  saveProgram, validateProgram,
} from './content.js';
import { notifyAll } from './integrations.js';
import { createPlan } from './plans.js';
import { httpError, nowIso, ymd } from './util.js';

// "Next program" generator. When a plan is nearly over, Moveo proposes the next one:
//  - with AI (Gemini via the same OpenAI-compatible API as Calendary): varied programs, follows requests;
//  - with progression rules as fallback (no key, quota exhausted, or the AI proposal fails the checks).
// Every proposal passes the same safety checks and must be approved by the user before it becomes a plan.

const AI_TIMEOUT_MS = 60_000;
const MAX_WEEKLY_GROWTH = 1.25; // first week vs last week of the previous program
const MAX_WEEK_TO_WEEK = 1.2;

// Harder variant of an exercise, used by the rules (and suggested to the AI).
export const HARDER = {
  'wall-push-up': 'incline-push-up',
  'incline-push-up': 'knee-push-up',
  'knee-push-up': 'push-up',
  'sit-to-stand': 'squat',
  'squat': 'split-squat',
  'reverse-lunge': 'rotational-lunge',
  'glute-bridge': 'single-leg-bridge',
  'dead-bug': 'hollow-hold',
  'march-in-place': 'mountain-climber',
  'chair-pose': 'wall-sit',
  'pop-up-slow': 'pop-up',
  'plank': 'shoulder-taps',
  'superman': 'pilates-swimming',
  'toe-taps': 'single-leg-stretch',
  'roll-down': 'spine-stretch',
  'clamshell': 'side-leg-lift',
  'bird-dog': 'bear-crawl',
};

// Isometric holds: a variant switching to one of these is timed, not counted in reps.
const HOLDS = new Set(['hollow-hold', 'wall-sit', 'plank', 'side-plank']);

// ------------------------------------------------------------------ settings

export const DEFAULT_GEN_SETTINGS = {
  auto: true,
  goals: 'Migliorare forza, resistenza di remata e tecnica nel surf; ridurre la rigidità di collo e spalle dovuta al lavoro d\'ufficio; essere costante.',
  maxMinutes: 35,
  sessionsPerWeek: 3,
  categories: ['surf', 'yoga', 'calisthenics', 'pilates', 'recovery'],
};

export function genSettings() {
  try {
    return { ...DEFAULT_GEN_SETTINGS, ...JSON.parse(getSetting('generator_settings') || '{}') };
  } catch {
    return { ...DEFAULT_GEN_SETTINGS };
  }
}

export function saveGenSettings(patch) {
  const next = { ...genSettings(), ...patch };
  next.auto = !!next.auto;
  next.goals = String(next.goals || '').slice(0, 1000);
  next.maxMinutes = Math.max(10, Math.min(90, Math.round(Number(next.maxMinutes) || 35)));
  next.sessionsPerWeek = Math.max(1, Math.min(6, Math.round(Number(next.sessionsPerWeek) || 3)));
  next.categories = (next.categories || []).filter((c) => categories.isCategory(c) && c !== 'desk');
  setSetting('generator_settings', JSON.stringify(next));
  return next;
}

export const aiConfigured = () => !!config.ai.apiKey;

// ------------------------------------------------------------------ history

function planSummary(planRow) {
  const rows = db.prepare(`SELECT ps.*, l.effort, l.completion, l.note FROM plan_sessions ps
    LEFT JOIN logs l ON l.id = ps.log_id WHERE ps.plan_id = ? ORDER BY ps.date`).all(planRow.id);
  const today = ymd(new Date());
  const done = rows.filter((r) => r.log_id);
  const due = rows.filter((r) => r.date < today || r.log_id);
  const efforts = done.map((r) => r.effort).filter((e) => e);
  const avg = (a) => (a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null);
  return {
    planId: planRow.id,
    programId: planRow.program_id,
    sessionsPerWeek: JSON.parse(planRow.days).length,
    total: rows.length,
    done: done.length,
    skipped: due.length - done.length,
    adherence: due.length ? Math.round((done.length / due.length) * 100) / 100 : null,
    avgEffort: avg(efforts),
    avgCompletion: avg(done.map((r) => r.completion)),
    notes: done.map((r) => r.note).filter(Boolean).slice(-6),
    lastDate: rows[rows.length - 1]?.date || null,
  };
}

/** Plans whose program is (almost) over: at least 80% of sessions done or past their last date. */
export function plansNearEnd() {
  const today = ymd(new Date());
  return db.prepare('SELECT * FROM plans ORDER BY created_at DESC').all()
    .map((p) => ({ row: p, s: planSummary(p) }))
    .filter(({ s }) => s.total && (s.done / s.total >= 0.8 || (s.lastDate && s.lastDate < today)));
}

function recentMinutesByCategory(days = 42) {
  const since = new Date(Date.now() - days * 86400e3).toISOString();
  const out = {};
  for (const r of db.prepare('SELECT category, duration_sec FROM logs WHERE finished_at > ?').all(since)) {
    out[r.category] = (out[r.category] || 0) + Math.round(r.duration_sec / 60);
  }
  return out;
}

/** "progress" | "steady" | "consolidate", from effort, completion and adherence of the last plan. */
export function direction(s) {
  if (!s || s.done === 0) return 'consolidate';
  if ((s.avgEffort !== null && s.avgEffort >= 8) || (s.adherence !== null && s.adherence < 0.6) || (s.avgCompletion !== null && s.avgCompletion < 0.8)) return 'consolidate';
  if ((s.avgEffort === null || s.avgEffort <= 5.5) && (s.adherence === null || s.adherence >= 0.75)) return 'progress';
  return 'steady';
}

// ------------------------------------------------------------------ volume & checks

function workSeconds(program, week, ex) {
  const w = program.schedule.find((x) => x.week === week);
  if (!w) return 0;
  return w.sessions.reduce((sum, sid) => {
    const session = program.sessions.find((s) => s.id === sid);
    const steps = expandSession(program, session, week, ex).filter((st) => st.kind === 'work');
    return sum + estimateSeconds(steps);
  }, 0);
}

/** Safety rules every proposal must respect (AI or rules). Returns a list of problems in Italian. */
export function checkProposal(program, { previous = null, maxMinutes = 35, sessionsPerWeek = 3 } = {}) {
  const problems = [];
  const ex = exerciseMap();
  try {
    validateProgram(program, new Set(ex.keys()));
  } catch (err) {
    return [err.message];
  }
  if (program.kind === 'collection' || program.kind === 'external') problems.push('Deve essere un programma a settimane (kind "program")');
  if (program.category === 'desk') problems.push('La categoria "desk" è riservata alle pause da scrivania');
  const weeks = program.schedule?.length || 0;
  if (weeks < 3 || weeks > 8) problems.push(`Durata ${weeks} settimane: deve essere tra 3 e 8`);
  for (const w of program.schedule || []) {
    if (w.sessions.length > sessionsPerWeek) problems.push(`Settimana ${w.week}: ${w.sessions.length} sessioni, massimo ${sessionsPerWeek}`);
    const a = w.adjust || {};
    if ((a.reps || 0) > 6 || (a.duration || 0) > 30 || (a.sets || 0) > 2 || (a.rounds || 0) > 2) {
      problems.push(`Settimana ${w.week}: incrementi troppo grandi in "adjust" (max reps 6, duration 30, sets 2, rounds 2)`);
    }
  }
  for (const s of program.sessions) {
    for (const w of program.schedule || []) {
      if (!w.sessions.includes(s.id)) continue;
      const min = estimateSeconds(expandSession(program, s, w.week, ex)) / 60;
      if (min > maxMinutes * 1.25) problems.push(`Sessione "${s.title}" in settimana ${w.week}: circa ${Math.round(min)} minuti, massimo ${maxMinutes}`);
      if (min < 8) problems.push(`Sessione "${s.title}": troppo breve (${Math.round(min)} minuti)`);
      break;
    }
  }
  const vols = (program.schedule || []).map((w) => workSeconds(program, w.week, ex));
  for (let i = 1; i < vols.length; i += 1) {
    if (vols[i] > vols[i - 1] * MAX_WEEK_TO_WEEK + 60) problems.push(`Settimana ${i + 1}: volume +${Math.round((vols[i] / vols[i - 1] - 1) * 100)}% rispetto alla precedente (max +20%)`);
  }
  if (weeks >= 4 && !vols.some((v, i) => i > 0 && v < vols[i - 1] * 0.95)) {
    problems.push('Con 4 o più settimane serve almeno una settimana di scarico (volume più basso della precedente)');
  }
  if (previous && previous.kind !== 'external' && previous.schedule) {
    const prevLast = workSeconds(previous, previous.schedule.length, ex);
    if (prevLast && vols[0] > prevLast * MAX_WEEKLY_GROWTH + 60) {
      problems.push(`La prima settimana ha un volume +${Math.round((vols[0] / prevLast - 1) * 100)}% rispetto all'ultima del programma precedente (max +25%)`);
    }
  }
  return [...new Set(problems)].slice(0, 12);
}

// ------------------------------------------------------------------ rules engine

const clone = (x) => JSON.parse(JSON.stringify(x));

function cycleIds(prev) {
  const m = prev.id.match(/^(.*?)-c(\d+)$/);
  const base = m ? m[1] : prev.id;
  const n = m ? Number(m[2]) + 1 : 2;
  let id = `${base}-c${n}`.slice(0, 60);
  for (let k = 2; findProgram(id); k += 1) id = `${base}-c${n}-${k}`.slice(0, 60);
  const title = `${prev.title.replace(/ · ciclo \d+$/, '')} · ciclo ${n}`;
  return { id, title };
}

/** Rules: next cycle of the previous program, with the last week's volume baked in and harder variants. */
export function rulesProposal(prev, summary, settings = genSettings()) {
  const dir = direction(summary);
  const lastWeek = prev.schedule[prev.schedule.length - 1];
  const a = lastWeek.adjust || {};
  const factor = dir === 'progress' ? 1.1 : dir === 'steady' ? 1.0 : 0.9;
  const usedIds = [...new Set(prev.schedule.slice(-2).flatMap((w) => w.sessions))];
  const ex = exerciseMap();
  const sessions = clone(prev.sessions.filter((s) => usedIds.includes(s.id))).map((s) => {
    for (const b of s.blocks) {
      if (b.rounds > 1) b.rounds = Math.max(1, b.rounds + (a.rounds || 0));
      for (const it of b.items) {
        if (dir === 'progress' && HARDER[it.exercise] && ex.has(HARDER[it.exercise])) {
          it.exercise = HARDER[it.exercise];
          if (it.reps && HOLDS.has(it.exercise)) {
            delete it.reps;
            it.duration = 20;
          } else if (it.reps) it.reps = Math.max(4, Math.round(it.reps * 0.75)); // new variant: start lower
        } else if (!it.fixed) {
          if (it.reps) it.reps = Math.max(3, Math.round((it.reps + (a.reps || 0)) * factor));
          if (it.duration) it.duration = Math.max(10, Math.round(((it.duration + (a.duration || 0)) * factor) / 5) * 5);
        }
        if (it.sets > 1) it.sets = Math.max(1, it.sets + (a.sets || 0));
      }
    }
    return s;
  });
  const per = Math.min(settings.sessionsPerWeek, Math.max(...prev.schedule.map((w) => w.sessions.length)));
  const order = sessions.map((s) => s.id);
  const pick = (w) => Array.from({ length: per }, (_, i) => order[(i + w) % order.length]);
  const { id, title } = cycleIds(prev);
  const program = {
    id,
    title,
    category: prev.category,
    kind: 'program',
    level: prev.level || '',
    summary: dir === 'progress'
      ? 'Nuovo ciclo più impegnativo: varianti più difficili e qualche ripetizione in più.'
      : dir === 'steady' ? 'Nuovo ciclo allo stesso livello, con una progressione graduale.' : 'Ciclo di consolidamento: volume leggermente ridotto per recuperare costanza.',
    description: `Generato da Moveo con le regole di progressione dopo "${prev.title}".`,
    goals: prev.goals || [],
    equipment: prev.equipment || [],
    suggestedDays: prev.suggestedDays,
    sessions,
    schedule: [
      { week: 1, sessions: pick(0), note: 'Riprendi il ritmo con il nuovo livello.' },
      { week: 2, sessions: pick(1), adjust: { reps: 1, duration: 5 } },
      { week: 3, sessions: pick(2), adjust: { reps: 2, duration: 10 } },
      { week: 4, sessions: pick(0), adjust: { reps: -2, duration: -10 }, note: 'Settimana di scarico: stessi esercizi, meno volume.' },
    ],
  };
  const reasons = {
    progress: 'fatica media bassa e buona costanza: è il momento di salire di livello',
    steady: 'fatica nella norma: si consolida con una progressione graduale',
    consolidate: 'fatica alta, sessioni saltate o incomplete: si riduce un po\' il volume',
  };
  return { program, rationale: `Regole di progressione: ${reasons[dir]}.` };
}

// ------------------------------------------------------------------ AI engine

const SCHEMA_HINT = {
  rationale: 'Spiegazione breve (2-4 frasi, italiano) delle scelte',
  program: {
    id: 'id-minuscolo-con-trattini',
    title: 'Titolo',
    category: 'uno degli id in "categorieDisponibili"',
    kind: 'program',
    level: 'principiante | intermedio',
    summary: 'una frase',
    description: 'paragrafo breve',
    goals: ['…'],
    equipment: ['tappetino'],
    sessions: [{
      id: 'sessione-a', title: 'Titolo sessione', focus: 'focus', intro: 'consiglio breve',
      blocks: [{
        title: 'Riscaldamento', rounds: 1, restBetweenRounds: 0,
        items: [{ exercise: 'cat-cow', reps: 8 }, { exercise: 'plank', duration: 30, sets: 2, rest: 30, restAfter: 30 }],
      }],
    }],
    schedule: [{ week: 1, sessions: ['sessione-a', 'sessione-b'], note: 'facoltativa' }, { week: 2, sessions: ['sessione-a', 'sessione-b'], adjust: { reps: 1, duration: 5 } }],
  },
};

function compactProgram(p) {
  if (!p || p.kind === 'external') return null;
  return {
    id: p.id, title: p.title, category: p.category,
    sessions: p.sessions.map((s) => ({
      id: s.id, title: s.title,
      blocks: s.blocks.map((b) => ({ title: b.title, rounds: b.rounds, items: b.items.map((i) => [i.exercise, i.reps ? `${i.reps}rip` : `${i.duration}s`, i.sets ? `x${i.sets}` : ''].join(' ').trim()) })),
    })),
    schedule: p.schedule,
  };
}

function buildMessages(ctx, problems) {
  const system = [
    'Sei un preparatore atletico esperto che scrive programmi di allenamento a corpo libero in italiano per l\'app Moveo.',
    'Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo e senza blocchi di codice.',
    'Regole obbligatorie:',
    '- usa SOLO gli id esercizio presenti in "libreria" (campo id); non inventare esercizi;',
    '- ogni elemento ha "duration" (secondi) OPPURE "reps", mai entrambi; "sets" 1-5, "rest" in secondi tra le serie;',
    `- da 3 a 6 settimane, al massimo ${ctx.settings.sessionsPerWeek} sessioni a settimana, ogni sessione al massimo ${ctx.settings.maxMinutes} minuti compresi i recuperi;`,
    '- ogni sessione inizia con un riscaldamento e finisce con defaticamento o mobilità;',
    '- progressione graduale: da una settimana all\'altra al massimo +20% di volume, usando "adjust" (reps max +6, duration max +30, sets max +2, rounds max +2, anche valori negativi);',
    '- con 4 o più settimane inserisci una settimana di scarico (adjust negativi);',
    `- la prima settimana non deve superare di oltre il 25% il volume dell'ultima settimana del programma precedente;`,
    '- adatta l\'intensità a "direzione": progress = varianti più difficili (vedi "progressioni"), steady = stesso livello, consolidate = volume più basso;',
    '- tieni conto delle note dell\'utente (fastidi, preferenze): se segnala dolore, scegli varianti più dolci;',
    '- la categoria non può essere "desk". Gli id di sessioni e programma: minuscole, numeri e trattini.',
  ].join('\n');
  const user = {
    richiesta: ctx.request || '(nessuna richiesta specifica: proponi il prossimo passo più utile)',
    obiettivi: ctx.settings.goals,
    categoriePreferite: ctx.settings.categories,
    categorieDisponibili: categories.list().filter((c) => c.id !== 'desk').map((c) => ({ id: c.id, nome: c.label })),
    direzione: ctx.direction,
    pianoPrecedente: ctx.summary,
    programmaPrecedente: compactProgram(ctx.previous),
    minutiUltime6SettimanePerCategoria: ctx.recent,
    progressioni: HARDER,
    formato: SCHEMA_HINT,
    libreria: ctx.library,
  };
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify(user) },
  ];
  if (problems?.length) {
    messages.push({ role: 'assistant', content: ctx.lastAnswer || '{}' });
    messages.push({ role: 'user', content: `La proposta non rispetta queste regole, correggila e rispondi di nuovo con il JSON completo:\n- ${problems.join('\n- ')}` });
  }
  return messages;
}

function parseJson(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('nessun JSON nella risposta');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callModel(model, messages) {
  const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.ai.apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.4, response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try { detail = JSON.parse(text).error?.message || JSON.parse(text)[0]?.error?.message || detail; } catch { /* not JSON */ }
    const err = new Error(`${model}: ${res.status} ${detail}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text).choices?.[0]?.message?.content || '';
}

async function complete(messages) {
  const models = [...new Set([config.ai.model, ...config.ai.fallbackModels].filter(Boolean))];
  let last;
  for (const model of models) {
    try {
      return { content: await callModel(model, messages), model };
    } catch (err) {
      last = err;
      console.warn('Generatore AI:', err.message);
      if (err.status && ![404, 408, 429, 500, 502, 503, 504].includes(err.status)) break;
    }
  }
  throw last || new Error('nessun modello configurato');
}

function normalizeAiProgram(raw, ctx) {
  const p = clone(raw);
  p.kind = 'program';
  const base = String(p.id || p.title || 'programma').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'programma';
  let id = `gen-${base}`;
  for (let k = 2; findProgram(id); k += 1) id = `gen-${base}-${k}`;
  p.id = id;
  if (!categories.isCategory(p.category) || p.category === 'desk') p.category = ctx.previous?.category && ctx.previous.category !== 'desk' ? ctx.previous.category : 'calisthenics';
  p.description = `${p.description || ''}\n\nProposto da Moveo con l'AI (${config.ai.model}) in base ai tuoi allenamenti.`.trim();
  return p;
}

async function aiProposal(ctx) {
  let problems = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { content, model } = await complete(buildMessages(ctx, problems));
    ctx.lastAnswer = content;
    let parsed;
    try {
      parsed = parseJson(content);
    } catch (err) {
      problems = [`JSON non valido: ${err.message}`];
      continue;
    }
    const program = normalizeAiProgram(parsed.program || parsed, ctx);
    problems = checkProposal(program, { previous: ctx.previous, maxMinutes: ctx.settings.maxMinutes, sessionsPerWeek: ctx.settings.sessionsPerWeek });
    if (!problems.length) return { program, rationale: String(parsed.rationale || '').slice(0, 1200), model };
  }
  const err = new Error(`La proposta dell'AI non ha superato i controlli: ${problems.join('; ')}`);
  err.problems = problems;
  throw err;
}

// ------------------------------------------------------------------ proposals

function mapProposal(r) {
  const program = JSON.parse(r.program);
  return {
    id: r.id,
    createdAt: r.created_at,
    status: r.status,
    engine: r.engine,
    model: r.model,
    basedOnPlan: r.based_on_plan,
    request: r.request || '',
    rationale: r.rationale || '',
    warnings: r.warnings ? JSON.parse(r.warnings) : [],
    program: detailOf(program),
  };
}

export const listProposals = () => db.prepare('SELECT * FROM proposals ORDER BY created_at DESC LIMIT 20').all().map(mapProposal);

export function getProposal(id) {
  const r = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  if (!r) throw httpError(404, 'Proposta non trovata');
  return mapProposal(r);
}

function lastPlanContext(planId) {
  const row = planId
    ? db.prepare('SELECT * FROM plans WHERE id = ?').get(planId)
    : db.prepare('SELECT * FROM plans ORDER BY created_at DESC').all().find((p) => findProgram(p.program_id)?.kind !== 'external');
  if (!row) return { previous: null, summary: null };
  return { previous: findProgram(row.program_id), summary: planSummary(row) };
}

/** Creates a proposal: AI when configured, otherwise (or on failure) the progression rules. */
export async function propose({ request = '', planId = null, engine = 'auto' } = {}) {
  const settings = genSettings();
  const { previous, summary } = lastPlanContext(planId);
  const ctx = {
    request: String(request || '').slice(0, 600),
    settings,
    previous,
    summary,
    direction: direction(summary),
    recent: recentMinutesByCategory(),
    library: listExercises().map((e) => ({ id: e.id, nome: e.name, categorie: e.categories, zone: e.targets, lati: !!e.perSide, attrezzi: e.equipment || [] })),
  };

  let result = null;
  const warnings = [];
  if (engine !== 'rules' && aiConfigured()) {
    try {
      result = { ...(await aiProposal(ctx)), engine: 'ai' };
    } catch (err) {
      warnings.push(`AI non disponibile, uso le regole di progressione (${err.message.slice(0, 300)})`);
    }
  } else if (engine !== 'rules') {
    warnings.push('Chiave AI non configurata (ai_api_key): proposta generata con le regole di progressione.');
  }
  if (!result) {
    if (!previous || previous.kind === 'external') {
      throw httpError(400, warnings.length
        ? `${warnings[0]} Le regole hanno bisogno di un piano già svolto con un programma di Moveo.`
        : 'Serve almeno un piano già svolto con un programma di Moveo.');
    }
    const r = rulesProposal(previous, summary, settings);
    const problems = checkProposal(r.program, { previous, maxMinutes: settings.maxMinutes * 1.5, sessionsPerWeek: 6 });
    if (problems.length) warnings.push(...problems.map((p) => `Da verificare: ${p}`));
    result = { ...r, engine: 'rules', model: null };
  }

  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO proposals (id, created_at, status, engine, model, based_on_plan, request, program, rationale, warnings)
    VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`).run(
    id, nowIso(), result.engine, result.model || null, summary?.planId || null, ctx.request || null,
    JSON.stringify(result.program), result.rationale || '', JSON.stringify(warnings),
  );
  return getProposal(id);
}

/** Approve: the program joins the library (source "generated") and, if days are given, is planned in Calendary. */
export async function approve(id, planInput) {
  const p = getProposal(id);
  if (p.status !== 'pending') throw httpError(400, 'Proposta già gestita');
  const raw = JSON.parse(db.prepare('SELECT program FROM proposals WHERE id = ?').get(id).program);
  saveProgram(raw, 'generated');
  db.prepare("UPDATE proposals SET status = 'approved' WHERE id = ?").run(id);
  // Older pending proposals are superseded.
  db.prepare("UPDATE proposals SET status = 'rejected' WHERE status = 'pending' AND id != ?").run(id);
  let plan = null;
  if (planInput?.days?.length) plan = await createPlan({ ...planInput, programId: raw.id });
  return { proposal: getProposal(id), program: getProgram(raw.id), plan };
}

export function reject(id) {
  getProposal(id);
  db.prepare("UPDATE proposals SET status = 'rejected' WHERE id = ?").run(id);
  return getProposal(id);
}

// ------------------------------------------------------------------ automatic trigger

let busy = false;
/** Hourly: when a plan is nearly over, prepare the next program once and notify. */
export async function autoPropose() {
  const settings = genSettings();
  if (!settings.auto || busy) return;
  if (db.prepare("SELECT 1 FROM proposals WHERE status = 'pending'").get()) return;
  const target = plansNearEnd().find(({ row }) => !getSetting(`proposed_for:${row.id}`) && findProgram(row.program_id)?.kind !== 'external');
  if (!target) return;
  busy = true;
  try {
    setSetting(`proposed_for:${target.row.id}`, nowIso());
    const p = await propose({ planId: target.row.id });
    await notifyAll({
      title: '✨ Il tuo prossimo programma è pronto',
      body: `${p.program.title}: ${p.program.summary || ''}\nAprilo per approvarlo e metterlo in calendario.`.slice(0, 400),
      url: `${config.publicUrl}/prossimo`,
      tag: `moveo-proposal-${p.id}`,
    });
  } catch (err) {
    console.warn('Proposta automatica non generata:', err.message);
  } finally {
    busy = false;
  }
}
