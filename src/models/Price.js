const mongoose = require('mongoose');

const PriceSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  seatPrice: { type: Number, required: true, default: 300 }, // Price in RS
  currency: { type: String, default: 'RS' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Price', PriceSchema);
