# Event Booking System - System Design & Architecture

**Version:** 1.0 | **Date:** January 29, 2026 | **Status:** Production Ready

---

## 1. HIGH-LEVEL DESIGN (HLD)

### System Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENT LAYER (Web/Mobile Application)                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST API Calls
┌────────────────────────────▼────────────────────────────────────────┐
│ API GATEWAY & LOAD BALANCER (Nginx/HAProxy)                         │
│ ├─ Route requests to available servers                              │
│ ├─ SSL/TLS termination                                              │
│ └─ Rate limiting & DDoS protection                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌────────┬───────────┴───────────┬────────┐
        │        │                       │        │
┌───────▼──┐ ┌──▼────────┐ ┌──────────▼─┐ ┌────▼───┐
│ Server 1 │ │ Server 2  │ │ Server 3   │ │Server N│
│ Node.js  │ │ Node.js   │ │ Node.js    │ │Node.js │
└────┬─────┘ └─────┬─────┘ └─────┬──────┘ └────┬───┘
     │             │              │            │
     └─────────────┼──────────────┼────────────┘
                   │              │
     ┌─────────────┼──────────────┼────────────┐
     │             │              │            │
┌────▼──────────┐  │   ┌──────────▼────┐      │
│ Redis Cache   │  │   │ MySQL Master  │      │
│ (Distributed) │  │   │ (Write)       │      │
└───────────────┘  │   └───┬───────────┘      │
                   │       │                  │
                   │   ┌───▼──────────────┐   │
                   │   │ MySQL Replicas   │   │
                   │   │ (Read-only)      │   │
                   │   └──────────────────┘   │
                   │                         │
              ┌────▼────────────────────┐   │
              │ Background Jobs         │   │
              │ - Seat lock cleanup     │───┘
              │ - Notifications         │
              └────────────────────────┘
```

### System Components

| Component | Role | Technology |
|-----------|------|-----------|
| **Client** | Web/Mobile app | React/Vue/Native |
| **API Gateway** | Request routing | Nginx/HAProxy |
| **Server Layer** | Business logic | Node.js + Express |
| **Cache Layer** | Performance | Redis |
| **DB Master** | Write operations | MySQL 5.7+ |
| **DB Replicas** | Read operations | MySQL (slave) |
| **Background Jobs** | Async tasks | Node.js Timer |

---

## 2. LOW-LEVEL DESIGN (LLD)

### Request Processing Flow
```
REQUEST
  ├─ Validation Layer
  │  ├─ Input validation
  │  ├─ Type checking
  │  └─ Permission verification
  │
  ├─ Service Layer (Business Logic)
  │  ├─ BookingService
  │  ├─ PaymentService
  │  ├─ PriceService
  │  └─ SeatLockService
  │
  ├─ Cache Layer
  │  ├─ Check Redis cache
  │  ├─ If miss: Query database
  │  └─ Update cache with TTL
  │
  ├─ Data Access Layer
  │  ├─ Sequelize ORM
  │  ├─ SQL query execution
  │  └─ Connection pooling
  │
  └─ Response Layer
     ├─ Format response
     ├─ Set status code
     └─ Send to client
```

### Core Services

#### BookingService
```
holdSeats(eventId, seats, eventDate, duration)
  → Create temporary 10-minute seat locks
  → Return lock confirmation

confirmBooking(eventId, seats, userId, eventDate, duration)
  → Verify seat availability
  → Fetch price (from cache if available)
  → Calculate totalPrice = seats.count × seatPrice
  → Create booking (status: PENDING)
  → Remove temporary locks
  → Cache invalidation
  → Return bookingId + price

processPayment(bookingId, paymentId, eventDate, duration)
  → Validate booking exists
  → Check if already paid
  → Update paymentStatus = COMPLETED
  → Create permanent seat locks
  → Update booking status = CONFIRMED
  → Cache invalidation
  → Return confirmation

cancelBooking(bookingId, eventDate, duration)
  → Check if cancellation allowed
  → Calculate refund (full if paid, 0 if pending)
  → Update status = CANCELLED
  → Remove all seat locks
  → Cache invalidation
  → Return refund details
```

#### PriceService
```
setSeatPrice(eventId, seatPrice)
  → Validate inputs
  → Create/update price record
  → Invalidate price cache
  → Return confirmation

