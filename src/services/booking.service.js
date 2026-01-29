const SeatLock = require('../models/SeatLock');
const Booking = require('../models/Booking');
const Price = require('../models/Price');
const Event = require('../models/Event');

const HOLD_TIME = 10 * 60 * 1000;
const DEFAULT_SEAT_PRICE = 300; // RS

// Cleanup expired locks periodically
setInterval(async () => {
  try {
    // Check if SeatLock collection has any documents
    const lockCount = await SeatLock.countDocuments();
    if (lockCount === 0) {
      console.log('No seat locks to cleanup');
      return;
    }

    const now = new Date();
    const result = await SeatLock.deleteMany({ expiresAt: { $lt: now } });
    
    if (result.deletedCount > 0) {
      console.log(`${result.deletedCount} expired seat locks cleaned up`);
    } else {
      console.log('No expired seat locks found');
    }
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
  }
}, 60 * 1000); // Run every minute


async function holdSeats(eventId, seats, eventDate, duration) {
  const now = new Date();
  const bookedSeats = await Booking.find({
    eventId,
    seats: { $in: seats },
    status: 'CONFIRMED',
    paymentStatus: 'COMPLETED'
  });

  if (bookedSeats.length > 0) {
    throw new Error('One or more seats are already booked');
  }

  for (const seat of seats) {
    const existingLock = await SeatLock.findOne({
      eventId,
      seatId: seat,
      expiresAt: { $gt: now }
    });

    if (existingLock) {
      throw new Error(`Seat ${seat} is temporarily locked`);
    }
  }
  const locks = seats.map(seat => ({
    eventId,
    seatId: seat,
    eventDate,
    duration,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  }));

  await SeatLock.insertMany(locks);
}

async function confirmBooking(eventId, seats, userId, eventDate, duration) {
  const now = new Date();

  // Check if any seats are already booked
  const bookedSeats = await Booking.find({
    eventId,
    seats: { $in: seats },
    status: 'CONFIRMED',
    paymentStatus: 'COMPLETED'
  });

  if (bookedSeats.length > 0) {
    throw new Error('One or more seats are already booked');
  }

  const locks = await SeatLock.find({ eventId, seatId: { $in: seats }, expiresAt: { $gt: now } });
  if (locks.length !== seats.length) throw new Error('Seat lock expired');

  // Get seat price
  let priceInfo = await Price.findOne({ eventId });
  const seatPrice = priceInfo ? priceInfo.seatPrice : DEFAULT_SEAT_PRICE;
  const totalPrice = seats.length * seatPrice;

  // Create booking with PENDING payment status
  const booking = await Booking.create({
    eventId,
    userId,
    seats,
    status: 'PENDING',
    eventDate,
    duration,
    seatPrice,
    totalPrice,
    paymentStatus: 'PENDING'
  });

  // Remove seat locks until payment is confirmed
  await SeatLock.deleteMany({ eventId, seatId: { $in: seats } });

  return {
    bookingId: booking._id,
    message: 'Booking created. Payment required to confirm seats.',
    seats,
    seatPrice,
    totalPrice,
    paymentStatus: 'PENDING',
    eventDate,
    duration
  };
}

// Process payment for a booking
async function processPayment(bookingId, paymentId, eventDate, duration) {
  if (!bookingId || !paymentId) {
    throw new Error('Booking ID and Payment ID are required');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.paymentStatus === 'COMPLETED') {
    throw new Error('Payment already completed for this booking');
  }

  // Simulate payment processing (in real scenario, integrate with payment gateway)
  // For now, we'll mark payment as completed
  booking.paymentStatus = 'COMPLETED';
  booking.paymentId = paymentId;
  booking.paymentDate = new Date();
  booking.status = 'CONFIRMED';
  await booking.save();

  // Hold the seats
  const locks = booking.seats.map(seat => ({
    eventId: booking.eventId,
    seatId: seat,
    eventDate: booking.eventDate,
    duration: booking.duration,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  }));
  await SeatLock.insertMany(locks);

  return {
    message: 'Payment processed successfully. Seats are now confirmed.',
    bookingId: booking._id,
    paymentStatus: 'COMPLETED',
    paymentId,
    paymentDate: booking.paymentDate,
    seats: booking.seats,
    totalPrice: booking.totalPrice,
    status: 'CONFIRMED'
  };
}

