import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, 'moveo.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- Exercises and programs are JSON documents: built-in ones are reloaded at every start,
  -- imported ones (source = 'import') are kept until deleted.
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'builtin',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'builtin',
    updated_at TEXT NOT NULL
  );

  -- A program placed on the calendar: start date, week days and time.
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    days TEXT NOT NULL,
    time TEXT NOT NULL,
    reminder_minutes INTEGER,
    calendary_status TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plan_sessions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    program_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    calendary_event_id TEXT,
    log_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_plan_sessions_date ON plan_sessions(date);

  -- Every completed (or partially completed) workout.
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    plan_session_id TEXT,
    break_id TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    completion REAL NOT NULL DEFAULT 1,
    effort INTEGER,
    note TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_logs_finished ON logs(finished_at);

  -- Movement breaks during the work day.
  CREATE TABLE IF NOT EXISTS breaks (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    slot INTEGER NOT NULL,
    planned_at TEXT NOT NULL,
    due_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    session_id TEXT NOT NULL,
    postponed INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    done_at TEXT,
    UNIQUE (date, slot)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

export function transaction(fn) {
  if (db.isTransaction) return fn();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
