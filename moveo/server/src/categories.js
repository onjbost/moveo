// Program categories: the built-in ones plus those created by the user (e.g. "Corsa", "Mobilità", "Boxe").
import { db } from './db.js';
import { httpError, nowIso } from './util.js';

export const BUILTIN = [
  { id: 'recovery', label: 'Recupero', emoji: '🌿' },
  { id: 'desk', label: 'Scrivania', emoji: '🪑' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘' },
  { id: 'pilates', label: 'Pilates', emoji: '⭕' },
  { id: 'calisthenics', label: 'Calisthenics', emoji: '💪' },
  { id: 'surf', label: 'Surf', emoji: '🏄' },
];
const BUILTIN_IDS = new Set(BUILTIN.map((c) => c.id));
// also reserved: exercise tags and words used by routes
const RESERVED = new Set([...BUILTIN_IDS, 'mobility', 'all', 'tutti', 'nuova']);
const PALETTE = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#a3e635'];

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const custom = () => db.prepare('SELECT id, label, emoji, color FROM categories ORDER BY created_at').all();

/** Every category, built-in first, with how many programs use it. */
export function list() {
  const counts = new Map(db.prepare("SELECT json_extract(data, '$.category') AS c, COUNT(*) AS n FROM programs GROUP BY c").all().map((r) => [r.c, r.n]));
  return [
    ...BUILTIN.map((c) => ({ ...c, color: null, builtin: true })),
    ...custom().map((c) => ({ ...c, builtin: false })),
  ].map((c) => ({ ...c, programs: counts.get(c.id) || 0 }));
}

export const ids = () => [...BUILTIN.map((c) => c.id), ...custom().map((c) => c.id)];
export const isCategory = (id) => typeof id === 'string' && (BUILTIN_IDS.has(id) || !!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id));
export function info(id) {
  return BUILTIN.find((c) => c.id === id) || db.prepare('SELECT id, label, emoji, color FROM categories WHERE id = ?').get(id) || null;
}
export const emoji = (id) => info(id)?.emoji || '🏃';
export const label = (id) => info(id)?.label || id || '';

/** Category for user-made programs: any category except the desk breaks, else `fallback`. */
export const forProgram = (id, fallback) => (isCategory(id) && id !== 'desk' ? id : fallback);

const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

function clean({ label: l, emoji: e, color }, current = {}) {
  const lab = String(l ?? current.label ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
  if (!lab) throw httpError(400, 'Dai un nome alla categoria');
  const em = [...String(e ?? current.emoji ?? '').trim()].slice(0, 4).join('') || '🏷️';
  const col = String(color ?? current.color ?? '').trim();
  if (col && !/^#[0-9a-f]{6}$/i.test(col)) throw httpError(400, 'Colore non valido (#rrggbb)');
  return { label: lab, emoji: em, color: col.toLowerCase() };
}

export function create(input) {
  const c = clean(input || {});
  const id = slugify(c.label);
  if (!id || id.length < 2) throw httpError(400, 'Nome della categoria troppo corto');
  if (RESERVED.has(id) || isCategory(id)) throw httpError(409, `La categoria "${c.label}" esiste già`);
  const color = c.color || PALETTE[custom().length % PALETTE.length];
  db.prepare('INSERT INTO categories (id, label, emoji, color, created_at) VALUES (?, ?, ?, ?, ?)').run(id, c.label, c.emoji, color, nowIso());
  return { id, label: c.label, emoji: c.emoji, color, builtin: false, programs: 0 };
}

export function update(id, patch) {
  if (BUILTIN_IDS.has(id)) throw httpError(400, 'Le categorie di base non si modificano');
  const cur = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!cur) throw httpError(404, 'Categoria non trovata');
  const c = clean(patch || {}, cur);
  db.prepare('UPDATE categories SET label = ?, emoji = ?, color = ? WHERE id = ?').run(c.label, c.emoji, c.color || cur.color, id);
  return list().find((x) => x.id === id);
}

export function remove(id) {
  if (BUILTIN_IDS.has(id)) throw httpError(400, 'Le categorie di base non si eliminano');
  const used = db.prepare("SELECT json_extract(data, '$.title') AS t FROM programs WHERE json_extract(data, '$.category') = ?").all(id);
  if (used.length) throw httpError(409, `Categoria usata da: ${used.map((u) => u.t).join(', ')}. Cambia prima la categoria di questi programmi.`);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}