getSeatPrice(eventId) [WITH CACHING]
  → Check Redis cache (key: "price:{eventId}")
  → If miss: Query database
  → Cache for 10 minutes
  → Return seatPrice
```

#### SeatLockService
```
cleanupExpiredLocks() [Background Job - Every 60 sec]
  → Find all locks where expiresAt < NOW()
  → Delete expired locks
  → Invalidate affected caches
  → Log: "X locks cleaned"

createLock(eventId, seatId, expiresAt)
  → Create seat lock record
  → Set expiry: now + 10 minutes
  → Update seat availability cache
  → Return lock details
```

---

## 3. SYSTEM DESIGN & ARCHITECTURE

### Technology Stack
```
Frontend:        React/Angular/Mobile App(Fluter/Ionic)
API Layer:       Express.js (Node.js)
ORM:             Sequelize
Database:        MySQL 5.7+ (Master-Slave)
Cache:           Redis (Distributed)
Load Balancer:   Nginx/HAProxy
Message Queue:   RabbitMQ/Kafka (Future)
Monitoring:      Prometheus + Grafana
```

### Design Patterns
| Pattern | Implementation |
|---------|-----------------|
| Service Layer | Business logic separation |
| Repository | Sequelize Models |
| Cache-Aside | Redis for frequently accessed data |
| Async Jobs | Background cleanup tasks |
| Connection Pool | Manage DB connections |
| Circuit Breaker | Payment gateway fallback |

---

## 4. SCALABILITY ARCHITECTURE

### Horizontal Scaling
```
Load Balancer (Nginx)
├─ Node Server 1:3001
├─ Node Server 2:3002
├─ Node Server 3:3003
└─ Node Server N:300N

Shared Resources:
├─ MySQL Master (single write)
├─ MySQL Replicas (multiple read)
├─ Redis Cluster (distributed cache)
└─ Shared config storage
```

### Database Scaling
```
WRITE PATH:
Client → Load Balancer → Any Server → Master DB → Replicas

READ PATH:
Client → Load Balancer → Any Server → Read Replica → Cache

Connection Pool Config:
├─ Min: 10 connections
├─ Max: 20 connections
├─ Idle timeout: 10s
└─ Validation: 30s interval
```

### Caching Tiers
```
Level 1: Application Memory (Config)
├─ Constants (24h TTL)
└─ Settings (1h TTL)

Level 2: Redis Distributed Cache
├─ Event details (5 min TTL)
├─ Seat prices (10 min TTL)
├─ Seat availability (30 sec TTL)
└─ User sessions (session duration)

Invalidation Strategy:
├─ On event update → Clear event cache
├─ On price change → Clear price + availability
├─ On booking → Clear availability cache
└─ On payment → Clear booking cache
```

### Future: Database Sharding
```
Partition Strategy: By eventId
├─ Shard 1: eventId 1-1000
├─ Shard 2: eventId 1001-2000
└─ Shard N: eventId 2001+

Benefits:
├─ Distributed load
├─ Reduced lock contention
├─ Independent scaling
├─ Horizontal growth
```

---

## 5. PERFORMANCE OPTIMIZATION

### Database Performance
```
Indexing Strategy:
├─ bookings.eventId (Regular) → Fast event lookups
├─ bookings.userId (Regular) → User's bookings
├─ bookings.paymentStatus (Regular) → Payment filter
├─ bookings.paymentId (Unique) → Prevent duplicates
├─ seatlocksqls(eventId, seatId) (Composite) → Lock lookup
├─ seatlocksqls.expiresAt (Regular) → Cleanup efficiency
├─ prices.eventId (Unique) → One price per event
├─ events.date (Regular) → Event date filter
└─ events.city (Regular) → City-based search

Query Optimization:
├─ No SELECT * (select specific columns)
├─ Connection pooling (reuse connections)
├─ Prepared statements (prevent SQL injection)
├─ Batch operations (bulk inserts)
├─ Use read replicas for non-critical queries
└─ Pagination for large datasets
```

### API Performance Targets
```
API Response Times:
├─ Hold Seats: < 100ms
├─ Confirm Booking: < 200ms
├─ Process Payment: < 500ms
├─ Get Availability: < 50ms (cached)

