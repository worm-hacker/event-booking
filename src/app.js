const express = require('express');
const bookingRoutes = require('./routes/booking.routes');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(express.json());
app.use('/api/bookings', bookingRoutes);

module.exports = app;
