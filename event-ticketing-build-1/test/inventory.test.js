import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createEvent, addTier, bookTickets, cancelBooking, findBookingByReference, joinWaitlist, nextWaitlistedAttendee } from "../src/domain/inventory.js";

function setup(capacity = 3) {
  const store = createStore();
  const event = createEvent(store, { name: "Test Event", date: "2026-12-01", capacity });
  const tier = addTier(store, event.id, { name: "General", priceCents: 1250, capacity });
  return { store, event, tier };
}

test("booking enforces capacity and failed booking changes nothing", () => {
  const { store, event, tier } = setup(2);
  bookTickets(store, { tierId: tier.id, attendeeName: "Ada", quantity: 2 });
  assert.throws(() => bookTickets(store, { tierId: tier.id, attendeeName: "Ben", quantity: 1 }), { code: "SOLD_OUT" });
  assert.equal(event.bookedCount, 2);
  assert.equal(tier.bookedCount, 2);
  assert.equal(store.bookings.size, 1);
});

test("booking references resolve through the index", () => {
  const { store, tier } = setup();
  const booking = bookTickets(store, { tierId: tier.id, attendeeName: "Ada", quantity: 1 });
  assert.equal(findBookingByReference(store, booking.reference).id, booking.id);
});

test("cancellation releases inventory exactly once", () => {
  const { store, event, tier } = setup();
  const booking = bookTickets(store, { tierId: tier.id, attendeeName: "Ada", quantity: 2 });
  cancelBooking(store, booking.reference);
  assert.equal(event.bookedCount, 0);
  assert.equal(tier.bookedCount, 0);
  assert.throws(() => cancelBooking(store, booking.reference), { code: "ALREADY_CANCELLED" });
  assert.equal(event.bookedCount, 0);
});

test("waitlist returns attendees in FIFO order", () => {
  const { store, event } = setup();
  joinWaitlist(store, { eventId: event.id, attendeeName: "First" });
  joinWaitlist(store, { eventId: event.id, attendeeName: "Second" });
  assert.equal(nextWaitlistedAttendee(store, event.id).attendeeName, "First");
  assert.equal(nextWaitlistedAttendee(store, event.id).attendeeName, "Second");
  assert.equal(nextWaitlistedAttendee(store, event.id), undefined);
});

test("rejects invalid booking quantities", () => {
  const { store, tier } = setup();
  assert.throws(() => bookTickets(store, { tierId: tier.id, attendeeName: "Ada", quantity: 11 }), { code: "VALIDATION" });
});
