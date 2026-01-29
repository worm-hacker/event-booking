const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: String,
  city: String,
  date: { type: Date, required: true },
  duration: { type: Number, required: true }, // Duration in minutes
  seats: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
