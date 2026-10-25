import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createDeliveryWorkerHandler } from '../src/controllers/registrationDelivery.controller.js';

test('worker refuses unconfigured and unauthorized runs and bounds authenticated work', async () => {
  for (const [secret, auth, expected] of [['', '', 503], ['s'.repeat(32), '', 401], ['s'.repeat(32), 'Bearer wrong', 401], ['s'.repeat(32), `Bearer ${'s'.repeat(32)}`, 200]]) {
    let calls = 0;
    const app = express();
    app.post('/worker', createDeliveryWorkerHandler({ db: {}, env: { MISSISSAUGA_WORKER_SECRET: secret }, run: async ({ limit }) => { calls++; assert.equal(limit, 1); return { claimed: 0 }; } }));
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ code: error.code }));
    const server = createServer(app).listen(0, '127.0.0.1'); await once(server, 'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/worker`, { method: 'POST', headers: { authorization: auth } });
      assert.equal(response.status, expected); assert.equal(calls, expected === 200 ? 1 : 0);
      if (expected === 200) assert.equal(response.headers.get('cache-control'), 'no-store');
    } finally { server.close(); await once(server, 'close'); }
  }
});
