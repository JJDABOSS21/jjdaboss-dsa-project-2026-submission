import { performance } from "node:perf_hooks";
import { createStore, createEvent, addTier, bookTickets } from "../src/domain/inventory.js";

const store = createStore();
const event = createEvent(store, { name: "Benchmark Event", date: "2026-12-01", capacity: 10000 });
const tier = addTier(store, event.id, { name: "Benchmark", priceCents: 100, capacity: 10000 });

// Create a large collection without violating the 1–10 ticket booking rule.
for (let i = 0; i < 10000; i++) {
  bookTickets(store, { tierId: tier.id, attendeeName: `Attendee ${i}`, quantity: 1 });
}
const bookings = [...store.bookings.values()];
const target = bookings[bookings.length - 1];
const iterations = 20000;

let start = performance.now();
for (let i = 0; i < iterations; i++) store.bookingsByReference.get(target.reference);
const mapMs = performance.now() - start;

start = performance.now();
for (let i = 0; i < iterations; i++) bookings.find((booking) => booking.reference === target.reference);
const arrayMs = performance.now() - start;

console.log(`Bookings: ${bookings.length.toLocaleString()}`);
console.log(`Lookups: ${iterations.toLocaleString()}`);
console.log(`Map.get:    ${mapMs.toFixed(2)} ms`);
console.log(`Array.find: ${arrayMs.toFixed(2)} ms`);
console.log(`Array.find / Map.get: ${(arrayMs / Math.max(mapMs, 0.001)).toFixed(1)}x`);
console.log("Big O: Map.get is average O(1); Array.find is O(n) because it may inspect every booking.");