Optimization Techniques:
├─ Async/await (non-blocking)
├─ Response compression (gzip)
├─ HTTP caching headers
├─ CDN for static assets
├─ Database query optimization
└─ Connection reuse
```

### Monitoring Metrics
```
Key Metrics to Track:
├─ API response time (p50, p95, p99)
├─ Database query latency
├─ Cache hit ratio (target > 80%)
├─ Throughput (req/sec)
├─ Error rate (target < 0.1%)
├─ Memory usage
├─ CPU utilization
└─ Seat lock contention rate

Monitoring Tools:
├─ Application: New Relic/Datadog
├─ Database: MySQL slow query log
├─ Cache: Redis INFO command
├─ Infrastructure: Prometheus + Grafana
└─ Logs: ELK Stack
```

---

## 6. DATABASE SCHEMA

### Core Tables

```sql
-- Events Table
events (
  id VARCHAR(9) PRIMARY KEY,          -- Auto-generated alphanumeric
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255),
  date DATETIME NOT NULL,
  duration INT NOT NULL,              -- In minutes
  seats JSON NOT NULL,                -- ["A1", "A2", "B1", ...]
  createdAt DATETIME DEFAULT NOW()
)
KEY: idx_date, idx_city

-- Bookings Table  
bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId VARCHAR(9) NOT NULL,        -- FK to events
  userId VARCHAR(255) NOT NULL,
  seats JSON NOT NULL,
  status ENUM(...) DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED
  eventDate DATETIME NOT NULL,
  duration INT NOT NULL,
  totalPrice DECIMAL(10,2),
  seatPrice DECIMAL(10,2),
  paymentStatus ENUM(...) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
  paymentId VARCHAR(255) UNIQUE,
  paymentDate DATETIME,
  canceledAt DATETIME,
  createdAt DATETIME,
  updatedAt DATETIME
)
KEYS: idx_eventId, idx_userId, idx_paymentStatus, idx_paymentId

-- Seat Locks Table
seatlocksqls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId VARCHAR(9) NOT NULL,        -- FK to events
  seatId VARCHAR(255) NOT NULL,
  eventDate DATETIME NOT NULL,
  duration INT NOT NULL,
  expiresAt DATETIME NOT NULL,        -- Cleanup after 10 min
  createdAt DATETIME
)
KEYS: idx_eventId_seatId, idx_expiresAt

-- Prices Table
prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId VARCHAR(9) UNIQUE NOT NULL, -- FK to events
  seatPrice DECIMAL(10,2) DEFAULT 300,
  currency VARCHAR(10) DEFAULT 'RS',
  createdAt DATETIME,
  updatedAt DATETIME
)
KEY: idx_eventId
```

---

## 7. COMPLETE API DOCUMENTATION

### 1. Create Event
```
POST /api/bookings/event
Content-Type: application/json

PAYLOAD:
{
  "name": "Tech Conf 2026",
  "city": "Mumbai",
  "date": "2026-02-15T10:00:00Z",
  "duration": 120,
  "seats": ["A1", "A2", "A3", "B1", "B2"]
}

RESPONSE (200):
{
  "id": "ABC123XYZ",
  "name": "Tech Conf 2026",
  "city": "Mumbai",
  "date": "2026-02-15T10:00:00Z",
  "duration": 120,
  "seats": ["A1", "A2", "A3", "B1", "B2"],
  "createdAt": "2026-01-29T12:00:00Z"
}
```

### 2. Hold Seats (10 min)
```
POST /api/bookings/hold
Content-Type: application/json

PAYLOAD:
{
  "eventId": "ABC123XYZ",
  "seats": ["A1", "A2"],
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}

RESPONSE (200):
{
  "message": "Seats held for 10 minutes",
  "expiresAt": "2026-01-29T12:10:00Z"
}

ERROR (400):
{"error": "One or more seats are already booked"}
```

### 3. Confirm Booking
```
POST /api/bookings/confirm
Content-Type: application/json

PAYLOAD:
{
  "eventId": "ABC123XYZ",
  "seats": ["A1", "A2"],
  "userId": "user456",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}

RESPONSE (200):
{
  "bookingId": 1,
  "message": "Booking created. Payment required.",
  "seats": ["A1", "A2"],
  "seatPrice": 300,
  "totalPrice": 600,
  "paymentStatus": "PENDING"
}
```

### 4. Process Payment
```
POST /api/bookings/payment/process
Content-Type: application/json

PAYLOAD:
{
  "bookingId": 1,
  "paymentId": "PAY_TXN_2026_001_ABC",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}

