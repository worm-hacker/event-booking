const { Sequelize } = require('sequelize');

// MySQL Database connection using Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'event_booking_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'Manish@123456',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Initialize models
const initializeModels = () => {
  require('../models/Event')(sequelize);
  require('../models/Booking')(sequelize);
  require('../models/SeatLock')(sequelize);
  require('../models/Price')(sequelize);
};

// Test the connection
const connectDB = async () => {
  try {
    // Initialize models before authentication
    initializeModels();
    
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully');
    
    // Sync models with database
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
