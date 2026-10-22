import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../src/http/router.js';

describe('router', () => {
  it('matches method and path and decodes named parameters', () => {
    const router = createRouter();
    const handler = () => {};
    router.add('GET', '/events/:eventId/tickets/:ticketId', handler);

    const match = router.match('get', '/events/event%201/tickets/ticket-2');
    assert.equal(match.handler, handler);
    assert.deepEqual(match.params, { eventId: 'event 1', ticketId: 'ticket-2' });
  });

  it('does not match a different method, path, or segment count', () => {
    const router = createRouter();
    router.get('/events/:eventId', () => {});

    assert.equal(router.match('POST', '/events/1'), undefined);
    assert.equal(router.match('GET', '/events/1/tickets'), undefined);
    assert.equal(router.match('GET', '/events'), undefined);
  });
});