RESPONSE (200):
{
  "message": "Payment processed successfully.",
  "bookingId": 1,
  "paymentStatus": "COMPLETED",
  "status": "CONFIRMED",
  "seats": ["A1", "A2"],
  "totalPrice": 600
}
```

### 5. Get Payment Details
```
GET /api/bookings/payment/details/:bookingId

RESPONSE (200):
{
  "bookingId": 1,
  "seats": ["A1", "A2"],
  "seatPrice": 300,
  "totalPrice": 600,
  "paymentStatus": "COMPLETED",
  "status": "CONFIRMED",
  "eventDate": "2026-02-15T10:00:00Z"
}
```

### 6. Set Seat Price
```
POST /api/bookings/price/set
Content-Type: application/json

PAYLOAD:
{
  "eventId": "ABC123XYZ",
  "seatPrice": 500
}

RESPONSE (200):
{
  "message": "Seat price updated successfully",
  "eventId": "ABC123XYZ",
  "seatPrice": 500,
  "currency": "RS"
}
```

### 7. Insert Seats
```
POST /api/bookings/seats/insert
Content-Type: application/json

PAYLOAD:
{
  "eventId": "ABC123XYZ",
  "seats": ["C1", "C2", "C3"],
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}

RESPONSE (200):
{
  "message": "3 seats inserted successfully",
  "totalSeats": 8
}
```

### 8. Get Available Seats
```
GET /api/bookings/seats/available/:eventId

RESPONSE (200):
{
  "eventId": "ABC123XYZ",
  "availableSeats": ["A1", "B1", "C1"],
  "bookedSeats": ["A2", "B2"],
  "totalSeats": 5
}
```

### 9. Cancel Booking
```
POST /api/bookings/cancel
Content-Type: application/json

PAYLOAD:
{
  "bookingId": 1,
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}

RESPONSE (200):
{
  "message": "Booking cancelled successfully",
  "bookingId": 1,
  "canceledSeats": ["A1", "A2"],
  "refundAmount": 600,
  "canceledAt": "2026-01-29T12:30:00Z"
}
```

---

## 8. ERROR HANDLING & STATUS CODES

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Booking confirmed |
| 400 | Bad Request | Missing required field |
| 404 | Not Found | Booking doesn't exist |
| 409 | Conflict | Seat already booked |
| 500 | Server Error | Database connection failed |

---

## 9. SEAT LOCK LIFECYCLE

```
T=0s:     User holds seats
          → Lock created, expiresAt = now + 600s

T=0-300s: Lock is active
          → Other users cannot book same seats
          → User must confirm booking

T=300s:   User confirms booking
          → Temporary lock removed
          → Booking created (PENDING payment)

T=500s:   User processes payment
          → Permanent lock created (no expiry)
          → Booking status = CONFIRMED
          → Seat locked for event duration

T=600s:   (If not paid) Automatic cleanup
          → Expired lock deleted
          → Seat becomes available
          → Other users can book

On Cancel: Lock removed immediately
           Seat released for others
```

---

## 10. QUICK START

### Installation
```bash
# 1. Clone & install
git clone <repo-url>
npm install

# 2. Configure MySQL
cp .env.example .env
# Edit: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# 3. Setup database
npm run migrate

# 4. Start server
npm start
```

### Environment Variables
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=event_booking_db
DB_PORT=3306
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

---

**Last Updated:** January 29, 2026  
**Architecture Version:** 1.0  
**Ready for Production:** ✅

### Tables Structure

```
DATABASE: event_booking_db

