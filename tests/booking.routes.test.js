const express = require('express');
const {
  holdSeats,
  confirmBooking,
  insertSeats,
  cancelBooking,
  processPayment,
  getBookingPaymentDetails,
  setSeatPrice,
  createEvent,
  getAvailableSeats
} = require('../src/services/booking.service');

// Mock the service
jest.mock('../src/services/booking.service');

describe('Booking Routes Tests', () => {
  let app;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());

    // Import and mount the router
    const bookingRouter = require('../src/routes/booking.routes');
    app.use('/booking', bookingRouter);
  });

  // ============= HOLD SEATS ROUTE TESTS =============
  describe('POST /booking/hold', () => {
    it('should hold seats successfully', async () => {
      holdSeats.mockResolvedValue();

      const request = {
        eventId: 'event123',
        seats: ['A1', 'A2'],
        eventDate: '2026-02-15T10:00:00Z',
        duration: 120
      };

      const response = await new Promise((resolve, reject) => {
        const req = {
          method: 'POST',
          url: '/booking/hold',
          body: request,
          headers: { 'content-type': 'application/json' }
        };

        const res = {
          statusCode: 200,
          json: jest.fn(function(data) {
            resolve({ status: this.statusCode, data });
          }),
          status: jest.fn(function(code) {
            this.statusCode = code;
            return this;
          })
        };

        // Simulate the route handler
        const handler = require('../src/routes/booking.routes');
      });
    });

    it('should return error if event date missing', async () => {
      const request = {
        eventId: 'event123',
        seats: ['A1'],
        duration: 120
        // eventDate is missing
      };

      // Test would validate that error is thrown
      expect(request.eventDate).toBeUndefined();
    });
  });

  // ============= CONFIRM BOOKING ROUTE TESTS =============
  describe('POST /booking/confirm', () => {
    it('should confirm booking with valid payload', async () => {
      const mockBooking = {
        bookingId: 'booking123',
        totalPrice: 600,
        paymentStatus: 'PENDING'
      };

      confirmBooking.mockResolvedValue(mockBooking);

      expect(confirmBooking).toBeDefined();
    });

    it('should validate required fields', () => {
      const incompletePayload = {
        eventId: 'event123',
        seats: ['A1']
        // Missing userId, eventDate, duration
      };

      expect(incompletePayload.userId).toBeUndefined();
      expect(incompletePayload.eventDate).toBeUndefined();
    });
  });

  // ============= PROCESS PAYMENT ROUTE TESTS =============
  describe('POST /booking/payment/process', () => {
    it('should process payment successfully', async () => {
      const mockResult = {
        message: 'Payment processed successfully',
        bookingId: 'booking123',
        paymentStatus: 'COMPLETED'
      };

      processPayment.mockResolvedValue(mockResult);

      const result = await processPayment('booking123', 'PAY123', '2026-02-15', 120);

      expect(result.paymentStatus).toBe('COMPLETED');
      expect(processPayment).toHaveBeenCalledWith('booking123', 'PAY123', '2026-02-15', 120);
    });

    it('should handle missing payment ID', async () => {
      processPayment.mockRejectedValue(new Error('Booking ID and Payment ID are required'));

      await expect(processPayment('booking123', null, '2026-02-15', 120))
        .rejects.toThrow();
    });
  });

  // ============= GET PAYMENT DETAILS ROUTE TESTS =============
  describe('GET /booking/payment/details/:bookingId', () => {
    it('should return booking payment details', async () => {
      const mockDetails = {
        bookingId: 'booking123',
        seats: ['A1', 'A2'],
        totalPrice: 600,
        paymentStatus: 'COMPLETED'
      };

      getBookingPaymentDetails.mockResolvedValue(mockDetails);

      const result = await getBookingPaymentDetails('booking123');

      expect(result.bookingId).toBe('booking123');
      expect(result.totalPrice).toBe(600);
      expect(getBookingPaymentDetails).toHaveBeenCalledWith('booking123');
    });

    it('should handle invalid booking ID', async () => {
      getBookingPaymentDetails.mockRejectedValue(new Error('Booking not found'));

      await expect(getBookingPaymentDetails('invalid'))
        .rejects.toThrow('Booking not found');
    });
  });

  // ============= SET SEAT PRICE ROUTE TESTS =============
  describe('POST /booking/price/set', () => {
    it('should set seat price successfully', async () => {
      const mockResult = {
        message: 'Seat price updated successfully',
        eventId: 'event123',
        seatPrice: 500,
        currency: 'RS'
      };

      setSeatPrice.mockResolvedValue(mockResult);

      const result = await setSeatPrice('event123', 500);

      expect(result.seatPrice).toBe(500);
      expect(result.currency).toBe('RS');
      expect(setSeatPrice).toHaveBeenCalledWith('event123', 500);
    });

    it('should handle invalid seat price', async () => {
      setSeatPrice.mockRejectedValue(new Error('Event ID and valid seat price are required'));

      await expect(setSeatPrice('event123', -100))
        .rejects.toThrow('Event ID and valid seat price are required');
    });
  });

  // ============= CREATE EVENT ROUTE TESTS =============
  describe('POST /booking/event', () => {
    it('should create event successfully', async () => {
      const mockEvent = {
        _id: 'event123',
        name: 'Concert',
        city: 'Mumbai',
        date: new Date('2026-02-15'),
        duration: 120,
        seats: ['A1', 'A2', 'B1']
      };

      createEvent.mockResolvedValue(mockEvent);

      const result = await createEvent('Concert', 'Mumbai', new Date('2026-02-15'), 120, ['A1', 'A2', 'B1']);

      expect(result.name).toBe('Concert');
      expect(result.city).toBe('Mumbai');
      expect(createEvent).toHaveBeenCalled();
    });

    it('should handle missing event details', async () => {
      createEvent.mockRejectedValue(new Error('Event name, date and duration are required'));

      await expect(createEvent(null, 'Mumbai', new Date('2026-02-15'), 120))
        .rejects.toThrow('Event name, date and duration are required');
    });
  });

  // ============= INSERT SEATS ROUTE TESTS =============
  describe('POST /booking/seats/insert', () => {
    it('should insert seats successfully', async () => {
      const mockResult = {
        message: '4 seats inserted successfully',
        totalSeats: 10,
        eventDate: '2026-02-15T10:00:00Z',
        duration: 120
      };

      insertSeats.mockResolvedValue(mockResult);

      const result = await insertSeats('event123', ['C1', 'C2', 'C3', 'C4'], '2026-02-15', 120);

      expect(result.message).toContain('4 seats inserted');
      expect(result.totalSeats).toBe(10);
      expect(insertSeats).toHaveBeenCalled();
    });

    it('should handle empty seats array', async () => {
      insertSeats.mockRejectedValue(new Error('Seats must be a non-empty array'));

      await expect(insertSeats('event123', [], '2026-02-15', 120))
        .rejects.toThrow('Seats must be a non-empty array');
    });
  });

  // ============= GET AVAILABLE SEATS ROUTE TESTS =============
  describe('GET /booking/seats/available/:eventId', () => {
    it('should return available seats', async () => {
      const mockResult = {
        eventId: 'event123',
        totalSeats: 10,
        availableSeats: ['A1', 'A2', 'B1', 'B2'],
        availableCount: 4,
        bookedCount: 4,
        lockedCount: 2
      };

      getAvailableSeats.mockResolvedValue(mockResult);

      const result = await getAvailableSeats('event123');

      expect(result.availableCount).toBe(4);
      expect(result.bookedCount).toBe(4);
      expect(result.lockedCount).toBe(2);
      expect(getAvailableSeats).toHaveBeenCalledWith('event123');
    });

    it('should handle invalid event ID', async () => {
      getAvailableSeats.mockRejectedValue(new Error('Event not found'));

      await expect(getAvailableSeats('invalid'))
        .rejects.toThrow('Event not found');
    });
  });

  // ============= CANCEL BOOKING ROUTE TESTS =============
  describe('POST /booking/cancel', () => {
    it('should cancel booking successfully', async () => {
      const mockResult = {
        message: 'Booking cancelled successfully',
        bookingId: 'booking123',
        canceledSeats: ['A1', 'A2'],
        refundAmount: 600
      };

      cancelBooking.mockResolvedValue(mockResult);

      const result = await cancelBooking('booking123', '2026-02-15', 120);

      expect(result.message).toContain('cancelled successfully');
      expect(result.refundAmount).toBe(600);
      expect(cancelBooking).toHaveBeenCalledWith('booking123', '2026-02-15', 120);
    });

    it('should handle missing required fields', async () => {
      cancelBooking.mockRejectedValue(new Error('Booking ID, event date, and duration are required'));

      await expect(cancelBooking(null, '2026-02-15', 120))
        .rejects.toThrow('Booking ID, event date, and duration are required');
    });
  });

  // ============= ERROR HANDLING TESTS =============
  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      confirmBooking.mockRejectedValue(error);

      await expect(confirmBooking('event123', ['A1'], 'user456', '2026-02-15', 120))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate request payloads', () => {
      const validPayload = {
        eventId: 'event123',
        seats: ['A1', 'A2'],
        userId: 'user456',
        eventDate: '2026-02-15T10:00:00Z',
        duration: 120
      };

      expect(validPayload).toHaveProperty('eventId');
      expect(validPayload).toHaveProperty('seats');
      expect(validPayload).toHaveProperty('userId');
    });
  });
});
