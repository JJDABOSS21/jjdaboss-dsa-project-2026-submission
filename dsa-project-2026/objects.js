const bookings = new Map();

export function addBooking(bookingId, bookingDetails) {
    bookings.set(bookingId, bookingDetails);
}

bookings.set('G3SLN75', {
    owner: 'John Doe',
    seats: 2,
});

export default bookings;
