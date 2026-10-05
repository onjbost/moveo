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

test('ticket di accesso unico: monouso, solo dall\'altra app, solo percorsi interni', async () => {
  process.env.CALENDARY_TOKEN = 'x'.repeat(24);
  const { config } = await import('../src/config.js');
  config.calendary.token = 'x'.repeat(24);
  const { signTicket, verifyTicket } = await import('../src/suite.js');
  const t = signTicket('calendary', '/play/surf-pronto/remata?w=2');
  assert.equal(verifyTicket(t, 'calendary'), '/play/surf-pronto/remata?w=2');
  assert.equal(verifyTicket(t, 'calendary'), null, 'riuso rifiutato');
  assert.equal(verifyTicket(signTicket('moveo', '/'), 'calendary'), null, 'emittente sbagliato');
  assert.equal(verifyTicket(signTicket('calendary', '//evil.example'), 'calendary'), '/');
  const forged = t.slice(0, -2) + 'xx';
  assert.equal(verifyTicket(forged, 'calendary'), null);
});

test('generatore: direzione dalla fatica e dalla costanza', async () => {
  const { direction } = await import('../src/generator.js');
  assert.equal(direction({ done: 6, avgEffort: 4, adherence: 1, avgCompletion: 1 }), 'progress');
  assert.equal(direction({ done: 6, avgEffort: 6.5, adherence: 0.9, avgCompletion: 1 }), 'steady');
  assert.equal(direction({ done: 6, avgEffort: 8.5, adherence: 1, avgCompletion: 1 }), 'consolidate');
  assert.equal(direction({ done: 3, avgEffort: 4, adherence: 0.5, avgCompletion: 1 }), 'consolidate');
});

test('generatore: le regole producono un ciclo valido con scarico e varianti più difficili', async () => {
  const { rulesProposal, checkProposal } = await import('../src/generator.js');
  const prev = content.getProgram('calisthenics-da-zero');
  const { program } = rulesProposal(prev, { done: 24, avgEffort: 4, adherence: 1, avgCompletion: 1 }, { sessionsPerWeek: 3, maxMinutes: 35 });
  assert.equal(program.id, 'calisthenics-da-zero-c2');
  assert.ok(program.sessions.some((s) => s.blocks.some((b) => b.items.some((i) => i.exercise === 'push-up' || i.exercise === 'split-squat'))));
  const problems = checkProposal(program, { previous: prev, maxMinutes: 60, sessionsPerWeek: 3 });
  assert.deepEqual(problems, []);
});

test('generatore: i controlli bloccano esercizi inventati, salti di volume e assenza di scarico', async () => {
  const { checkProposal } = await import('../src/generator.js');
  const s = (id, reps) => ({ id, title: id, blocks: [{ title: 'x', items: [{ exercise: 'squat', reps, sets: 3, rest: 45 }, { exercise: 'plank', duration: 60, sets: 3, rest: 30 }, { exercise: 'cat-cow', reps: 10 }] }] });
  const base = { id: 'gen-test', title: 'T', category: 'calisthenics', kind: 'program', sessions: [s('sess-a', 12)] };
  const flat = { ...base, schedule: [1, 2, 3, 4].map((w) => ({ week: w, sessions: ['sess-a', 'sess-a'] })) };
  assert.ok(checkProposal(flat).some((p) => p.includes('scarico')));
  const jump = { ...base, schedule: [{ week: 1, sessions: ['sess-a'] }, { week: 2, sessions: ['sess-a', 'sess-a'] }, { week: 3, sessions: ['sess-a', 'sess-a'], adjust: { reps: -2 } }] };
  assert.ok(checkProposal(jump).some((p) => p.includes('volume')));
  const fake = JSON.parse(JSON.stringify(flat));
  fake.sessions[0].blocks[0].items[0].exercise = 'esercizio-inventato';
  assert.ok(checkProposal(fake)[0].includes('sconosciuto'));
});

test('attachments: magic check, program page mapping, day override', async () => {
  const att = await import('../src/attachments.js');
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  const prog = { id: 'ext-att-test', sessions: [{ id: 'giorno-1' }, { id: 'giorno-2' }, { id: 'giorno-3' }] };
  assert.throws(() => att.save(prog.id, '_', { mime: 'image/png', buffer: pdf }), /non corrisponde/);
  assert.throws(() => att.save(prog.id, '../x', { mime: 'application/pdf', buffer: pdf }), /non valida/);
  att.save(prog.id, '_', { mime: 'application/pdf', buffer: pdf, name: 'p.pdf', firstPage: 4 });
  assert.equal(att.forSession(prog, prog.sessions[2]).page, 6);
  const png = Buffer.concat([Buffer.from([0x89]), Buffer.from('PNG\r\n\x1a\n'), Buffer.alloc(20)]);
  att.save(prog.id, 'giorno-2', { mime: 'image/png', buffer: png, name: 'g2.png' });
  const s2 = att.forSession(prog, prog.sessions[1]);
  assert.equal(s2.mime, 'image/png');
  assert.equal(s2.page, null);
  att.removeAll(prog.id);
  assert.equal(att.forSession(prog, prog.sessions[0]), null);
});

test('custom categories: create, use in a program, rename, protected delete', async () => {
  const cats = await import('../src/categories.js');
  const c = cats.create({ label: 'Corsa', emoji: '🏃‍♂️', color: '#ff8800' });
  assert.equal(c.id, 'corsa');
  assert.throws(() => cats.create({ label: 'corsa' }), /esiste già/);
  assert.throws(() => cats.create({ label: 'Yoga' }), /esiste già/);
  assert.throws(() => cats.create({ label: 'X', color: 'red' }), /troppo corto|Colore/);
  const p = content.saveProgram({
    id: 'ext-corsa-test', title: 'Corsa 5k', category: 'corsa', kind: 'external', url: 'https://example.com/5k', minutes: 30,
    sessions: [{ id: 'giorno-1', title: 'Giorno 1' }], schedule: [{ week: 1, sessions: ['giorno-1'] }],
  }, 'external');
  assert.equal(p.category, 'corsa');
  assert.ok(content.listPrograms().some((x) => x.id === 'ext-corsa-test' && x.category === 'corsa'));
  assert.equal(cats.list().find((x) => x.id === 'corsa').programs, 1);
  assert.throws(() => cats.remove('corsa'), /usata da: Corsa 5k/);
  assert.throws(() => cats.remove('yoga'), /base/);
  assert.equal(cats.update('corsa', { label: 'Corsa e trail' }).label, 'Corsa e trail');
  const moved = content.updateProgramMeta('ext-corsa-test', { title: 'Corsa 10k', category: 'yoga' });
  assert.equal(moved.title, 'Corsa 10k');
  assert.throws(() => content.updateProgramMeta('ripartenza-dolce', { category: 'yoga' }), /libreria di base/);
  cats.remove('corsa');
  assert.equal(cats.isCategory('corsa'), false);
  assert.throws(() => content.saveProgram({ id: 'x-bad', title: 'X', category: 'boh', kind: 'external', url: 'https://e.com', minutes: 10, sessions: [{ id: 'a1', title: 'A' }], schedule: [{ week: 1, sessions: ['a1'] }] }, 'external'), /sconosciuta/);
});
