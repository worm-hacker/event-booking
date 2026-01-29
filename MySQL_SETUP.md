# MySQL Setup & Troubleshooting Guide

## Access Denied Error - Solutions

### 1️⃣ Check MySQL is Running

**Windows:**
```cmd
# Check if MySQL service is running
sc query MySQL80

# Or start MySQL service
net start MySQL80
```

**Or via MySQL command:**
```bash
mysql -u root -p -e "SELECT 1;"
```

---

## 2️⃣ Verify Credentials in .env

Make sure your `.env` file has the correct MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root          # Change this to your MySQL password
DB_NAME=event_booking_db
NODE_ENV=development
PORT=3000
```

---

## 3️⃣ Reset MySQL Root Password (if forgotten)

### On Windows:

**Step 1: Stop MySQL Service**
```cmd
net stop MySQL80
```

**Step 2: Start MySQL without password**
```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld" --skip-grant-tables
```

**Step 3: In another terminal, connect to MySQL**
```cmd
mysql -u root
```

**Step 4: Reset password**
```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
EXIT;
```

**Step 5: Restart MySQL normally**
```cmd
net start MySQL80
```

---

## 4️⃣ Create Database & User

### Option A: Using Script (Recommended)

```bash
# Run as Administrator in Command Prompt
mysql -u root -p < scripts/setup-mysql.sql
```

### Option B: Manual SQL Commands

```bash
# Connect to MySQL
mysql -u root -p
```

Then run:
```sql
-- Create database
CREATE DATABASE IF NOT EXISTS event_booking_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'root';

-- Grant privileges
GRANT ALL PRIVILEGES ON event_booking_db.* TO 'root'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SELECT 1;
```

---

## 5️⃣ Test Connection Before Migration

```bash
# Test with mysql command line
mysql -h localhost -u root -proot event_booking_db -e "SELECT 1;"

# Or use Node.js to test
node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'event_booking_db'
});
conn.connect((err) => {
  if (err) console.error('❌ Connection failed:', err.message);
  else console.log('✅ Connection successful!');
  conn.end();
});
"
```

---

## 6️⃣ Common Issues & Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| `AccessDeniedError` | Wrong password | Update DB_PASSWORD in .env |
| `connect ECONNREFUSED` | MySQL not running | Start MySQL service |
| `ER_BAD_DB_ERROR` | Database doesn't exist | Create database with setup script |
| `ER_NO_SUCH_TABLE` | Tables not created | Run `npm run migrate` |
| `Host 'xxx' is not allowed` | Connection from wrong host | Use `'root'@'%'` in GRANT (insecure!) |

---

## 7️⃣ Full Setup Procedure

Follow these steps in order:

```bash
# Step 1: Ensure MySQL is running (Windows)
net start MySQL80

# Step 2: Create database and user
mysql -u root -p < scripts/setup-mysql.sql

# Step 3: Create .env file (already done)
# Edit .env with correct credentials

# Step 4: Test connection
mysql -h localhost -u root -proot event_booking_db -e "SELECT 1;"

# Step 5: Install Node dependencies
npm install

# Step 6: Run migration to create tables
npm run migrate

# Step 7: Start the application
npm start
```

---

## 8️⃣ Production Notes

**NEVER use this in production:**
- Root user for application
- Password 'root'
- No firewall restrictions

**Instead create dedicated user:**
```sql
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'complex_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON event_booking_db.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
```

Then update `.env`:
```env
DB_USER=app_user
DB_PASSWORD=complex_password_here
```

---

## 9️⃣ MySQL Location on Windows

- **Default Path:** `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql`
- **Service Name:** MySQL80 (may vary by version)
- **Config File:** `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`

---

## 🔟 Still Having Issues?

Check MySQL error log:
```
C:\ProgramData\MySQL\MySQL Server 8.0\Data\[hostname].err
```

Or run MySQL diagnostics:
```bash
mysql_upgrade -u root -p
```

And verify MySQL version:
```bash
mysql -V
```
