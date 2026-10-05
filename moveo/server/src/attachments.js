// Personal attachments of external programs: the PDF or the daily posters the user downloaded from the
// author's site (e.g. DAREBEE). Files stay in /data, unchanged, and are shown as they are in the player.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db } from './db.js';
import { httpError } from './util.js';

export const MIME = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_BYTES = 40 * 1024 * 1024;
const PROGRAM_SCOPE = '_'; // attachment of the whole program (e.g. the full PDF)
const SCOPE_RE = /^(_|[a-z0-9][a-z0-9-]{0,63})$/;

const dir = path.join(config.dataDir, 'attachments');

db.exec(`
  CREATE TABLE IF NOT EXISTS attachments (
    program_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    mime TEXT NOT NULL,
    file TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    first_page INTEGER,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (program_id, scope)
  );
`);

function checkScope(scope) {
  if (!SCOPE_RE.test(scope || '')) throw httpError(400, 'Sessione non valida');
}

const view = (r) => r && ({
  scope: r.scope,
  mime: r.mime,
  name: r.name,
  size: r.size,
  firstPage: r.first_page,
  updatedAt: r.updated_at,
  url: `/api/programs/${encodeURIComponent(r.program_id)}/attachments/${r.scope}/file?v=${encodeURIComponent(r.updated_at)}`,
});

export function list(programId) {
  return db.prepare('SELECT * FROM attachments WHERE program_id = ? ORDER BY scope').all(programId).map(view);
}

export function get(programId, scope) {
  checkScope(scope);
  return db.prepare('SELECT * FROM attachments WHERE program_id = ? AND scope = ?').get(programId, scope);
}

export function save(programId, scope, { mime, buffer, name, firstPage }) {
  checkScope(scope);
  const ext = MIME[mime];
  if (!ext) throw httpError(415, 'Formato non supportato: carica un PDF o un\'immagine (JPG, PNG, WebP)');
  if (!buffer?.length) throw httpError(400, 'File vuoto');
  if (buffer.length > MAX_BYTES) throw httpError(413, 'File troppo grande (max 40 MB)');
  // cheap magic-number check, so the declared type matches the content
  const head = buffer.subarray(0, 12);
  const ok = ext === 'pdf' ? head.subarray(0, 5).toString('latin1') === '%PDF-'
    : ext === 'jpg' ? head[0] === 0xff && head[1] === 0xd8
      : ext === 'png' ? head.subarray(1, 4).toString('latin1') === 'PNG'
        : head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
  if (!ok) throw httpError(415, 'Il contenuto del file non corrisponde al formato');

  const old = get(programId, scope);
  const folder = path.join(dir, programId);
  fs.mkdirSync(folder, { recursive: true });
  const file = `${scope === PROGRAM_SCOPE ? 'programma' : scope}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(folder, file), buffer);
  const page = ext === 'pdf' ? clampPage(firstPage ?? old?.first_page ?? 1) : null;
  db.prepare(`INSERT INTO attachments (program_id, scope, mime, file, name, size, first_page, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (program_id, scope) DO UPDATE SET mime = excluded.mime, file = excluded.file, name = excluded.name,
      size = excluded.size, first_page = excluded.first_page, updated_at = excluded.updated_at`)
    .run(programId, scope, mime, file, String(name || file).slice(0, 200), buffer.length, page, new Date().toISOString());
  if (old) fs.rmSync(path.join(folder, old.file), { force: true });
  return view(get(programId, scope));
}

const clampPage = (n) => Math.max(1, Math.min(2000, Math.round(Number(n)) || 1));

export function setFirstPage(programId, scope, firstPage) {
  const row = get(programId, scope);
  if (!row) throw httpError(404, 'Nessun allegato');
  db.prepare('UPDATE attachments SET first_page = ?, updated_at = ? WHERE program_id = ? AND scope = ?')
    .run(clampPage(firstPage), new Date().toISOString(), programId, scope);
  return view(get(programId, scope));
}

export function remove(programId, scope) {
  const row = get(programId, scope);
  if (!row) return;
  fs.rmSync(path.join(dir, programId, row.file), { force: true });
  db.prepare('DELETE FROM attachments WHERE program_id = ? AND scope = ?').run(programId, scope);
}

export function removeAll(programId) {
  db.prepare('DELETE FROM attachments WHERE program_id = ?').run(programId);
  fs.rmSync(path.join(dir, programId), { recursive: true, force: true });
}

export function filePath(programId, scope) {
  const row = get(programId, scope);
  if (!row) throw httpError(404, 'Nessun allegato');
  return { path: path.join(dir, programId, row.file), mime: row.mime };
}

/**
 * What the player shows for a session: its own poster if there is one, otherwise the page of the
 * program PDF for that day (day N → page firstPage + N - 1), otherwise the program image.
 */
export function forSession(program, session) {
  const own = get(program.id, session.id);
  if (own) return { ...view(own), page: null };
  const whole = get(program.id, PROGRAM_SCOPE);
  if (!whole) return null;
  const index = program.sessions.findIndex((s) => s.id === session.id);
  return { ...view(whole), page: whole.mime === 'application/pdf' ? (whole.first_page || 1) + Math.max(0, index) : null };
}
