import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/http/app.js';

describe('HTTP app', () => {
  it('serves health, static files, and consistent JSON errors over HTTP', async () => {
    const server = createAppServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    after(() => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }));

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const home = await fetch(baseUrl);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /<title>Event Ticketing<\/title>/);

    const missing = await fetch(`${baseUrl}/api/no-such-route`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), {
      error: { code: 'NOT_FOUND', message: 'API route not found' },
    });

    const badJson = await fetch(`${baseUrl}/api/unknown`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    assert.equal(badJson.status, 400);
    assert.deepEqual(await badJson.json(), {
      error: { code: 'BAD_REQUEST', message: 'Request body must contain valid JSON' },
    });

    const traversal = await fetch(`${baseUrl}/..%2f..%2fREADME.md`);
    assert.equal(traversal.status, 404);
    assert.deepEqual(await traversal.json(), {
      error: { code: 'NOT_FOUND', message: 'File not found' },
    });
  });
});
