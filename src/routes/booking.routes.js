const express = require('express');
const { holdSeats, confirmBooking, insertSeats, cancelBooking, processPayment, getBookingPaymentDetails, setSeatPrice } = require('../services/booking.service');

const router = express.Router();

router.post('/hold', async (req, res) => {
  try {
    const { eventId, seats, eventDate, duration } = req.body;
    if (!eventDate || !duration) {
      return res.status(400).json({ error: 'Event date and duration are required' });
    }
    await holdSeats(eventId, seats, eventDate, duration);
    res.json({ message: 'Seats held for 10 minutes', eventDate, duration });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { eventId, seats, userId, eventDate, duration } = req.body;
    if (!eventDate || !duration) {
      return res.status(400).json({ error: 'Event date and duration are required' });
    }
    const booking = await confirmBooking(eventId, seats, userId, eventDate, duration);
    res.json(booking);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Process payment for a booking
router.post('/payment/process', async (req, res) => {
  try {
    const { bookingId, paymentId, eventDate, duration } = req.body;
    if (!bookingId || !paymentId || !eventDate || !duration) {
      return res.status(400).json({ error: 'Booking ID, Payment ID, event date, and duration are required' });
    }
    const result = await processPayment(bookingId, paymentId, eventDate, duration);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get booking payment details
router.get('/payment/details/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const details = await getBookingPaymentDetails(bookingId);
    res.json(details);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Set seat price for an event
router.post('/price/set', async (req, res) => {
  try {
    const { eventId, seatPrice } = req.body;
    const result = await setSeatPrice(eventId, seatPrice);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Insert new seats for an event
router.post('/seats/insert', async (req, res) => {
  try {
    const { eventId, seats, eventDate, duration } = req.body;
    const result = await insertSeats(eventId, seats, eventDate, duration);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Cancel a booking
router.post('/cancel', async (req, res) => {
  try {
    const { bookingId, eventDate, duration } = req.body;
    const result = await cancelBooking(bookingId, eventDate, duration);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
