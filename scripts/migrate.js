#!/usr/bin/env node

/**
 * Database Migration Script
 * Run this script to create/sync all database tables with MySQL
 * 
 * Usage:
 *   node scripts/migrate.js
 *   npm run migrate
 */

require('dotenv').config();
const { sequelize, connectDB } = require('../src/config/db');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...\n');

    // Connect and migrate
    await connectDB();

    // Display table information
    const models = sequelize.models;
    console.log('\n📊 Database Tables Created:');
    console.log('─'.repeat(50));
    Object.keys(models).forEach(modelName => {
      const model = models[modelName];
      console.log(`  ✓ ${model.tableName} (${modelName})`);
    });
    console.log('─'.repeat(50));

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MySQL server is running');
    console.error('2. Check database credentials in .env file');
    console.error('3. Verify database exists or credentials have CREATE DATABASE privilege');
    process.exit(1);
  }
}

// Run migration
runMigration();
