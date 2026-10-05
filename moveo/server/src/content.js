import fs from 'node:fs';
import * as categories from './categories.js';
import * as attachments from './attachments.js';
import path from 'node:path';
import { config } from './config.js';
import { db, transaction } from './db.js';
import { httpError, nowIso } from './util.js';
import { embedUrl, parseYouTube, watchUrl } from './youtube.js';

export const CATEGORIES = ['desk', 'recovery', 'yoga', 'pilates', 'calisthenics', 'surf'];
const ID_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;
const SEC_PER_REP = 3.5;
const SLOW = ['yoga', 'pilates', 'mobility', 'recovery'];
const TRANSITION_SEC = 5;

// --------------------------------------------------------------- loading

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${path.basename(file)}: ${err.message}`);
  }
}

/** Reload the built-in library from content/ (exercises.json + programs/*.json). Imported items are untouched. */
export function loadBuiltinContent(log = console) {
  const dir = config.contentDir;
  loadAnimations();
  const exercises = readJson(path.join(dir, 'exercises.json'));
  const progDir = path.join(dir, 'programs');
  const programs = fs.readdirSync(progDir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(progDir, f)));

  const known = new Set(exercises.map((e) => e.id));
  for (const row of db.prepare("SELECT id FROM exercises WHERE source = 'import'").all()) known.add(row.id);
  exercises.forEach(validateExercise);
  programs.forEach((p) => validateProgram(p, known));

  transaction(() => {
    db.prepare("DELETE FROM exercises WHERE source = 'builtin'").run();
    db.prepare("DELETE FROM programs WHERE source = 'builtin'").run();
    const insEx = db.prepare("INSERT OR REPLACE INTO exercises (id, data, source, updated_at) VALUES (?, ?, 'builtin', ?)");
    const insPr = db.prepare("INSERT OR REPLACE INTO programs (id, data, source, updated_at) VALUES (?, ?, 'builtin', ?)");
    const now = nowIso();
    for (const e of exercises) insEx.run(e.id, JSON.stringify(e), now);
    for (const p of programs) insPr.run(p.id, JSON.stringify(p), now);
  });
  log.info?.(`Libreria caricata: ${exercises.length} esercizi, ${programs.length} programmi`);
}

// ------------------------------------------------------------ validation

function need(cond, msg) {
  if (!cond) throw httpError(400, msg);
}

export function validateExercise(e) {
  need(e && typeof e === 'object', 'Esercizio non valido');
  need(ID_RE.test(e.id || ''), `Id esercizio non valido: "${e.id}" (minuscole, numeri e trattini)`);
  need(typeof e.name === 'string' && e.name.trim(), `L'esercizio ${e.id} deve avere un nome`);
  need(typeof e.description === 'string', `L'esercizio ${e.id} deve avere una descrizione`);
  if (e.cues !== undefined) need(Array.isArray(e.cues), `cues di ${e.id} deve essere un elenco`);
}

function validateItem(item, where, known) {
  need(item && typeof item === 'object', `${where}: elemento non valido`);
  need(known.has(item.exercise), `${where}: esercizio sconosciuto "${item.exercise}"`);
  const timed = Number.isFinite(item.duration);
  const reps = Number.isFinite(item.reps);
  need(timed !== reps, `${where} (${item.exercise}): indica "duration" (secondi) oppure "reps", non entrambi`);
  if (timed) need(item.duration >= 5 && item.duration <= 1800, `${where} (${item.exercise}): durata tra 5 e 1800 secondi`);
  if (reps) need(item.reps >= 1 && item.reps <= 200, `${where} (${item.exercise}): ripetizioni tra 1 e 200`);
  if (item.sets !== undefined) need(Number.isInteger(item.sets) && item.sets >= 1 && item.sets <= 20, `${where}: serie tra 1 e 20`);
  if (item.rest !== undefined) need(Number.isFinite(item.rest) && item.rest >= 0 && item.rest <= 600, `${where}: recupero tra 0 e 600 s`);
}

