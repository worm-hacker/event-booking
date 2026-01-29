const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  eventId: String,
  userId: String,
  seats: [String],
  status: String,
  eventDate: { type: Date, required: true },
  duration: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  seatPrice: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  paymentId: { type: String, default: null },
  paymentDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  canceledAt: { type: Date, default: null }
});

module.exports = mongoose.model('Booking', BookingSchema);
