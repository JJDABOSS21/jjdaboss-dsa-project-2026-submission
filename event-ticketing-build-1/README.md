# Event Ticketing — Build 1

Terminal-only domain core for events, ticket tiers, bookings, cancellation, FIFO waitlists, and booking-reference lookup. No server, database, or third-party packages.

## Requirements
- Node.js 22.13 or newer
- npm

Check your version:
```sh
node --version
```

## Run it
```sh
npm test
npm run demo
npm run benchmark
```

## What is included
- `src/domain/errors.js` — machine-readable domain errors
- `src/domain/ids.js` — cryptographically generated IDs and readable booking references
- `src/domain/waitlistQueue.js` — linked-list queue with O(1) enqueue/dequeue/peek
- `src/domain/inventory.js` — event, tier, booking, cancellation, lookup, and waitlist operations
- `scripts/demo.js` — event sells out, booking is refused, attendees join the waitlist, cancellation releases seats, and the next attendee is named
- `scripts/benchmark-lookup.js` — compares `Map` lookup with `Array.find`
- `test/inventory.test.js` — built-in Node tests

All money values are whole cents. Payments are not processed. Waitlist entries are dequeued in FIFO order; timed offers and automatic booking conversion are outside Build 1.
