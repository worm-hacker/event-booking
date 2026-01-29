const mongoose = require('mongoose');

const SeatLockSchema = new mongoose.Schema({
  eventId: String,
  seatId: String,
  eventDate: { type: Date, required: true },
  duration: { type: Number, required: true },
  expiresAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 600 } }
});

module.exports = mongoose.model('SeatLock', SeatLockSchema);
