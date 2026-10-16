import { DomainError } from "./errors.js";
import { newId, newReference } from "./ids.js";
import { Queue } from "./waitlistQueue.js";

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError("VALIDATION", `${label} must be a non-empty string.`);
  }
  return value.trim();
}
function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError("VALIDATION", `${label} must be a positive whole number.`);
  }
  return value;
}
function requireMoney(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("VALIDATION", "priceCents must be a non-negative whole number of cents.");
  }
  return value;
}

export function createStore() {
  return {
    events: new Map(),
    tiers: new Map(),
    bookings: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map()
  };
}

export function createEvent(store, { name, date, capacity }) {
  if (!store?.events || !store?.waitlists) throw new DomainError("VALIDATION", "A valid store is required.");
  const cleanName = requireText(name, "name");
  const cleanDate = requireText(date, "date");
  const cleanCapacity = requirePositiveInteger(capacity, "capacity");
  const event = {
    id: newId(), name: cleanName, date: cleanDate, capacity: cleanCapacity,
    bookedCount: 0, tierIds: [], createdAt: new Date().toISOString()
  };
  store.events.set(event.id, event);
  store.waitlists.set(event.id, new Queue());
  return event;
}

export function addTier(store, eventId, { name, priceCents, capacity }) {
  const event = store?.events?.get(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "Event not found.");
  const cleanName = requireText(name, "tier name");
  const price = requireMoney(priceCents);
  const tierCapacity = requirePositiveInteger(capacity, "tier capacity");
  const eventTierCapacity = event.tierIds.reduce((sum, id) => sum + store.tiers.get(id).capacity, 0);
  if (eventTierCapacity + tierCapacity > event.capacity) {
    throw new DomainError("CAPACITY_EXCEEDED", "Ticket tier capacities cannot exceed the event capacity.");
  }
  const tier = {
    id: newId(), eventId, name: cleanName, priceCents: price,
    capacity: tierCapacity, bookedCount: 0
  };
  store.tiers.set(tier.id, tier);
  event.tierIds.push(tier.id);
  return tier;
}

export function bookTickets(store, { tierId, attendeeName, quantity }) {
  const tier = store?.tiers?.get(tierId);
  if (!tier) throw new DomainError("NOT_FOUND", "Ticket tier not found.");
  const name = requireText(attendeeName, "attendeeName");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new DomainError("VALIDATION", "quantity must be a whole number from 1 to 10.");
  }
  const event = store.events.get(tier.eventId);
  const remainingTier = tier.capacity - tier.bookedCount;
  const remainingEvent = event.capacity - event.bookedCount;
  if (quantity > remainingTier || quantity > remainingEvent) {
    throw new DomainError("SOLD_OUT", "Not enough tickets are available for this booking.");
  }

  let reference;
  do { reference = newReference(); } while (store.bookingsByReference.has(reference));

  const booking = {
    id: newId(), reference, eventId: event.id, tierId,
    attendeeName: name, quantity, totalCents: tier.priceCents * quantity,
    status: "CONFIRMED", createdAt: new Date().toISOString(), cancelledAt: null
  };
  // Inventory is mutated only after every validation/capacity check has passed.
  tier.bookedCount += quantity;
  event.bookedCount += quantity;
  store.bookings.set(booking.id, booking);
  store.bookingsByReference.set(reference, booking.id);
  return booking;
}

export function cancelBooking(store, reference) {
  const booking = findBookingByReference(store, reference);
  if (booking.status === "CANCELLED") {
    throw new DomainError("ALREADY_CANCELLED", "This booking has already been cancelled.");
  }
  const tier = store.tiers.get(booking.tierId);
  const event = store.events.get(booking.eventId);
  // Check consistency before mutating any inventory.
  if (!tier || !event || tier.bookedCount < booking.quantity || event.bookedCount < booking.quantity) {
    throw new DomainError("INVENTORY_INCONSISTENT", "Cannot safely cancel this booking because inventory is inconsistent.");
  }
  tier.bookedCount -= booking.quantity;
  event.bookedCount -= booking.quantity;
  booking.status = "CANCELLED";
  booking.cancelledAt = new Date().toISOString();
  return booking;
}

export function findBookingByReference(store, reference) {
  const cleanReference = requireText(reference, "reference").toUpperCase();
  const bookingId = store?.bookingsByReference?.get(cleanReference);
  if (!bookingId) throw new DomainError("NOT_FOUND", `No booking found for reference ${cleanReference}.`);
  return store.bookings.get(bookingId);
}

export function joinWaitlist(store, { eventId, attendeeName, tierId = null }) {
  const event = store?.events?.get(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "Event not found.");
  const name = requireText(attendeeName, "attendeeName");
  if (tierId !== null) {
    const tier = store.tiers.get(tierId);
    if (!tier || tier.eventId !== eventId) {
      throw new DomainError("VALIDATION", "tierId must identify a ticket tier belonging to this event.");
    }
  }
  const entry = {
    id: newId(), eventId, tierId, attendeeName: name,
    joinedAt: new Date().toISOString(), status: "WAITING"
  };
  store.waitlists.get(eventId).enqueue(entry);
  return entry;
}

// Removes and returns the next person waiting for this event (FIFO).
// Build 1 models the queue only; automatic timed offers are a later milestone.
export function nextWaitlistedAttendee(store, eventId) {
  if (!store?.events?.has(eventId)) throw new DomainError("NOT_FOUND", "Event not found.");
  return store.waitlists.get(eventId).dequeue();
}
