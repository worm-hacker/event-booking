const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.STRING(9),
      allowNull: false,
      index: true
    },
    userId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      index: true
    },
    seats: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of booked seat IDs'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
      defaultValue: 'PENDING',
      index: true
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in minutes'
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    seatPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
      defaultValue: 'PENDING',
      index: true
    },
    paymentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    canceledAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'bookings',
    timestamps: false
  });

  return Booking;
};
