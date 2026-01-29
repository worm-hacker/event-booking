# Database Setup and Migration Guide

## Prerequisites

- MySQL Server 5.7+ installed and running
- Node.js 14+ and npm installed
- Project dependencies installed (`npm install`)

## Environment Configuration

### 1. Create `.env` file

Copy `.env.example` and customize with your MySQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=event_booking_db

# Environment
NODE_ENV=development

# Server
PORT=3000
```

### 2. Database Creation

The database will be created automatically if it doesn't exist (requires user to have CREATE DATABASE privilege).

Alternatively, manually create the database:
```sql
CREATE DATABASE event_booking_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Migration Methods

### Method 1: Using Node.js Migration Script (Recommended)

#### Initial Setup
```bash
npm run migrate
```

This will:
- ✅ Test MySQL connection
- ✅ Create all tables automatically
- ✅ Display created tables

#### Fresh Start (Development Only)
```bash
npm run migrate:fresh
```

⚠️ **WARNING**: Drops all existing tables and recreates them. Use only in development!

### Method 2: Manual SQL Migration

Execute the SQL schema file directly:

```bash
mysql -h localhost -u root -p event_booking_db < scripts/schema.sql
```

Or in MySQL client:
```sql
SOURCE scripts/schema.sql;
```

### Method 3: Automatic Migration on App Start

The app automatically syncs models when started:
```bash
npm start
```

Models are synced with `alter: false` mode (doesn't modify existing tables).

## Database Schema

### Tables Created:

1. **events** - Event information with seat inventory
   - id (INT, Primary Key)
   - name, city, date, duration
   - seats (JSON array)
   - createdAt

2. **bookings** - Seat reservations and payment tracking
   - id (INT, Primary Key)
   - eventId (FK to events)
   - userId, seats, status, paymentStatus
   - totalPrice, seatPrice
   - paymentId, paymentDate
   - createdAt, updatedAt, canceledAt

3. **seatlocksqls** - Temporary seat holds (10-minute expiry)
   - id (INT, Primary Key)
   - eventId (FK to events)
   - seatId, expiresAt (indexed for cleanup)
   - createdAt

4. **prices** - Per-event seat pricing
   - id (INT, Primary Key)
   - eventId (UNIQUE FK to events)
   - seatPrice (default: 300 RS)
   - currency, createdAt, updatedAt

### View Created:

**booking_summary** - Summary view of all bookings with event details

```sql
SELECT 
  bookingId, eventName, city, eventDate, duration, userId, 
  seatCount, totalPrice, status, paymentStatus, createdAt
FROM booking_summary;
```

## Verification

### Check Tables Created:

```bash
mysql -h localhost -u root -p event_booking_db -e "SHOW TABLES;"
```

Expected output:
```
Tables_in_event_booking_db
bookings
events
prices
seatlocksqls
```

### Check Table Structure:

```bash
mysql -h localhost -u root -p event_booking_db -e "DESCRIBE events;"
```

### View Booking Summary:

```bash
mysql -h localhost -u root -p event_booking_db -e "SELECT * FROM booking_summary;"
```

## Troubleshooting

### Connection Error: "Unable to connect to database"

1. **Check MySQL is running:**
   ```bash
   # Windows
   sc query MySQL80
   
   # Linux/Mac
   mysql -u root -p -e "SELECT 1;"
   ```

2. **Verify credentials in `.env`:**
   - DB_HOST, DB_USER, DB_PASSWORD, DB_PORT
   - Test credentials manually:
     ```bash
     mysql -h <DB_HOST> -u <DB_USER> -p<DB_PASSWORD>
     ```

3. **Check user privileges:**
   ```sql
   -- Grant privileges (as root/admin)
   GRANT ALL PRIVILEGES ON event_booking_db.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Table Already Exists Error

If migration fails due to existing tables:

**Option 1:** Drop existing database and start fresh
```bash
npm run migrate:fresh
```

**Option 2:** Keep existing data and sync schema
- Modify `scripts/migrate.js` line 32:
```javascript
await sequelize.sync({ alter: true, logging: false });
```

### Foreign Key Constraint Errors

Ensure tables are created in correct order (handled automatically by migration scripts).

If issues persist:
1. Drop all tables: `npm run migrate:fresh`
2. Recreate: `npm run migrate`

## Next Steps

### 1. Run the Application
```bash
npm start
```

Server will start on port 3000 (or PORT in `.env`)

### 2. Run Tests
```bash
npm test
```

### 3. Try Sample API Calls

Create an event:
```bash
curl -X POST http://localhost:3000/api/bookings/event \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Concert 2026",
    "city": "Mumbai",
    "date": "2026-03-15T18:00:00Z",
    "duration": 120,
    "seats": ["A1", "A2", "A3", "B1", "B2"]
  }'
```

## Production Considerations

1. **Use `.env` file with secure credentials** (not in git)
2. **Enable query logging only in development:**
   ```javascript
   logging: process.env.NODE_ENV === 'development' ? console.log : false
   ```
3. **Use migration:fresh carefully** - only in dev/test environments
4. **Keep `alter: false`** in production to prevent accidental schema changes
5. **Implement proper backup strategy** for production database
6. **Use connection pooling** (already configured in db.js)

## Support

For issues or questions, check:
- `src/config/db.js` - Database connection configuration
- `src/models/` - Model definitions
- `scripts/schema.sql` - Complete schema documentation
