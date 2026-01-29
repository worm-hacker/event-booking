#!/usr/bin/env node

/**
 * Fresh Database Migration Script
 * WARNING: This script DROPS all existing tables and recreates them
 * Use only for development/testing, NOT for production!
 * 
 * Usage:
 *   node scripts/migrate-fresh.js
 *   npm run migrate:fresh
 */

require('dotenv').config();
const { sequelize, connectDB } = require('../src/config/db');

async function runFreshMigration() {
  try {
    console.log('⚠️  FRESH MIGRATION - This will DROP all existing tables!\n');
    
    // Initialize models
    const initializeModels = () => {
      require('../src/models/Event')(sequelize);
      require('../src/models/Booking')(sequelize);
      require('../src/models/SeatLock')(sequelize);
      require('../src/models/Price')(sequelize);
    };
    
    initializeModels();

    // Test connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Drop all tables
    console.log('🗑️  Dropping existing tables...');
    await sequelize.drop({ logging: false });
    console.log('✅ All tables dropped\n');

    // Sync models with database
    console.log('📋 Creating fresh tables...');
    await sequelize.sync({ logging: false });
    console.log('✅ All tables created successfully\n');

    // Display table information
    const models = sequelize.models;
    console.log('📊 Database Tables Created:');
    console.log('─'.repeat(50));
    Object.keys(models).forEach(modelName => {
      const model = models[modelName];
      console.log(`  ✓ ${model.tableName} (${modelName})`);
    });
    console.log('─'.repeat(50));

    console.log('\n✨ Fresh migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fresh migration failed:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MySQL server is running');
    console.error('2. Check database credentials in .env file');
    console.error('3. Verify user has DROP and CREATE privileges');
    process.exit(1);
  }
}

// Run fresh migration
runFreshMigration();
