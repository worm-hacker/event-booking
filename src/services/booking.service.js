const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Get models from sequelize instance (lazy load to avoid circular dependency)
const getModels = () => ({
  SeatLock: sequelize.models.SeatLock,
  Booking: sequelize.models.Booking,
  Price: sequelize.models.Price,
  Event: sequelize.models.Event
});

const HOLD_TIME = 10 * 60 * 1000;
const DEFAULT_SEAT_PRICE = 300; // RS

// Cleanup expired locks periodically
setInterval(async () => {
  try {
    const { SeatLock } = getModels();
    
    // Check if SeatLock table has any documents
    const lockCount = await SeatLock.count();
    if (lockCount === 0) {
      console.log('No seat locks to cleanup');
      return;
    }

    const now = new Date();
    const result = await SeatLock.destroy({
      where: {
        expiresAt: { [Op.lt]: now }
      }
    });
    
    if (result > 0) {
      console.log(`${result} expired seat locks cleaned up`);
    } else {
      console.log('No expired seat locks found');
    }
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
  }
}, 60 * 1000); // Run every minute


async function holdSeats(eventId, seats, eventDate, duration) {
  const { SeatLock, Booking } = getModels();
  const now = new Date();
  
  // Check if seats are already booked with confirmed payment
  const bookedSeats = await Booking.findAll({
    where: {
      eventId,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED'
    }
  });

  // Flatten the seats from bookings
  const bookedSeatIds = bookedSeats.flatMap(b => JSON.parse(JSON.stringify(b.seats)));
  
  for (const seat of seats) {
    if (bookedSeatIds.includes(seat)) {
      throw new Error('One or more seats are already booked');
    }

    const existingLock = await SeatLock.findOne({
      where: {
        eventId,
        seatId: seat,
        expiresAt: { [Op.gt]: now }
      }
    });

    if (existingLock) {
      throw new Error(`Seat ${seat} is temporarily locked`);
    }
  }

  // Create locks for all seats
  const locks = seats.map(seat => ({
    eventId,
    seatId: seat,
    eventDate,
    duration,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  }));

  await SeatLock.bulkCreate(locks);
}

async function confirmBooking(eventId, seats, userId, eventDate, duration) {
  const { SeatLock, Booking, Price } = getModels();
  const now = new Date();

  // Check if any seats are already booked
  const bookedSeats = await Booking.findAll({
    where: {
      eventId,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED'
    }
  });

  const bookedSeatIds = bookedSeats.flatMap(b => JSON.parse(JSON.stringify(b.seats)));
  for (const seat of seats) {
    if (bookedSeatIds.includes(seat)) {
      throw new Error('One or more seats are already booked');
    }
  }

  // Check if seat locks exist and are valid
  const locks = await SeatLock.findAll({
    where: {
      eventId,
      seatId: { [Op.in]: seats },
      expiresAt: { [Op.gt]: now }
    }
  });

  if (locks.length !== seats.length) throw new Error('Seat lock expired');

  // Get seat price
  let priceInfo = await Price.findOne({ where: { eventId } });
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
  await SeatLock.destroy({
    where: {
      eventId,
      seatId: { [Op.in]: seats }
    }
  });

  return {
    bookingId: booking.id,
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
  const { SeatLock, Booking } = getModels();
  
  if (!bookingId || !paymentId) {
    throw new Error('Booking ID and Payment ID are required');
  }

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.paymentStatus === 'COMPLETED') {
    throw new Error('Payment already completed for this booking');
  }

  // Update payment status to COMPLETED
  booking.paymentStatus = 'COMPLETED';
  booking.paymentId = paymentId;
  booking.paymentDate = new Date();
  booking.status = 'CONFIRMED';
  await booking.save();

  // Create locks for booked seats
  const locks = booking.seats.map(seat => ({
    eventId: booking.eventId,
    seatId: seat,
    eventDate: booking.eventDate,
    duration: booking.duration,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  }));
  await SeatLock.bulkCreate(locks);

  return {
    message: 'Payment processed successfully. Seats are now confirmed.',
    bookingId: booking.id,
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
  const { Booking } = getModels();
  
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  return {
    bookingId: booking.id,
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
  const { Price } = getModels();
  
  if (!eventId || !seatPrice || seatPrice <= 0) {
    throw new Error('Event ID and valid seat price are required');
  }

  let priceInfo = await Price.findOne({ where: { eventId } });
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
  const { Event } = getModels();
  
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
  const { Event, Booking, SeatLock } = getModels();
  
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const now = new Date();

  // Find all confirmed booked seats
  const bookedSeats = await Booking.findAll({
    where: {
      eventId,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED'
    },
    attributes: ['seats']
  });

  // Find all temporarily locked seats
  const lockedSeats = await SeatLock.findAll({
    where: {
      eventId,
      expiresAt: { [Op.gt]: now }
    },
    attributes: ['seatId']
  });

  // Flatten booked seats array
  const bookedSeatIds = bookedSeats.flatMap(booking => JSON.parse(JSON.stringify(booking.seats)));

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
  const { Event } = getModels();
  
  if (!Array.isArray(seatList) || seatList.length === 0) {
    throw new Error('Seats must be a non-empty array');
  }

  if (!eventDate || !duration) {
    throw new Error('Event date and duration are required');
  }

  // Check if event exists and update with seats if needed
  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Add new seats to the event if not already present
  const currentSeats = event.seats || [];
  const newSeats = seatList.filter(seat => !currentSeats.includes(seat));
  if (newSeats.length > 0) {
    event.seats = [...currentSeats, ...newSeats];
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
  const { Booking, SeatLock } = getModels();
  
  if (!bookingId || !eventDate || !duration) {
    throw new Error('Booking ID, event date, and duration are required');
  }

  const booking = await Booking.findByPk(bookingId);
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
  await SeatLock.destroy({
    where: {
      eventId: booking.eventId,
      seatId: { [Op.in]: booking.seats }
    }
  });

  return {
    message: 'Booking cancelled successfully',
    bookingId: booking.id,
    canceledSeats: booking.seats,
    eventDate,
    duration,
    canceledAt: booking.canceledAt,
    refundAmount: booking.paymentStatus === 'COMPLETED' ? booking.totalPrice : 0
  };
}

module.exports = { holdSeats, confirmBooking, insertSeats, cancelBooking, processPayment, getBookingPaymentDetails, setSeatPrice, createEvent, getAvailableSeats };