├─ events
│  ├─ id (VARCHAR(9)) [Primary Key]
│  ├─ name (VARCHAR(255))
│  ├─ city (VARCHAR(255))
│  ├─ date (DATETIME)
│  ├─ duration (INT)
│  ├─ seats (JSON)
│  └─ createdAt (DATETIME)
│
├─ bookings
│  ├─ id (INT) [Primary Key, Auto Increment]
│  ├─ eventId (VARCHAR(9)) [Indexed, Foreign Key]
│  ├─ userId (VARCHAR(255)) [Indexed]
│  ├─ seats (JSON)
│  ├─ status (ENUM: PENDING, CONFIRMED, CANCELLED) [Indexed]
│  ├─ eventDate (DATETIME)
│  ├─ duration (INT)
│  ├─ totalPrice (DECIMAL(10,2))
│  ├─ seatPrice (DECIMAL(10,2))
│  ├─ paymentStatus (ENUM: PENDING, COMPLETED, FAILED) [Indexed]
│  ├─ paymentId (VARCHAR(255)) [Unique Index]
│  ├─ paymentDate (DATETIME)
│  ├─ canceledAt (DATETIME)
│  ├─ createdAt (DATETIME)
│  └─ updatedAt (DATETIME)
│
├─ seatlocksqls
│  ├─ id (INT) [Primary Key, Auto Increment]
│  ├─ eventId (VARCHAR(9)) [Indexed, Foreign Key]
│  ├─ seatId (VARCHAR(255))
│  ├─ eventDate (DATETIME)
│  ├─ duration (INT)
│  ├─ expiresAt (DATETIME) [Indexed]
│  └─ createdAt (DATETIME)
│
└─ prices
   ├─ id (INT) [Primary Key, Auto Increment]
   ├─ eventId (VARCHAR(9)) [Unique Index, Foreign Key]
   ├─ seatPrice (DECIMAL(10,2))
   ├─ currency (VARCHAR(10))
   ├─ createdAt (DATETIME)
   └─ updatedAt (DATETIME)
```

### Indexing Strategy

| Table | Field | Index Type | Purpose |
|-------|-------|-----------|----------|
| bookings | eventId | Regular | Fast event lookups |
| bookings | userId | Regular | User's bookings |
| bookings | paymentStatus | Regular | Payment filtering |
| bookings | status | Regular | Status filtering |
| bookings | paymentId | Unique | Prevent duplicate payments |
| bookings | createdAt | Regular | Booking time filtering |
| seatlocksqls | eventId, seatId | Composite | Find locks by event and seat |
| seatlocksqls | expiresAt | Regular | Find expired locks for cleanup |
| prices | eventId | Unique | One price per event |
| events | date | Regular | Event date filtering |
| events | city | Regular | City-based filtering |

---

## API Documentation

### 1. Hold Seats API

**Endpoint:** `POST /booking/hold`

**Purpose:** Temporarily reserve seats for a user (10-minute hold)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "507f1f77bcf86cd799439010",
  "seats": ["A1", "A2", "B1"],
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Query Parameters:** None

**Response (200 OK):**
```json
{
  "message": "Seats held for 10 minutes",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (400 Bad Request):**
```json
{
  "error": "One or more seats are already booked"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Event date and duration are required"
}
```

**Business Logic:**
1. Validate event date and duration provided
2. Check for confirmed bookings on requested seats
3. Check for existing seat locks
4. Create new locks with 10-minute expiration
5. Return success message

**Error Scenarios:**
- Missing event date or duration
- Seats already booked (payment completed)
- Seats already locked by another user

---

### 2. Confirm Booking API

**Endpoint:** `POST /booking/confirm`

**Purpose:** Create a booking with PENDING payment status (payment required)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "507f1f77bcf86cd799439010",
  "seats": ["A1", "A2"],
  "userId": "user456789",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (200 OK):**
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "message": "Booking created. Payment required to confirm seats.",
  "seats": ["A1", "A2"],
  "seatPrice": 300,
  "totalPrice": 600,
  "paymentStatus": "PENDING",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (400 Bad Request):**
```json
{
  "error": "One or more seats are already booked"
}
```

**Business Logic:**
1. Validate event date and duration
2. Check seat availability
3. Fetch seat price (default: RS 300)
4. Calculate total price (seats × seatPrice)
5. Create booking with PENDING status
6. Remove temporary locks
7. Return booking details with price

**Fields Explanation:**
- `bookingId`: Unique booking identifier
- `seatPrice`: Price per seat in RS
- `totalPrice`: Total amount to be paid
- `paymentStatus`: PENDING (awaiting payment)

---

### 3. Process Payment API

**Endpoint:** `POST /booking/payment/process`

**Purpose:** Process payment and confirm the booking

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "paymentId": "PAY_TXN_2026_001_ABC",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (200 OK):**
```json
{
  "message": "Payment processed successfully. Seats are now confirmed.",
  "bookingId": "507f1f77bcf86cd799439011",
  "paymentStatus": "COMPLETED",
  "paymentId": "PAY_TXN_2026_001_ABC",
  "paymentDate": "2026-01-29T10:30:45.123Z",
  "seats": ["A1", "A2"],
  "totalPrice": 600,
  "status": "CONFIRMED"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Booking not found"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Payment already completed for this booking"
}
```

**Business Logic:**
1. Validate booking exists
2. Check if payment already processed
3. Update payment status to COMPLETED
4. Store payment ID and date
5. Create permanent seat locks
6. Update booking status to CONFIRMED
7. Return confirmation

**Payment Flow:**
1. Client processes payment via payment gateway
2. Receives payment ID from gateway
3. Calls this API with payment ID
4. Server validates and confirms
5. Seats are locked permanently

---

### 4. Get Payment Details API

**Endpoint:** `GET /booking/payment/details/:bookingId`

**Purpose:** Retrieve payment and booking details

**Request Headers:**
```
Content-Type: application/json
```

**URL Parameters:**
```
:bookingId = "507f1f77bcf86cd799439011"
```

**Example Request:**
```
GET /booking/payment/details/507f1f77bcf86cd799439011
```

**Response (200 OK):**
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "seats": ["A1", "A2"],
  "seatPrice": 300,
  "totalPrice": 600,
  "paymentStatus": "COMPLETED",
  "status": "CONFIRMED",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Booking not found"
}
```

**Business Logic:**
1. Find booking by ID
2. Extract payment and booking details
3. Return formatted response

---

### 5. Set Seat Price API

**Endpoint:** `POST /booking/price/set`

**Purpose:** Set or update seat price for an event

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "507f1f77bcf86cd799439010",
  "seatPrice": 500
}
```

