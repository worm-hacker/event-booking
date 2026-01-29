# Event Booking System - Complete Documentation

## Document Information
- **Project Name:** Event Booking System
- **Version:** 1.0
- **Date:** January 29, 2026
- **Author:** Development Team

---

## Table of Contents
1. [Introduction](#introduction)
2. [High Level Design (HLD)](#high-level-design-hld)
3. [Low Level Design (LLD)](#low-level-design-lld)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Technology Stack](#technology-stack)

---

## Introduction

The Event Booking System is a comprehensive seat booking platform that handles:
- Event management with date and duration tracking
- Seat management and inventory
- Real-time seat locking mechanism
- Payment processing for bookings
- Booking confirmation and cancellation
- Price management per event

**Key Features:**
- Temporary seat holds (10 minutes)
- Two-step booking process (Confirm + Payment)
- Payment status tracking
- Seat price management (default: RS 300)
- Booking cancellation with refunds
- Automatic seat lock expiration

---

## High Level Design (HLD)

### 1. System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATION                      │
│                    (Web/Mobile Frontend)                    │
└────────────┬──────────────────────────────────────────────┘
             │
             │ HTTP/REST API Calls
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY / ROUTER                    │
│              (Express.js Routing Layer)                     │
└────────────┬──────────────────────────────────────────────┘
             │
             │ Routes Requests
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                             │
│    ┌──────────────┬──────────────┬──────────────┐           │
│    │   Booking    │   Payment    │    Seat      │           │
│    │  Service     │   Service    │  Management  │           │
│    └──────────────┴──────────────┴──────────────┘           │
└────────────┬──────────────────────────────────────────────┘
             │
             │ Data Operations
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                         │
│    ┌──────────────┬──────────────┬──────────────┐           │
│    │  Booking     │   Price      │   SeatLock   │           │
│    │  Repository  │  Repository  │  Repository  │           │
│    └──────────────┴──────────────┴──────────────┘           │
└────────────┬──────────────────────────────────────────────┘
             │
             │ CRUD Operations
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                            │
│                  (MongoDB/Mongoose)                         │
│    ┌──────────────┬──────────────┬──────────────┐           │
│    │  Events      │   Bookings   │   SeatLocks  │           │
│    │  Collection  │  Collection  │  Collection  │           │
│    └──────────────┴──────────────┴──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 2. Key Modules

| Module | Responsibility |
|--------|-----------------|
| **Event Management** | Create, read, update events with date, duration, and seats |
| **Booking Management** | Create bookings, track status, manage payment lifecycle |
| **Seat Locking** | Temporary seat reservation, automatic expiration (10 min) |
| **Payment Processing** | Validate payments, update booking status, calculate refunds |
| **Price Management** | Set and retrieve seat prices per event |

### 3. Core Features

#### Feature 1: Seat Holding
- User can hold seats for 10 minutes without payment
- Automatic expiration of holds after 10 minutes
- Prevents overselling

#### Feature 2: Two-Step Booking
1. **Confirm Booking** - Reserve seats with pending payment
2. **Process Payment** - Complete payment and lock seats

#### Feature 3: Payment Integration
- Track payment status (PENDING, COMPLETED, FAILED)
- Calculate total price (seats × seat price)
- Process refunds on cancellation

#### Feature 4: Seat Management
- Insert new seats per event
- Track seat availability
- Prevent double booking

---

## Low Level Design (LLD)

### 1. Module Breakdown

#### A. Booking Service Module

```
BookingService {
  
  async holdSeats(eventId, seats, eventDate, duration)
    - Validate seat availability
    - Check for existing locks
    - Create temporary seat locks
    - Return success message
  
  async confirmBooking(eventId, seats, userId, eventDate, duration)
    - Verify seat availability
    - Fetch seat price from Price collection
    - Calculate total price (seats × seatPrice)
    - Create booking with PENDING payment status
    - Remove temporary seat locks
    - Return booking details with price info
  
  async processPayment(bookingId, paymentId, eventDate, duration)
    - Validate booking exists
    - Update payment status to COMPLETED
    - Store payment ID and date
    - Create seat locks for booked seats
    - Return confirmation with locked seats
  
  async getBookingPaymentDetails(bookingId)
    - Retrieve booking information
    - Return payment status and price breakdown
  
  async insertSeats(eventId, seatList, eventDate, duration)
    - Validate event exists
    - Add new seats to event
    - Update event date and duration
    - Return confirmation with total seats
  
  async cancelBooking(bookingId, eventDate, duration)
    - Verify booking exists and not already cancelled
    - Update status to CANCELLED
    - Store cancellation timestamp
    - Remove seat locks
    - Calculate refund amount
    - Return cancellation details
}
```

#### B. Price Service Module

```
PriceService {
  
  async setSeatPrice(eventId, seatPrice)
    - Validate inputs
    - Create or update price record
    - Store event ID and seat price
    - Return confirmation
  
  async getSeatPrice(eventId)
    - Fetch price from Price collection
    - Return seat price or default (RS 300)
}
```

#### C. Seat Lock Manager

```
SeatLockManager {
  
  // Runs every 60 seconds
  async cleanupExpiredLocks()
    - Find all locks with expiresAt < now
    - Delete expired locks
    - Log cleanup results
  
  async createLock(eventId, seatId, eventDate, duration)
    - Create lock with 10-minute expiration
    - Store event details
  
  async releaseLock(eventId, seatId)
    - Delete lock for seat
    - Make seat available again
}
```

### 2. Data Models

#### Event Schema
```javascript
{
  _id: ObjectId,
  name: String,
  city: String,
  date: Date (required),
  duration: Number (minutes, required),
  seats: [String],
  createdAt: Date
}
```

#### Booking Schema
```javascript
{
  _id: ObjectId,
  eventId: String,
  userId: String,
  seats: [String],
  status: String (PENDING, CONFIRMED, CANCELLED),
  eventDate: Date (required),
  duration: Number (required),
  totalPrice: Number (required),
  seatPrice: Number (required),
  paymentStatus: String (PENDING, COMPLETED, FAILED),
  paymentId: String,
  paymentDate: Date,
  createdAt: Date,
  canceledAt: Date
}
```

#### SeatLock Schema
```javascript
{
  _id: ObjectId,
  eventId: String,
  seatId: String,
  eventDate: Date (required),
  duration: Number (required),
  expiresAt: Date (TTL index: 600 seconds)
}
```

#### Price Schema
```javascript
{
  _id: ObjectId,
  eventId: String (required),
  seatPrice: Number (required, default: 300),
  currency: String (default: 'RS'),
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Key Algorithms

#### Algorithm 1: Seat Availability Check
```
Function: CheckSeatAvailability(eventId, seatIds)
Input: eventId, list of seatIds
Output: Boolean (true if all seats available)

1. Query Booking collection for confirmed bookings
   - Filter: {eventId, seats: {$in: seatIds}, paymentStatus: 'COMPLETED'}
2. If any records found, return FALSE
3. Query SeatLock collection for active locks
   - Filter: {eventId, seatId: {$in: seatIds}, expiresAt: {$gt: now}}
4. If any records found, return FALSE
5. Return TRUE
```

#### Algorithm 2: Calculate Total Price
```
Function: CalculateTotalPrice(seatCount, seatPrice)
Input: Number of seats, price per seat
Output: Total price

1. Fetch seat price from Price collection by eventId
2. If not found, use DEFAULT_SEAT_PRICE = 300
3. totalPrice = seatCount × seatPrice
4. Return totalPrice
```

#### Algorithm 3: Automatic Lock Cleanup
```
Function: CleanupExpiredLocks() [Runs every 60 seconds]
Input: None
Output: Number of locks deleted

1. Get current timestamp: now = Date.now()
2. Query SeatLock: {expiresAt: {$lt: now}}
3. Delete all matching documents
4. Log: "X expired locks cleaned up"
5. Return count of deleted locks
```

---

## System Architecture

### 1. End-to-End Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│                  (Web Browser / Mobile App)                      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ HTTPS/REST
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│                    (API Endpoints / Routes)                      │
│  ┌─────────────┬──────────────┬──────────────┬─────────────┐   │
│  │ /hold       │ /confirm     │ /payment/*   │ /seats/*    │   │
│  │ /cancel     │ /price/set   │ /price/set   │             │   │
│  └─────────────┴──────────────┴──────────────┴─────────────┘   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Request Processing
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
│                  (Service Classes & Functions)                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  BookingService    │  PriceService  │  SeatLockMgr   │       │
│  │  - holdSeats()     │  - setSeatPrice│  - cleanup()   │       │
│  │  - confirmBooking()│  - getSeatPrice│  - createLock()│       │
│  │  - processPayment()│                │  - releaseLock│       │
│  │  - cancelBooking() │                │                │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Data Access
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                    DATA ACCESS LAYER                             │
│                 (Mongoose / ORM Models)                          │
│  ┌─────────────┬──────────────┬──────────────┬─────────────┐   │
│  │ Event Model │ Booking Model│ SeatLock Mdl │ Price Model │   │
│  └─────────────┴──────────────┴──────────────┴─────────────┘   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Database Queries
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│                  (MongoDB Cluster)                               │
│  ┌─────────────┬──────────────┬──────────────┬─────────────┐   │
│  │  events     │  bookings    │  seatLocks   │   prices    │   │
│  │  collection │  collection  │  collection  │ collection  │   │
│  └─────────────┴──────────────┴──────────────┴─────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Request-Response Flow

```
CLIENT REQUEST
     │
     ▼
EXPRESS ROUTER
  ├─ Validates request format
  ├─ Extracts parameters
     │
     ▼
SERVICE LAYER
  ├─ Validates business logic
  ├─ Performs calculations
  ├─ Manages transactions
     │
     ▼
DATA ACCESS LAYER
  ├─ Constructs database queries
  ├─ Executes CRUD operations
  ├─ Handles relationships
     │
     ▼
MONGODB
  ├─ Executes query
  ├─ Returns data
     │
     ▼
SERVICE LAYER
  ├─ Processes response
  ├─ Formats output
     │
     ▼
EXPRESS ROUTER
  ├─ Sets HTTP status
  ├─ Sends JSON response
     │
     ▼
CLIENT RESPONSE
```

### 3. Booking Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                   BOOKING WORKFLOW                              │
└─────────────────────────────────────────────────────────────────┘

STEP 1: HOLD SEATS
  Request: POST /booking/hold
  ├─ User selects seats
  ├─ System creates temporary locks (10 min)
  └─ Seats are reserved

STEP 2: CONFIRM BOOKING
  Request: POST /booking/confirm
  ├─ User provides payment info request
  ├─ System creates booking (PENDING)
  ├─ Calculates total price (seats × rate)
  └─ Returns payment required response

STEP 3: PROCESS PAYMENT
  Request: POST /booking/payment/process
  ├─ Payment gateway validates payment
  ├─ System updates payment status (COMPLETED)
  ├─ Creates permanent seat locks
  ├─ Updates booking status (CONFIRMED)
  └─ Sends confirmation to user

ALTERNATIVE: CANCEL BOOKING
  Request: POST /booking/cancel
  ├─ User initiates cancellation
  ├─ System marks booking as CANCELLED
  ├─ Removes seat locks
  ├─ Processes refund
  └─ Releases seats for other bookings
```

### 4. Seat Lock Lifecycle

```
CREATION: User holds seats
  └─ SeatLock created with expiresAt = now + 10 minutes

DURING HOLD (10 minutes)
  ├─ Seat is reserved
  ├─ Other users cannot book
  └─ User must pay to confirm

AFTER 10 MINUTES
  ├─ Automatic cleanup service runs
  ├─ Expired locks are deleted
  ├─ Seat becomes available again
  └─ If payment was made, seat is re-locked (permanent)

PERMANENT LOCK (After Payment)
  ├─ New lock created after payment
  ├─ No expiration (TTL removed)
  ├─ Seat remains booked
  └─ Only released on cancellation
```

---

## Database Schema

### Collections Structure

```
DATABASE: event_booking_db

├─ events
│  ├─ _id (ObjectId)
│  ├─ name (String)
│  ├─ city (String)
│  ├─ date (Date)
│  ├─ duration (Number)
│  ├─ seats (Array of Strings)
│  └─ createdAt (Date)
│
├─ bookings
│  ├─ _id (ObjectId)
│  ├─ eventId (String) [Indexed]
│  ├─ userId (String) [Indexed]
│  ├─ seats (Array)
│  ├─ status (String) [Indexed: PENDING, CONFIRMED, CANCELLED]
│  ├─ eventDate (Date)
│  ├─ duration (Number)
│  ├─ totalPrice (Number)
│  ├─ seatPrice (Number)
│  ├─ paymentStatus (String) [Indexed: PENDING, COMPLETED, FAILED]
│  ├─ paymentId (String) [Unique Index]
│  ├─ paymentDate (Date)
│  ├─ createdAt (Date)
│  └─ canceledAt (Date)
│
├─ seatLocks
│  ├─ _id (ObjectId)
│  ├─ eventId (String) [Indexed]
│  ├─ seatId (String)
│  ├─ eventDate (Date)
│  ├─ duration (Number)
│  └─ expiresAt (Date) [TTL Index: 600 seconds]
│
└─ prices
   ├─ _id (ObjectId)
   ├─ eventId (String) [Unique Index]
   ├─ seatPrice (Number)
   ├─ currency (String)
   ├─ createdAt (Date)
   └─ updatedAt (Date)
```

### Indexing Strategy

| Collection | Field | Index Type | Purpose |
|-----------|-------|-----------|---------|
| bookings | eventId | Regular | Fast event lookups |
| bookings | userId | Regular | User's bookings |
| bookings | paymentStatus | Regular | Payment filtering |
| bookings | status | Regular | Status filtering |
| bookings | paymentId | Unique | Prevent duplicate payments |
| seatLocks | eventId | Regular | Find locks by event |
| seatLocks | expiresAt | TTL (600s) | Auto-cleanup expired locks |
| prices | eventId | Unique | One price per event |

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
├─ ORM: Mongoose
├─ Database: MongoDB
├─ Package Manager: npm
└─ Port: 3000 (default)
```

### Dependencies
```
{
  "express": "^4.18.x",
  "mongoose": "^7.x.x",
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
- MongoDB running locally or cloud instance
- npm or yarn

**Installation:**
```bash
npm install
```

**Configuration:**
Create `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/event_booking_db
PORT=3000
NODE_ENV=development
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
   - MongoDB sharding support
   - Horizontal scaling ready
   - Message queue for async operations (future)

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
- MongoDB Atlas (cloud) or MongoDB installed
- Node.js hosting (Heroku, AWS, Azure, etc)
- Environment variables configured

### Deployment Steps
1. Push code to Git repository
2. Set environment variables
3. Install dependencies: `npm install`
4. Run server: `npm start`
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
