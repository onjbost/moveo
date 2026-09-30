// Run with: npm test  (uses a throw-away data dir)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'moveo-test-'));
process.env.MOVEO_NO_AUTH = '1';

const content = await import('../src/content.js');
const { slotMinutes } = await import('../src/breaks.js');
const { computeSchedule } = await import('../src/plans.js');
content.loadBuiltinContent({ info() {} });

test('la libreria di base è valida e completa', () => {
  const programs = content.listPrograms();
  assert.deepEqual(new Set(programs.map((p) => p.category)), new Set(content.CATEGORIES));
  for (const p of programs) {
    const detail = content.programDetail(p.id);
    for (const s of detail.sessions) assert.ok(s.minutes >= 2, `${p.id}/${s.id} troppo corta`);
  }
});

test('le serie per lato a tempo diventano due step (sinistro e destro)', () => {
  const play = content.playable('pause-scrivania', 'collo');
  const sides = play.steps.filter((s) => s.exercise === 'neck-side-stretch').map((s) => s.side);
  assert.deepEqual(sides, ['sinistro', 'destro']);
  assert.notEqual(play.steps.at(-1).kind, 'rest', 'la sessione non termina con un recupero');
});

test('gli adattamenti settimanali aumentano volume ma non gli sprint "fixed"', () => {
  const w1 = content.playable('surf-pronto', 'remata-intervalli', 1).steps;
  const w6 = content.playable('surf-pronto', 'remata-intervalli', 6).steps;
  const sprint = (steps) => steps.filter((s) => s.block === 'Sprint di remata' && s.kind === 'work');
  assert.equal(sprint(w1)[0].duration, 20);
  assert.equal(sprint(w6)[0].duration, 20);
  assert.equal(sprint(w6).length, sprint(w1).length + 1, 'un giro in più alla settimana 6');
  const pushW1 = w1.find((s) => s.exercise === 'push-up').reps;
  const pushW6 = w6.find((s) => s.exercise === 'push-up').reps;
  assert.equal(pushW6, pushW1 + 2);
});

test('il calendario rispetta i giorni scelti e l\'ordine delle settimane', () => {
  const program = content.getProgram('calisthenics-da-zero');
  const dates = computeSchedule(program, '2026-10-01', [4, 6, 1]); // gio, sab, lun
  assert.equal(dates.length, 24);
  assert.equal(dates[0].date, '2026-10-01');
  assert.equal(dates[1].date, '2026-10-03');
  assert.equal(dates[2].date, '2026-10-05');
  assert.equal(dates[3].week, 2);
  assert.ok(dates.every((d) => [4, 6, 1].includes(new Date(`${d.date}T12:00`).getDay())));
});

test('le pause sono distribuite nella giornata saltando la pausa pranzo', () => {
  const slots = slotMinutes({ start: '09:30', end: '18:00', lunchStart: '13:00', lunchEnd: '14:00', count: 4 });
  assert.equal(slots.length, 4);
  for (const m of slots) assert.ok(m >= 570 && m <= 1080 && !(m > 780 && m < 840), `slot fuori finestra: ${m}`);
  assert.deepEqual([...slots].sort((a, b) => a - b), slots);
});

test('l\'import rifiuta riferimenti a esercizi inesistenti', () => {
  assert.throws(() => content.importContent({
    id: 'prova', title: 'Prova', category: 'yoga', kind: 'collection',
    sessions: [{ id: 'sessione-a', title: 'A', blocks: [{ items: [{ exercise: 'non-esiste', duration: 30 }] }] }],
  }), /esercizio sconosciuto/);
});