export function validateProgram(p, knownExercises) {
  need(p && typeof p === 'object', 'Programma non valido');
  need(ID_RE.test(p.id || ''), `Id programma non valido: "${p.id}"`);
  need(typeof p.title === 'string' && p.title.trim(), `Il programma ${p.id} deve avere un titolo`);
  need(categories.isCategory(p.category), `Categoria "${p.category}" di ${p.id} sconosciuta: creala prima in Impostazioni → Categorie (esistenti: ${categories.ids().join(', ')})`);
  need(Array.isArray(p.sessions) && p.sessions.length, `Il programma ${p.id} non ha sessioni`);
  const external = p.kind === 'external';
  if (external) {
    need(/^https?:\/\//i.test(p.url || ''), `${p.id}: un programma esterno deve avere "url" (https://…)`);
    need(Number.isFinite(p.minutes) && p.minutes >= 5 && p.minutes <= 180, `${p.id}: indica "minutes" (5-180)`);
  }
  const sessionIds = new Set();
  for (const s of p.sessions) {
    need(ID_RE.test(s.id || ''), `${p.id}: id sessione non valido "${s.id}"`);
    need(!sessionIds.has(s.id), `${p.id}: sessione duplicata "${s.id}"`);
    sessionIds.add(s.id);
    need(typeof s.title === 'string' && s.title.trim(), `${p.id}/${s.id}: manca il titolo`);
    if (external) {
      if (s.url !== undefined) need(/^https?:\/\//i.test(s.url), `${p.id}/${s.id}: url non valido`);
      if (s.video !== undefined) need(s.video && (s.video.videoId || (s.video.playlistId && s.video.index)), `${p.id}/${s.id}: video non valido`);
      continue;
    }
    need(Array.isArray(s.blocks) && s.blocks.length, `${p.id}/${s.id}: nessun blocco`);
    s.blocks.forEach((b, bi) => {
      need(Array.isArray(b.items) && b.items.length, `${p.id}/${s.id} blocco ${bi + 1}: nessun esercizio`);
      b.items.forEach((it, ii) => validateItem(it, `${p.id}/${s.id} blocco ${bi + 1} #${ii + 1}`, knownExercises));
    });
  }
  if (p.kind !== 'collection') {
    need(Array.isArray(p.schedule) && p.schedule.length, `${p.id}: manca "schedule" (le settimane del programma)`);
    p.schedule.forEach((w, i) => {
      need(Number.isInteger(w.week) && w.week === i + 1, `${p.id}: le settimane devono essere 1, 2, 3… in ordine`);
      need(Array.isArray(w.sessions) && w.sessions.length, `${p.id}: settimana ${w.week} senza sessioni`);
      w.sessions.forEach((sid) => need(sessionIds.has(sid), `${p.id}: settimana ${w.week} usa la sessione sconosciuta "${sid}"`));
    });
  }
}

// ---------------------------------------------------------------- access

const parse = (row) => (row ? { ...JSON.parse(row.data), source: row.source } : null);

// Stick-figure animations (content/animations.json) and user-chosen videos are attached to exercises.
let animations = {};
function loadAnimations() {
  try {
    animations = JSON.parse(fs.readFileSync(path.join(config.contentDir, 'animations.json'), 'utf8'));
  } catch {
    animations = {};
  }
}

function withMedia(e) {
  if (!e) return e;
  const media = db.prepare('SELECT video FROM exercise_media WHERE exercise_id = ?').get(e.id);
  return { ...e, animation: animations[e.id] || null, video: media?.video || e.video || null };
}

export function listExercises() {
  const videos = new Map(db.prepare('SELECT exercise_id, video FROM exercise_media').all().map((r) => [r.exercise_id, r.video]));
  return db.prepare('SELECT data, source FROM exercises').all().map(parse)
    .map((e) => ({ ...e, animation: animations[e.id] || null, video: videos.get(e.id) || e.video || null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export function getExercise(id) {
  return withMedia(parse(db.prepare('SELECT data, source FROM exercises WHERE id = ?').get(id)));
}

/** Saves (or clears, with an empty url) the YouTube video of an exercise. */
export function setExerciseVideo(id, url) {
  need(getExercise(id), 'Esercizio non trovato');
  const u = String(url || '').trim();
  if (!u) {
    db.prepare('DELETE FROM exercise_media WHERE exercise_id = ?').run(id);
  } else {
    need(parseYouTube(u), 'Serve un link di YouTube (video o playlist)');
    db.prepare(`INSERT INTO exercise_media (exercise_id, video, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(exercise_id) DO UPDATE SET video = excluded.video, updated_at = excluded.updated_at`).run(id, u, nowIso());
  }
  return getExercise(id);
}

export function exerciseMap() {
  return new Map(listExercises().map((e) => [e.id, e]));
}

export function getProgram(id) {
  const p = parse(db.prepare('SELECT data, source FROM programs WHERE id = ?').get(id));
  if (!p) throw httpError(404, 'Programma non trovato');
  return p;
}

export function findProgram(id) {
  return parse(db.prepare('SELECT data, source FROM programs WHERE id = ?').get(id));
}

export function getSession(program, sessionId) {
  const s = program.sessions.find((x) => x.id === sessionId);
  if (!s) throw httpError(404, 'Sessione non trovata');
  return s;
}

/** Program list with light summaries (no blocks). */
export function listPrograms() {
  const ex = exerciseMap();
  const order = categories.ids();
  return db.prepare('SELECT data, source FROM programs').all().map(parse).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    kind: p.kind || 'program',
    level: p.level || '',
    summary: p.summary || '',
    weeks: p.kind === 'collection' ? 0 : p.schedule.length,
    sessionsPerWeek: p.kind === 'collection' ? 0 : Math.max(...p.schedule.map((w) => w.sessions.length)),
    equipment: p.equipment || [],
    minutes: p.kind === 'external' ? p.minutes : Math.round(avg(p.sessions.map((s) => estimateSeconds(expandSession(p, s, 1, ex)))) / 60),
    source: p.source,
  })).sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.title.localeCompare(b.title, 'it'));
}

/** Rename / re-categorize a program you made or imported (the built-in library stays as it is). */
export function updateProgramMeta(id, { title, category }) {
  const row = db.prepare('SELECT data, source FROM programs WHERE id = ?').get(id);
  need(row, 'Programma non trovato');
  need(row.source !== 'builtin', 'I programmi della libreria di base non si modificano: esportali e reimportali con un altro id');
  const p = JSON.parse(row.data);
  if (title !== undefined) {
    const t = String(title).trim().slice(0, 100);
    need(t, 'Il nome non può essere vuoto');
    p.title = t;
  }
  if (category !== undefined) {
    need(categories.isCategory(category), 'Categoria sconosciuta');
    need(category !== 'desk' || p.category === 'desk', 'La categoria Scrivania è riservata alle pause');
    p.category = category;
  }
  db.prepare('UPDATE programs SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(p), nowIso(), id);
  return getProgram(id);
}

const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

/** Full program with per-session estimated minutes for week 1. */
export function programDetail(id) {
  return detailOf(getProgram(id));
}

/** Detail of a program object (saved or still a proposal). */
export function detailOf(p) {
  const ex = exerciseMap();
  if (p.kind === 'external') {
    return { ...p, sessions: p.sessions.map((s) => ({ ...s, blocks: [], minutes: s.minutes || p.minutes, exercises: [] })) };
  }
  return {
    ...p,
    kind: p.kind || 'program',
    sessions: p.sessions.map((s) => ({
      ...s,
      minutes: Math.round(estimateSeconds(expandSession(p, s, 1, ex)) / 60),
      exercises: [...new Set(s.blocks.flatMap((b) => b.items.map((i) => i.exercise)))]
        .map((eid) => ({ id: eid, name: ex.get(eid)?.name || eid })),
    })),
  };
}

// ------------------------------------------------------------- expansion

function weekAdjust(program, week) {
  const w = program.kind === 'collection' ? null : program.schedule.find((x) => x.week === week);
  return { reps: 0, duration: 0, sets: 0, rounds: 0, ...(w?.adjust || {}) };
}

/**
 * Turns a session into the flat list of steps the player runs: work intervals (timed or by reps),
 * rests between sets and rounds. Week adjustments ("adjust") add reps, seconds, sets or rounds.
 */
export function expandSession(program, session, week = 1, exercises = exerciseMap()) {
  if (program.kind === 'external') return [];
  const adj = weekAdjust(program, week);
  const steps = [];
  for (const block of session.blocks) {
    const baseRounds = block.rounds || 1;
    const rounds = baseRounds > 1 ? Math.max(1, baseRounds + adj.rounds) : 1;
    for (let r = 0; r < rounds; r += 1) {
      block.items.forEach((item, idx) => {
        const ex = exercises.get(item.exercise);
        const perSide = item.perSide ?? !!ex?.perSide;
        const baseSets = item.sets || 1;
        const sets = baseSets > 1 ? Math.max(1, baseSets + adj.sets) : 1;
        const timed = Number.isFinite(item.duration);
        const duration = timed ? Math.max(10, item.duration + (item.fixed ? 0 : adj.duration)) : null;
        const reps = timed ? null : Math.max(1, item.reps + (item.fixed ? 0 : adj.reps));
        const secPerRep = ex?.secPerRep || (SLOW.some((c) => ex?.categories?.includes(c)) && !ex?.categories?.includes('calisthenics') ? 5 : SEC_PER_REP);
        for (let s = 0; s < sets; s += 1) {
          const base = {
            kind: 'work',
            exercise: item.exercise,
            name: ex?.name || item.exercise,
            mode: timed ? 'time' : 'reps',
            duration,
            reps,
            secPerRep,
            set: s + 1,
            sets,
            round: r + 1,
            rounds,
            block: block.title || '',
            note: item.note || '',
          };
          if (timed && perSide) {
            steps.push({ ...base, side: 'sinistro' });
            steps.push({ ...base, side: 'destro' });
          } else {
            steps.push({ ...base, side: perSide ? 'per lato' : null });
          }
          const lastSet = s === sets - 1;
          const rest = lastSet ? (item.restAfter ?? 0) : (item.rest ?? (timed ? 15 : 45));
          if (rest > 0) steps.push({ kind: 'rest', duration: rest, block: block.title || '' });
        }
        // no extra rest after the last item of a round: handled below
        void idx;
      });
      if (r < rounds - 1 && block.restBetweenRounds) {
        steps.push({ kind: 'rest', duration: block.restBetweenRounds, block: block.title || '', label: `Fine giro ${r + 1} di ${rounds}` });
      }
    }
  }
  // Collapse accidental double rests (e.g. restAfter followed by restBetweenRounds): keep the longer one.
  const out = [];
  for (const st of steps) {
    const prev = out[out.length - 1];
    if (st.kind === 'rest' && prev?.kind === 'rest') {
      prev.duration = Math.max(prev.duration, st.duration);
      prev.label = prev.label || st.label;
    } else out.push(st);
  }
  if (out[out.length - 1]?.kind === 'rest') out.pop();
  return out;
}

/** Expected minutes of a session in a given week (external programs declare it). */
export function sessionMinutes(program, session, week = 1, exercises = exerciseMap()) {
  if (program.kind === 'external') return session.minutes || program.minutes;
  return Math.max(5, Math.round(estimateSeconds(expandSession(program, session, week, exercises)) / 60));
}

export function estimateSeconds(steps) {
  return steps.reduce((sum, st) => {
    if (st.kind === 'rest') return sum + st.duration;
    if (st.mode === 'time') return sum + st.duration + TRANSITION_SEC;
    const sides = st.side === 'per lato' ? 2 : 1;
    return sum + st.reps * (st.secPerRep || SEC_PER_REP) * sides + TRANSITION_SEC;
  }, 0);
}

function externalInfo(program, session) {
  const site = new URL(program.url).hostname.replace(/^(www|m)\./, '');
  if (session.video) {
    // Without a videoId (playlist read without an API key) the web player starts the playlist at `index` via the IFrame API.
    return { url: watchUrl(session.video), site: 'youtube.com', embed: session.video.videoId ? embedUrl(session.video) : null, youtube: session.video, minutes: session.minutes || program.minutes, attachment: null };
  }
  return { url: session.url || program.url, site, embed: null, youtube: null, minutes: program.minutes, attachment: attachments.forSession(program, session) };
}

/** Everything the player needs for one session. */
export function playable(programId, sessionId, week = 1) {
  const program = getProgram(programId);
  const session = getSession(program, sessionId);
  const ex = exerciseMap();
  const steps = expandSession(program, session, week, ex);
  const usedIds = [...new Set(steps.filter((s) => s.kind === 'work').map((s) => s.exercise))];
  const w = program.kind === 'collection' ? null : program.schedule.find((x) => x.week === week);
  return {
    program: { id: program.id, title: program.title, category: program.category },
    session: { id: session.id, title: session.title, focus: session.focus || '', intro: session.intro || '' },
    week,
    weekNote: w?.note || '',
    seconds: program.kind === 'external' ? (session.minutes || program.minutes) * 60 : Math.round(estimateSeconds(steps)),
    steps,
    external: program.kind === 'external' ? externalInfo(program, session) : null,
    exercises: Object.fromEntries(usedIds.map((id) => [id, ex.get(id)])),
  };
}

// ---------------------------------------------------------- import/export

/**
 * Accepts { exercises: [...], programs: [...] }, a single program, or an array of programs.
 * Imported items cannot replace built-in ones (change the id instead).
 */
export function importContent(payload) {
  let exercises = [];
  let programs = [];
  if (Array.isArray(payload)) programs = payload;
  else if (payload && (payload.programs || payload.exercises)) {
    exercises = payload.exercises || [];
    programs = payload.programs || [];
  } else if (payload && payload.sessions) programs = [payload];
  need(exercises.length || programs.length, 'Il file non contiene programmi né esercizi');

  const builtin = (table, id) => db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND source = 'builtin'`).get(id);
  // Exercises already in the base library (e.g. in a file exported from Moveo) keep the library version.
  const skipped = exercises.filter((e) => e && builtin('exercises', e.id)).length;
  exercises = exercises.filter((e) => !(e && builtin('exercises', e.id)));
  exercises.forEach(validateExercise);
  const known = new Set(listExercises().map((e) => e.id));
  exercises.forEach((e) => known.add(e.id));
  programs.forEach((p) => validateProgram(p, known));
  for (const p of programs) need(!builtin('programs', p.id), `Il programma "${p.id}" esiste già nella libreria di base: cambia "id" per importarlo come copia`);

  const now = nowIso();
  transaction(() => {
    const insEx = db.prepare("INSERT OR REPLACE INTO exercises (id, data, source, updated_at) VALUES (?, ?, 'import', ?)");
    const insPr = db.prepare("INSERT OR REPLACE INTO programs (id, data, source, updated_at) VALUES (?, ?, 'import', ?)");
    for (const e of exercises) insEx.run(e.id, JSON.stringify(stripSource(e)), now);
    for (const p of programs) insPr.run(p.id, JSON.stringify(stripSource(p)), now);
  });
  return { exercises: exercises.length, skippedExercises: skipped, programs: programs.map((p) => ({ id: p.id, title: p.title })) };
}

const stripSource = ({ source, ...rest }) => { void source; return rest; };

export function exportContent(programId) {
  if (programId) {
    const p = stripSource(getProgram(programId));
    const ids = new Set(p.sessions.flatMap((s) => s.blocks.flatMap((b) => b.items.map((i) => i.exercise))));
    const exercises = listExercises().filter((e) => ids.has(e.id)).map(stripSource);
    return { format: 'moveo/1', exercises, programs: [p] };
  }
  const programs = db.prepare('SELECT data FROM programs').all().map((r) => JSON.parse(r.data));
  const exercises = db.prepare('SELECT data FROM exercises').all().map((r) => JSON.parse(r.data));
  return { format: 'moveo/1', exercises, programs };
}

export function deleteImported(kind, id) {
  const table = kind === 'exercise' ? 'exercises' : 'programs';
  const row = db.prepare(`SELECT source FROM ${table} WHERE id = ?`).get(id);
  need(row, 'Elemento non trovato');
  need(row.source !== 'builtin', 'Gli elementi della libreria di base non si possono eliminare');
  if (table === 'exercises') {
    const used = db.prepare('SELECT id, data FROM programs').all().filter((r) => r.data.includes(`"exercise":"${id}"`));
    need(!used.length, `Esercizio usato da: ${used.map((u) => u.id).join(', ')}`);
  }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  if (table === 'programs') attachments.removeAll(id);
}

/** Saves a program created inside Moveo (AI/rules proposal, external link program). */
export function saveProgram(program, source) {
  const known = new Set(listExercises().map((e) => e.id));
  validateProgram(program, known);
  need(!db.prepare("SELECT 1 FROM programs WHERE id = ? AND source = 'builtin'").get(program.id), `L'id "${program.id}" è già usato dalla libreria di base`);
  db.prepare('INSERT OR REPLACE INTO programs (id, data, source, updated_at) VALUES (?, ?, ?, ?)')
    .run(program.id, JSON.stringify(stripSource(program)), source, nowIso());
  return getProgram(program.id);
}
