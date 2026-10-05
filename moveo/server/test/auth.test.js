import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'moveo-auth-'));
process.env.MOVEO_PASSWORD = 'segreta';
process.env.CALENDARY_TOKEN = 'c'.repeat(24);

const { registerAuth, TRUST_PROXY } = await import('../src/auth.js');

// The real auth hook in front of fake routes with the same patterns as the app.
const app = Fastify({ logger: false, trustProxy: TRUST_PROXY });
await app.register(fastifyCookie);
registerAuth(app);
await app.register(async (api) => {
  api.get('/programs', async () => []);
  api.get('/suite/today', async () => ({ ok: true }));
}, { prefix: '/api' });

const get = (url, headers) => app.inject({ method: 'GET', url, headers });

test("le API richiedono l'accesso, anche con percorsi codificati", async () => {
  for (const url of ['/api/programs', '/%61pi/programs', '/api/%70rograms', '/%61pi/non-esiste']) {
    assert.equal((await get(url)).statusCode, 401, url);
  }
});

test('Calendary entra in suite/today solo con il token condiviso', async () => {
  const bearer = { authorization: `Bearer ${'c'.repeat(24)}` };
  assert.equal((await get('/api/suite/today', bearer)).statusCode, 200);
  assert.equal((await get('/%61pi/suite/today', bearer)).statusCode, 200);
  assert.equal((await get('/api/suite/today')).statusCode, 401);
  assert.equal((await get('/api/programs', bearer)).statusCode, 401);
});

test('il limite dei tentativi non si aggira cambiando X-Forwarded-For', async () => {
  let last;
  for (let i = 0; i < 12; i += 1) {
    last = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'no' }, remoteAddress: '203.0.113.5', headers: { 'x-forwarded-for': `198.51.100.${i}` } });
  }
  assert.equal(last.statusCode, 429);
});
