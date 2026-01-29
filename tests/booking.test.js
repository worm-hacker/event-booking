const mongoose = require('mongoose');
const { holdSeats, confirmBooking } = require('../src/services/booking.service');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/event_ticketing_test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

test('Seat booking flow works', async () => {
  await holdSeats('e1', ['A1']);
  const booking = await confirmBooking('e1', ['A1'], 'u1');
  expect(booking.status).toBe('CONFIRMED');
});