**Response (200 OK):**
```json
{
  "message": "Seat price updated successfully",
  "eventId": "507f1f77bcf86cd799439010",
  "seatPrice": 500,
  "currency": "RS"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Event ID and valid seat price are required"
}
```

**Business Logic:**
1. Validate event ID and seat price
2. Check if price record exists
3. Create new or update existing price
4. Store update timestamp
5. Return confirmation

**Notes:**
- Default price: RS 300 if not set
- One price per event
- Can be updated anytime

---

### 6. Insert Seats API

**Endpoint:** `POST /booking/seats/insert`

**Purpose:** Add new seats to an event

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "507f1f77bcf86cd799439010",
  "seats": ["C1", "C2", "C3", "D1", "D2"],
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (200 OK):**
```json
{
  "message": "5 seats inserted successfully",
  "totalSeats": 15,
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Event not found"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Seats must be a non-empty array"
}
```

**Business Logic:**
1. Validate input (seats array, event date, duration)
2. Check if event exists
3. Filter out duplicate seats
4. Add new seats to event
5. Update event date and duration
6. Return confirmation with total seat count

**Notes:**
- Seats must be unique
- Duplicates are automatically filtered
- Event metadata is updated

---

### 7. Cancel Booking API

**Endpoint:** `POST /booking/cancel`

**Purpose:** Cancel a booking and process refund

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120
}
```

**Response (200 OK):**
```json
{
  "message": "Booking cancelled successfully",
  "bookingId": "507f1f77bcf86cd799439011",
  "canceledSeats": ["A1", "A2"],
  "eventDate": "2026-02-15T10:00:00Z",
  "duration": 120,
  "canceledAt": "2026-01-29T11:15:30.456Z",
  "refundAmount": 600
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Booking not found"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Booking is already cancelled"
}
```

**Business Logic:**
1. Validate booking exists
2. Check cancellation status
3. Update booking status to CANCELLED
4. Store cancellation timestamp
5. Remove seat locks
6. Calculate refund (full if paid, 0 if pending)
7. Return cancellation details

**Refund Rules:**
- If `paymentStatus === COMPLETED`: Refund full amount
- If `paymentStatus === PENDING`: No refund

---

## Data Flow Diagrams

### 1. Complete Booking Flow

```
USER INITIATES BOOKING
        │
        ▼
┌──────────────────────────────┐
│  SELECT SEATS & HOLD         │
│  POST /booking/hold          │
│  Body: eventId, seats, date  │
└──────────────────────────────┘
        │
        ▼
    SYSTEM CHECKS
    ├─ Seat availability
    ├─ Existing locks
    └─ Confirmed bookings
        │
        ▼
  CREATE SEAT LOCKS (10 min)
        │
        ▼
┌──────────────────────────────┐
│  USER SEES AVAILABLE SEATS   │
│  & PRICE BREAKDOWN           │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  CONFIRM BOOKING WITH        │
│  PAYMENT INTENT              │
│  POST /booking/confirm       │
│  Body: eventId, seats, user  │
└──────────────────────────────┘
        │
        ▼
    SYSTEM CREATES BOOKING
    ├─ Status: PENDING
    ├─ paymentStatus: PENDING
    └─ Calculates total price
        │
        ▼
