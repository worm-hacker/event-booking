# Quick Start - Database Setup

## 1️⃣ Configure Database

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your MySQL credentials:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=event_booking_db
```

## 2️⃣ Run Migration

```bash
# Option A: NPM script (Recommended)
npm run migrate

# Option B: Node script directly
node scripts/migrate.js

# Option C: Fresh start (drops all tables)
npm run migrate:fresh

# Option D: Manual SQL
mysql -u root -p event_booking_db < scripts/schema.sql
```

## 3️⃣ Verify Setup

```bash
# Check tables exist
mysql -u root -p event_booking_db -e "SHOW TABLES;"

# Start the app
npm start
```

---

## Available NPM Commands

| Command | Purpose |
|---------|---------|
| `npm run migrate` | Create/sync tables (safe, preserves data) |
| `npm run migrate:fresh` | Drop and recreate all tables ⚠️ |
| `npm run setup` | Install deps + migrate (first time setup) |
| `npm start` | Start API server |
| `npm test` | Run test suite with coverage |

---

## Tables Created

✅ **events** - Event information  
✅ **bookings** - Seat reservations  
✅ **seatlocksqls** - Temporary holds (10 min)  
✅ **prices** - Per-event pricing  
✅ **booking_summary** - Summary view  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to MySQL | Ensure MySQL is running, check credentials in `.env` |
| "Database doesn't exist" | User needs CREATE DATABASE privilege |
| "Table already exists" | Run `npm run migrate:fresh` to reset |
| Foreign key errors | Use `npm run migrate:fresh` to recreate in order |

---

## Production Checklist

- [ ] Use strong password in `.env`
- [ ] Add `.env` to `.gitignore` (not committed)
- [ ] Use `alter: false` in production
- [ ] Set `NODE_ENV=production`
- [ ] Enable error logging
- [ ] Backup database regularly
- [ ] Test restore procedures
- [ ] Monitor connection pool usage
