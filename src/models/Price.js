const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Price = sequelize.define('Price', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.STRING(9),
      allowNull: false,
      unique: true,
      index: true
    },
    seatPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 300,
      comment: 'Price in RS'
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'RS'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'prices',
    timestamps: false
  });

  return Price;
};
