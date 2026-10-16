import {
  createStore, createEvent, addTier, bookTickets, cancelBooking,
  findBookingByReference, joinWaitlist, nextWaitlistedAttendee
} from "../src/domain/inventory.js";

const store = createStore();
const event = createEvent(store, {
  name: "Lagos Creator Meetup",
  date: "2026-11-14",
  capacity: 3
});
const tier = addTier(store, event.id, {
  name: "General Admission",
  priceCents: 500000,
  capacity: 3
});

console.log(`Event: ${event.name} (${event.date})`);
const first = bookTickets(store, { tierId: tier.id, attendeeName: "Ada", quantity: 2 });
const second = bookTickets(store, { tierId: tier.id, attendeeName: "Tunde", quantity: 1 });
console.log(`Confirmed ${first.quantity} ticket(s) for ${first.attendeeName}: ${first.reference}`);
console.log(`Confirmed ${second.quantity} ticket(s) for ${second.attendeeName}: ${second.reference}`);

try {
  bookTickets(store, { tierId: tier.id, attendeeName: "Ngozi", quantity: 1 });
} catch (error) {
  console.log(`Booking refused: ${error.code} — ${error.message}`);
}

const waiting1 = joinWaitlist(store, { eventId: event.id, attendeeName: "Ngozi", tierId: tier.id });
const waiting2 = joinWaitlist(store, { eventId: event.id, attendeeName: "Chidi", tierId: tier.id });
console.log(`Waitlist #1: ${waiting1.attendeeName}`);
console.log(`Waitlist #2: ${waiting2.attendeeName}`);

console.log(`Lookup ${first.reference}: ${findBookingByReference(store, first.reference).attendeeName}`);
cancelBooking(store, first.reference);
console.log(`Cancelled booking ${first.reference}; ${first.quantity} seat(s) released.`);

const next = nextWaitlistedAttendee(store, event.id);
console.log(`Next person in FIFO waitlist: ${next.attendeeName}`);