// Get booking payment details
async function getBookingPaymentDetails(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  return {
    bookingId: booking._id,
    seats: booking.seats,
    seatPrice: booking.seatPrice,
    totalPrice: booking.totalPrice,
    paymentStatus: booking.paymentStatus,
    status: booking.status,
    eventDate: booking.eventDate,
    duration: booking.duration
  };
}

// Set seat price for an event
async function setSeatPrice(eventId, seatPrice) {
  if (!eventId || !seatPrice || seatPrice <= 0) {
    throw new Error('Event ID and valid seat price are required');
  }

  let priceInfo = await Price.findOne({ eventId });
  if (priceInfo) {
    priceInfo.seatPrice = seatPrice;
    priceInfo.updatedAt = new Date();
    await priceInfo.save();
  } else {
    priceInfo = await Price.create({
      eventId,
      seatPrice
    });
  }

  return {
    message: 'Seat price updated successfully',
    eventId,
    seatPrice,
    currency: 'RS'
  };
}

// Create a new event
async function createEvent(name, city, date, duration, seats = []) {
  if (!name || !date || !duration) {
    throw new Error('Event name, date and duration are required');
  }

  const event = await Event.create({
    name,
    city,
    date,
    duration,
    seats
  });

  return event;
}

// Get all available seats for an event
async function getAvailableSeats(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const now = new Date();

  // Find all confirmed booked seats
  const bookedSeats = await Booking.find({
    eventId,
    status: 'CONFIRMED',
    paymentStatus: 'COMPLETED'
  }, { seats: 1 });

  // Find all temporarily locked seats
  const lockedSeats = await SeatLock.find({
    eventId,
    expiresAt: { $gt: now }
  }, { seatId: 1 });

  // Flatten booked seats array
  const bookedSeatIds = bookedSeats.flatMap(booking => booking.seats);

  // Flatten locked seat IDs
  const lockedSeatIds = lockedSeats.map(lock => lock.seatId);

  // Get unavailable seats (booked + locked)
  const unavailableSeatIds = new Set([...bookedSeatIds, ...lockedSeatIds]);

  // Get available seats
  const availableSeats = event.seats.filter(seat => !unavailableSeatIds.has(seat));

  return {
    eventId,
    totalSeats: event.seats.length,
    availableSeats: availableSeats,
    availableCount: availableSeats.length,
    bookedCount: bookedSeatIds.length,
    lockedCount: lockedSeatIds.length,
    eventName: event.name,
    eventDate: event.date,
    duration: event.duration
  };
}

// Insert new seats for an event
async function insertSeats(eventId, seatList, eventDate, duration) {
  if (!Array.isArray(seatList) || seatList.length === 0) {
    throw new Error('Seats must be a non-empty array');
  }

  if (!eventDate || !duration) {
    throw new Error('Event date and duration are required');
  }

  // Check if event exists and update with seats if needed
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Add new seats to the event if not already present
  const newSeats = seatList.filter(seat => !event.seats.includes(seat));
  if (newSeats.length > 0) {
    event.seats = [...event.seats, ...newSeats];
    event.date = eventDate;
    event.duration = duration;
    await event.save();
  }

  return {
    message: `${seatList.length} seats inserted successfully`,
    totalSeats: event.seats.length,
    eventDate,
    duration
  };
}

// Cancel a booking
async function cancelBooking(bookingId, eventDate, duration) {
  if (!bookingId || !eventDate || !duration) {
    throw new Error('Booking ID, event date, and duration are required');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'CANCELLED') {
    throw new Error('Booking is already cancelled');
  }

  // Update booking status to CANCELLED
  booking.status = 'CANCELLED';
  booking.canceledAt = new Date();
  await booking.save();

  // Remove seat locks for cancelled booking
  await SeatLock.deleteMany({
    eventId: booking.eventId,
    seatId: { $in: booking.seats }
  });

  return {
    message: 'Booking cancelled successfully',
    bookingId: booking._id,
    canceledSeats: booking.seats,
    eventDate,
    duration,
    canceledAt: booking.canceledAt,
    refundAmount: booking.paymentStatus === 'COMPLETED' ? booking.totalPrice : 0
  };
}

module.exports = { holdSeats, confirmBooking, insertSeats, cancelBooking, processPayment, getBookingPaymentDetails, setSeatPrice, createEvent, getAvailableSeats };
