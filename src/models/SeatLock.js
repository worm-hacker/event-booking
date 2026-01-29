const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SeatLock = sequelize.define('SeatLock', {
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
    seatId: {
      type: DataTypes.STRING(50),
      allowNull: false
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
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      index: true
    }
  }, {
    tableName: 'seat_locks',
    timestamps: false,
    hooks: {
      beforeCreate: async (seatLock) => {
        // Auto-delete expired locks
        const now = new Date();
        if (seatLock.expiresAt < now) {
          throw new Error('Lock expiration time is in the past');
        }
      }
    }
  });

  return SeatLock;
};