┌──────────────────────────────┐
│  BOOKING CREATED             │
│  Returns: bookingId, total   │
│  User redirected to payment  │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  USER PROCESSES PAYMENT      │
│  (Payment Gateway)           │
│  Returns: paymentId          │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  CONFIRM PAYMENT             │
│  POST /booking/payment/      │
│  process                     │
│  Body: bookingId, paymentId  │
└──────────────────────────────┘
        │
        ▼
    SYSTEM VALIDATES PAYMENT
    ├─ Verify bookingId
    ├─ Store paymentId
    └─ Lock seats permanently
        │
        ▼
┌──────────────────────────────┐
│  BOOKING CONFIRMED!          │
│  Status: CONFIRMED           │
│  Seats locked for event      │
│  Confirmation sent to user   │
└──────────────────────────────┘
```

### 2. Payment Processing Flow

```
PAYMENT INITIATION
        │
        ▼
┌────────────────────────────┐
│  CLIENT CALLS:             │
│  POST /booking/confirm     │
│  Creates PENDING booking   │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  RESPONSE:                 │
│  - bookingId               │
│  - totalPrice: 600 RS      │
│  - paymentStatus: PENDING  │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  CLIENT REDIRECTS TO       │
│  PAYMENT GATEWAY           │
│  (Stripe/PayPal/etc)       │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  USER ENTERS PAYMENT       │
│  DETAILS                   │
│  (Card/UPI/etc)            │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  PAYMENT GATEWAY:          │
│  - Validates payment       │
│  - Processes transaction   │
│  - Returns paymentId       │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  CLIENT CALLS:             │
│  POST /booking/            │
│  payment/process           │
│  Sends: bookingId,         │
│         paymentId          │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  SERVER VALIDATES:         │
│  - Booking exists          │
│  - Payment not duplicate   │
│  - Updates booking:        │
│    * paymentStatus: OK     │
│    * status: CONFIRMED     │
│    * paymentId: stored     │
│    * Locks seats           │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  RESPONSE:                 │
│  - Confirmation message    │
│  - Booked seats listed     │
│  - Payment confirmed       │
└────────────────────────────┘
```

### 3. Seat Lock Lifecycle

```
TIME T=0: USER HOLDS SEATS
┌─────────────────────────────┐
│ SeatLock created:           │
│ ├─ eventId: event123        │
│ ├─ seatId: A1               │
│ └─ expiresAt: T + 10 min    │
└─────────────────────────────┘

TIME T=5 MIN: STILL HOLDING
├─ Lock is active
├─ expiresAt: T + 5 min remaining
└─ Seat reserved

TIME T=10 MIN: HOLD EXPIRES
┌─────────────────────────────┐
│ Automatic cleanup runs      │
│ Every 60 seconds            │
│ ├─ Finds expiresAt < now   │
│ └─ Deletes lock             │
└─────────────────────────────┘
├─ Seat becomes available
└─ Other users can book

TIME T=5 MIN: PAYMENT PROCESSED
┌─────────────────────────────┐
│ Before expiration:          │
│ ├─ User pays               │
│ └─ New lock created        │
│    └─ NO expiration        │
│       (Permanent lock)      │
└─────────────────────────────┘
├─ Seat locked for event
└─ Only released on cancellation
```

---

## Technology Stack

### Backend Technologies
```
├─ Runtime: Node.js
├─ Framework: Express.js
├─ Language: JavaScript (ES6+)
├─ ORM: Sequelize
├─ Database: MySQL
├─ Package Manager: npm
└─ Port: 3000 (default)
```

### Dependencies
```json
{
  "express": "^4.18.x",
  "sequelize": "^6.x.x",
  "mysql2": "^3.x.x",
  "dotenv": "^16.x.x"
}
```

### File Structure
```
d:\PureSoftwares\
├── package.json
├── README.md
├── DOCUMENTATION.md (this file)
├── src/
│   ├── app.js (Express app initialization)
│   ├── server.js (Server startup)
│   ├── config/
│   │   └── db.js (Database connection)
│   ├── models/
│   │   ├── Event.js (Event schema)
│   │   ├── Booking.js (Booking schema)
│   │   ├── SeatLock.js (SeatLock schema)
│   │   └── Price.js (Price schema)
│   ├── routes/
│   │   └── booking.routes.js (All API endpoints)
│   └── services/
│       └── booking.service.js (Business logic)
└── tests/
    └── booking.test.js (Unit tests)
