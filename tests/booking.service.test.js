const {
  holdSeats,
  confirmBooking,
  processPayment,
  getBookingPaymentDetails,
  setSeatPrice,
  createEvent,
  getAvailableSeats,
  insertSeats,
  cancelBooking
} = require('../src/services/booking.service');

const SeatLock = require('../src/models/SeatLock');
const Booking = require('../src/models/Booking');
const Price = require('../src/models/Price');
const Event = require('../src/models/Event');

// Mock all models
jest.mock('../src/models/SeatLock');
jest.mock('../src/models/Booking');
jest.mock('../src/models/Price');
jest.mock('../src/models/Event');

describe('Booking Service Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= CREATE EVENT TESTS =============
  describe('createEvent', () => {
    it('should create an event with all required fields', async () => {
      const mockEvent = {
        _id: 'event123',
        name: 'Concert',
        city: 'Mumbai',
        date: new Date('2026-02-15'),
        duration: 120,
        seats: ['A1', 'A2']
      };

      Event.create.mockResolvedValue(mockEvent);

      const result = await createEvent('Concert', 'Mumbai', new Date('2026-02-15'), 120, ['A1', 'A2']);

      expect(result).toEqual(mockEvent);
      expect(Event.create).toHaveBeenCalledWith({
        name: 'Concert',
        city: 'Mumbai',
        date: new Date('2026-02-15'),
        duration: 120,
        seats: ['A1', 'A2']
      });
    });

    it('should create event with default empty seats array', async () => {
      const mockEvent = {
        _id: 'event123',
        name: 'Concert',
        city: 'Mumbai',
        date: new Date('2026-02-15'),
        duration: 120,
        seats: []
      };

      Event.create.mockResolvedValue(mockEvent);

      const result = await createEvent('Concert', 'Mumbai', new Date('2026-02-15'), 120);

      expect(result.seats).toEqual([]);
      expect(Event.create).toHaveBeenCalled();
    });

    it('should throw error when name is missing', async () => {
      await expect(createEvent(null, 'Mumbai', new Date('2026-02-15'), 120))
        .rejects.toThrow('Event name, date and duration are required');
    });

    it('should throw error when date is missing', async () => {
      await expect(createEvent('Concert', 'Mumbai', null, 120))
        .rejects.toThrow('Event name, date and duration are required');
    });

    it('should throw error when duration is missing', async () => {
      await expect(createEvent('Concert', 'Mumbai', new Date('2026-02-15'), null))
        .rejects.toThrow('Event name, date and duration are required');
    });
  });

  // ============= HOLD SEATS TESTS =============
  describe('holdSeats', () => {
    it('should hold seats successfully', async () => {
      const eventId = 'event123';
      const seats = ['A1', 'A2'];
      const eventDate = new Date('2026-02-15');
      const duration = 120;

      Booking.find.mockResolvedValue([]);
      SeatLock.findOne.mockResolvedValue(null);
      SeatLock.insertMany.mockResolvedValue([]);

      await holdSeats(eventId, seats, eventDate, duration);

      expect(Booking.find).toHaveBeenCalledWith({
        eventId,
        seats: { $in: seats },
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED'
      });
      expect(SeatLock.insertMany).toHaveBeenCalled();
    });

    it('should throw error if seats are already booked', async () => {
      const eventId = 'event123';
      const seats = ['A1'];

      Booking.find.mockResolvedValue([{ seats: ['A1'] }]);

      await expect(holdSeats(eventId, seats, new Date('2026-02-15'), 120))
        .rejects.toThrow('One or more seats are already booked');
    });

    it('should throw error if seats are locked', async () => {
      const eventId = 'event123';
      const seats = ['A1'];

      Booking.find.mockResolvedValue([]);
      SeatLock.findOne.mockResolvedValue({ seatId: 'A1' });

      await expect(holdSeats(eventId, seats, new Date('2026-02-15'), 120))
        .rejects.toThrow('Seat A1 is temporarily locked');
    });
  });

  // ============= CONFIRM BOOKING TESTS =============
  describe('confirmBooking', () => {
    it('should create booking with PENDING payment status', async () => {
      const eventId = 'event123';
      const seats = ['A1', 'A2'];
      const userId = 'user456';
      const eventDate = new Date('2026-02-15');
      const duration = 120;

      const mockBooking = {
        _id: 'booking123',
        eventId,
        userId,
        seats,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalPrice: 600,
        seatPrice: 300
      };

      Booking.find.mockResolvedValue([]);
      SeatLock.find.mockResolvedValue([{}, {}]);
      Price.findOne.mockResolvedValue({ seatPrice: 300 });
      Booking.create.mockResolvedValue(mockBooking);
      SeatLock.deleteMany.mockResolvedValue({});

      const result = await confirmBooking(eventId, seats, userId, eventDate, duration);

      expect(result.bookingId).toBe('booking123');
      expect(result.paymentStatus).toBe('PENDING');
      expect(result.totalPrice).toBe(600);
      expect(Booking.create).toHaveBeenCalled();
    });

    it('should use default seat price if not set', async () => {
      Booking.find.mockResolvedValue([]);
      SeatLock.find.mockResolvedValue([{}, {}]);
      Price.findOne.mockResolvedValue(null); // No price set
      Booking.create.mockResolvedValue({ _id: 'booking123', seats: ['A1', 'A2'] });
      SeatLock.deleteMany.mockResolvedValue({});

      const result = await confirmBooking('event123', ['A1', 'A2'], 'user456', new Date('2026-02-15'), 120);

      expect(result.seatPrice).toBe(300); // DEFAULT_SEAT_PRICE
      expect(result.totalPrice).toBe(600); // 2 * 300
    });

    it('should throw error if seats are already booked', async () => {
      Booking.find.mockResolvedValue([{ seats: ['A1'] }]);

      await expect(confirmBooking('event123', ['A1'], 'user456', new Date('2026-02-15'), 120))
        .rejects.toThrow('One or more seats are already booked');
    });

    it('should throw error if seat lock expired', async () => {
      Booking.find.mockResolvedValue([]);
      SeatLock.find.mockResolvedValue([]); // No locks (expired)

      await expect(confirmBooking('event123', ['A1', 'A2'], 'user456', new Date('2026-02-15'), 120))
        .rejects.toThrow('Seat lock expired');
    });
  });

  // ============= PROCESS PAYMENT TESTS =============
  describe('processPayment', () => {
    it('should process payment and confirm booking', async () => {
      const bookingId = 'booking123';
      const paymentId = 'PAY123';
      const eventDate = new Date('2026-02-15');
      const duration = 120;

      const mockBooking = {
        _id: bookingId,
        eventId: 'event123',
        seats: ['A1', 'A2'],
        paymentStatus: 'PENDING',
        status: 'PENDING',
        eventDate,
        duration,
        totalPrice: 600,
        save: jest.fn().mockResolvedValue({})
      };

      Booking.findById.mockResolvedValue(mockBooking);
      SeatLock.insertMany.mockResolvedValue([]);

      const result = await processPayment(bookingId, paymentId, eventDate, duration);

      expect(result.message).toContain('Payment processed successfully');
      expect(result.paymentStatus).toBe('COMPLETED');
      expect(result.status).toBe('CONFIRMED');
      expect(mockBooking.save).toHaveBeenCalled();
    });

    it('should throw error if booking not found', async () => {
      Booking.findById.mockResolvedValue(null);

      await expect(processPayment('invalid', 'PAY123', new Date('2026-02-15'), 120))
        .rejects.toThrow('Booking not found');
    });

    it('should throw error if payment already processed', async () => {
      const mockBooking = {
        paymentStatus: 'COMPLETED'
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await expect(processPayment('booking123', 'PAY123', new Date('2026-02-15'), 120))
        .rejects.toThrow('Payment already completed for this booking');
    });

    it('should throw error if booking ID or payment ID missing', async () => {
      await expect(processPayment(null, 'PAY123', new Date('2026-02-15'), 120))
        .rejects.toThrow('Booking ID and Payment ID are required');

      await expect(processPayment('booking123', null, new Date('2026-02-15'), 120))
        .rejects.toThrow('Booking ID and Payment ID are required');
    });
  });

  // ============= GET BOOKING PAYMENT DETAILS TESTS =============
  describe('getBookingPaymentDetails', () => {
    it('should return booking payment details', async () => {
      const mockBooking = {
        _id: 'booking123',
        seats: ['A1', 'A2'],
        seatPrice: 300,
        totalPrice: 600,
        paymentStatus: 'COMPLETED',
        status: 'CONFIRMED',
        eventDate: new Date('2026-02-15'),
        duration: 120
      };

      Booking.findById.mockResolvedValue(mockBooking);

      const result = await getBookingPaymentDetails('booking123');

      expect(result.bookingId).toBe('booking123');
      expect(result.totalPrice).toBe(600);
      expect(result.paymentStatus).toBe('COMPLETED');
    });

    it('should throw error if booking not found', async () => {
      Booking.findById.mockResolvedValue(null);

      await expect(getBookingPaymentDetails('invalid'))
        .rejects.toThrow('Booking not found');
    });
  });

  // ============= SET SEAT PRICE TESTS =============
  describe('setSeatPrice', () => {
    it('should set seat price for new event', async () => {
      Price.findOne.mockResolvedValue(null);
      Price.create.mockResolvedValue({ eventId: 'event123', seatPrice: 500 });

      const result = await setSeatPrice('event123', 500);

      expect(result.message).toContain('updated successfully');
      expect(result.seatPrice).toBe(500);
      expect(Price.create).toHaveBeenCalledWith({
        eventId: 'event123',
        seatPrice: 500
      });
    });

    it('should update existing seat price', async () => {
      const mockPrice = {
        seatPrice: 300,
        updatedAt: null,
        save: jest.fn().mockResolvedValue({})
      };

      Price.findOne.mockResolvedValue(mockPrice);

      const result = await setSeatPrice('event123', 400);

      expect(result.seatPrice).toBe(400);
      expect(mockPrice.seatPrice).toBe(400);
      expect(mockPrice.save).toHaveBeenCalled();
    });

    it('should throw error if event ID missing', async () => {
      await expect(setSeatPrice(null, 500))
        .rejects.toThrow('Event ID and valid seat price are required');
    });

    it('should throw error if price is invalid', async () => {
      await expect(setSeatPrice('event123', 0))
        .rejects.toThrow('Event ID and valid seat price are required');

      await expect(setSeatPrice('event123', -100))
        .rejects.toThrow('Event ID and valid seat price are required');
    });
  });

  // ============= GET AVAILABLE SEATS TESTS =============
  describe('getAvailableSeats', () => {
    it('should return available seats for event', async () => {
      const mockEvent = {
        _id: 'event123',
        name: 'Concert',
        date: new Date('2026-02-15'),
        duration: 120,
        seats: ['A1', 'A2', 'B1', 'B2']
      };

      Event.findById.mockResolvedValue(mockEvent);
      Booking.find.mockResolvedValue([
        { seats: ['A1'] },
        { seats: ['A2'] }
      ]);
      SeatLock.find.mockResolvedValue([
        { seatId: 'B1' }
      ]);

      const result = await getAvailableSeats('event123');

      expect(result.totalSeats).toBe(4);
      expect(result.availableCount).toBe(1); // Only B2 available
      expect(result.bookedCount).toBe(2); // A1, A2
      expect(result.lockedCount).toBe(1); // B1
      expect(result.availableSeats).toContain('B2');
    });

    it('should return all seats available if none booked or locked', async () => {
      const mockEvent = {
        _id: 'event123',
        name: 'Concert',
        date: new Date('2026-02-15'),
        duration: 120,
        seats: ['A1', 'A2', 'B1']
      };

      Event.findById.mockResolvedValue(mockEvent);
      Booking.find.mockResolvedValue([]);
      SeatLock.find.mockResolvedValue([]);

      const result = await getAvailableSeats('event123');

      expect(result.availableCount).toBe(3);
      expect(result.bookedCount).toBe(0);
      expect(result.lockedCount).toBe(0);
    });

    it('should throw error if event ID missing', async () => {
      await expect(getAvailableSeats(null))
        .rejects.toThrow('Event ID is required');
    });

    it('should throw error if event not found', async () => {
      Event.findById.mockResolvedValue(null);

      await expect(getAvailableSeats('invalid'))
        .rejects.toThrow('Event not found');
    });
  });

  // ============= INSERT SEATS TESTS =============
  describe('insertSeats', () => {
    it('should insert new seats to event', async () => {
      const mockEvent = {
        _id: 'event123',
        seats: ['A1', 'A2'],
        date: null,
        duration: null,
        save: jest.fn().mockResolvedValue({})
      };

      Event.findById.mockResolvedValue(mockEvent);

      const result = await insertSeats('event123', ['B1', 'B2'], new Date('2026-02-15'), 120);

      expect(mockEvent.seats).toContain('B1');
      expect(mockEvent.seats).toContain('B2');
      expect(result.totalSeats).toBe(4);
      expect(mockEvent.save).toHaveBeenCalled();
    });

    it('should not add duplicate seats', async () => {
      const mockEvent = {
        _id: 'event123',
        seats: ['A1', 'A2'],
        date: null,
        duration: null,
        save: jest.fn().mockResolvedValue({})
      };

      Event.findById.mockResolvedValue(mockEvent);

      const result = await insertSeats('event123', ['A1', 'B1'], new Date('2026-02-15'), 120);

      expect(mockEvent.seats.length).toBe(3); // A1, A2, B1 (not duplicated A1)
      expect(result.message).toContain('2 seats inserted'); // Count of input seats
    });

    it('should throw error if seats array empty', async () => {
      await expect(insertSeats('event123', [], new Date('2026-02-15'), 120))
        .rejects.toThrow('Seats must be a non-empty array');
    });

    it('should throw error if event date missing', async () => {
      await expect(insertSeats('event123', ['A1'], null, 120))
        .rejects.toThrow('Event date and duration are required');
    });

    it('should throw error if duration missing', async () => {
      await expect(insertSeats('event123', ['A1'], new Date('2026-02-15'), null))
        .rejects.toThrow('Event date and duration are required');
    });

    it('should throw error if event not found', async () => {
      Event.findById.mockResolvedValue(null);

      await expect(insertSeats('invalid', ['A1'], new Date('2026-02-15'), 120))
        .rejects.toThrow('Event not found');
    });
  });

  // ============= CANCEL BOOKING TESTS =============
  describe('cancelBooking', () => {
    it('should cancel booking and calculate refund', async () => {
      const mockBooking = {
        _id: 'booking123',
        eventId: 'event123',
        seats: ['A1', 'A2'],
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        totalPrice: 600,
        canceledAt: null,
        save: jest.fn().mockResolvedValue({})
      };

      Booking.findById.mockResolvedValue(mockBooking);
      SeatLock.deleteMany.mockResolvedValue({});

      const result = await cancelBooking('booking123', new Date('2026-02-15'), 120);

      expect(result.message).toContain('cancelled successfully');
      expect(result.refundAmount).toBe(600);
      expect(mockBooking.status).toBe('CANCELLED');
      expect(mockBooking.save).toHaveBeenCalled();
    });

    it('should cancel booking with no refund if payment pending', async () => {
      const mockBooking = {
        _id: 'booking123',
        eventId: 'event123',
        seats: ['A1'],
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        totalPrice: 300,
        canceledAt: null,
        save: jest.fn().mockResolvedValue({})
      };

      Booking.findById.mockResolvedValue(mockBooking);
      SeatLock.deleteMany.mockResolvedValue({});

      const result = await cancelBooking('booking123', new Date('2026-02-15'), 120);

      expect(result.refundAmount).toBe(0);
    });

    it('should throw error if booking not found', async () => {
      Booking.findById.mockResolvedValue(null);

      await expect(cancelBooking('invalid', new Date('2026-02-15'), 120))
        .rejects.toThrow('Booking not found');
    });

    it('should throw error if booking already cancelled', async () => {
      const mockBooking = {
        status: 'CANCELLED'
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await expect(cancelBooking('booking123', new Date('2026-02-15'), 120))
        .rejects.toThrow('Booking is already cancelled');
    });

    it('should throw error if required params missing', async () => {
      await expect(cancelBooking(null, new Date('2026-02-15'), 120))
        .rejects.toThrow('Booking ID, event date, and duration are required');

      await expect(cancelBooking('booking123', null, 120))
        .rejects.toThrow('Booking ID, event date, and duration are required');

      await expect(cancelBooking('booking123', new Date('2026-02-15'), null))
        .rejects.toThrow('Booking ID, event date, and duration are required');
    });
  });
});
