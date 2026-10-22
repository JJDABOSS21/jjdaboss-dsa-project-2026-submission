import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKING_STATES,
  BOOKING_TRANSITIONS,
  assertTransition,
  canTransition,
} from '../src/domain/bookingStateMachine.js';
import { DomainError } from '../src/domain/errors.js';

describe('booking state machine', () => {
  it('allows every defined transition', () => {
    for (const [from, destinations] of Object.entries(BOOKING_TRANSITIONS)) {
      for (const to of destinations) {
        assert.equal(canTransition(from, to), true, `${from} -> ${to}`);
        assert.doesNotThrow(() => assertTransition(from, to));
      }
    }
  });

  it('rejects every transition not explicitly allowed, including unknown states', () => {
    for (const from of BOOKING_STATES) {
      for (const to of BOOKING_STATES) {
        if (canTransition(from, to)) continue;
        assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
        assert.throws(
          () => assertTransition(from, to),
          (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
          `${from} -> ${to}`,
        );
      }
    }

    for (const [from, to] of [['unknown', 'paid'], ['pending', 'unknown']]) {
      assert.equal(canTransition(from, to), false);
      assert.throws(
        () => assertTransition(from, to),
        (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
      );
    }
  });
});