```

### Development Setup

**Prerequisites:**
- Node.js v14+
- MySQL 5.7+ installed and running
- npm or yarn

**Installation:**
```bash
npm install
```

**Configuration:**
Create `.env` file:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=event_booking_db
PORT=3000
NODE_ENV=development
```

**Database Setup:**
```bash
# Option 1: Using migration script (recommended)
npm run migrate

# Option 2: Fresh start (drops and recreates all tables)
npm run migrate:fresh

# Option 3: Manual SQL
mysql -u root -p < scripts/schema.sql
```

**Run Server:**
```bash
npm start
```

**Run Tests:**
```bash
npm test
```

---

## Error Handling

### HTTP Status Codes

| Code | Scenario | Response |
|------|----------|----------|
| 200 | Success | Success message + data |
| 400 | Bad Request | Error message + details |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

### Common Error Messages

```json
{
  "error": "Event date and duration are required"
}
```

```json
{
  "error": "One or more seats are already booked"
}
```

```json
{
  "error": "Seat lock expired"
}
```

```json
{
  "error": "Booking not found"
}
```

```json
{
  "error": "Payment already completed for this booking"
}
```

---

## Security Considerations

1. **Input Validation**
   - All request payloads validated
   - Type checking enforced
   - Empty/null checks performed

2. **Authentication**
   - User ID from request body (can be enhanced with JWT)
   - Payment ID verification

3. **Authorization**
   - Users can only cancel their own bookings
   - Payment verification before confirmation

4. **Data Protection**
   - Sensitive payment data not stored in logs
   - TTL indexes for automatic data cleanup

5. **Concurrency Control**
   - Seat locks prevent race conditions
   - Payment idempotency with paymentId

---

## Performance Optimization

1. **Database Indexes**
   - eventId indexed for fast lookups
   - paymentStatus indexed for filtering
   - TTL index on expiresAt for automatic cleanup

2. **Query Optimization**
   - Selective field retrieval
   - Bulk operations for seat locks
   - Batch processing for cleanup

3. **Caching Opportunities**
   - Cache seat prices per event
   - Cache event details
   - Cache seat availability

4. **Scalability**
   - MySQL replication support
   - Connection pooling ready
   - Query optimization with proper indexing
   - Horizontal scaling ready with multiple DB instances

---

## Future Enhancements

1. **Authentication & Authorization**
   - JWT token-based authentication
   - Role-based access control
   - User management system

2. **Payment Gateway Integration**
   - Real payment processing
   - Multiple payment methods
   - Payment reconciliation

3. **Notifications**
   - Email confirmations
   - SMS notifications
   - Push notifications

4. **Analytics**
   - Booking trends
   - Revenue reports
   - User behavior analysis

5. **Admin Features**
   - Event management dashboard
   - Revenue tracking
   - Booking reports

6. **Advanced Features**
   - Seat layout visualization
   - Group bookings
   - Dynamic pricing
   - Waitlist management

---

## Testing Strategy

### Unit Tests
- Service functions
- Business logic validation
- Error handling

### Integration Tests
- API endpoints
- Database operations
- Payment flow

### End-to-End Tests
- Complete booking workflow
- Payment processing
- Cancellation with refunds

---

## Deployment

### Prerequisites
- MySQL 5.7+ installed locally or cloud hosted
- Node.js hosting (Heroku, AWS, Azure, DigitalOcean, etc)
- Environment variables configured

### Deployment Steps
1. Push code to Git repository
2. Set environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
3. Create database: `mysql -u root -p < scripts/schema.sql`
4. Install dependencies: `npm install`
5. Run migrations: `npm run migrate`
6. Start server: `npm start`
5. Verify API endpoints

---

## Support & Maintenance

### Monitoring
- Server uptime
- Database performance
- API response times
- Error rates

### Maintenance Tasks
- Database backups
- Log rotation
- Dependency updates
- Security patches

### Contact
- For issues, create GitHub issues
- For support, contact development team

---

**Document Version:** 1.0  
**Last Updated:** January 29, 2026  
**Status:** Complete & Ready for Implementation
