# Sabhyata Backend Models - Dependency Flow

This document outlines the order in which models should be created when building the project from scratch, organized from most independent to most dependent.

---

## **Level 1: Fully Independent Models**
No dependencies on other models

1. **User.js**
   - Base user authentication and profile model
   - Dependencies: None

2. **Partner.js**
   - Partner/API client authentication model
   - Dependencies: None

---

## **Level 2: First-Order Dependencies**
Depends only on Level 1 models

3. **Event.js**
   - References: User (interestedUsers field)
   - Dependencies: User

4. **Monument.js**
   - References: Event (events array)
   - Dependencies: Event (circular reference, but Event can exist without Monument)

---

## **Level 3: Second-Order Dependencies**
Depends on Event and User models

5. **SeatLayout.js**
   - References: Event (event_id), User (created_by)
   - Dependencies: Event, User

6. **ShowSeatLayout.js**
   - References: Event (event_id)
   - Dependencies: Event

---

## **Level 4: Third-Order Dependencies**
Depends on multiple models including Event and User

7. **Booking.js**
   - References: Event, User
   - Dependencies: Event, User

8. **AbandonedCart.js**
   - References: User, Event, Booking (recoveredBookingId)
   - Dependencies: User, Event, Booking

---

## **Summary: Build Order**

### **Phase 1 - Foundation (Independent Users)**
- User
- Partner

### **Phase 2 - Content & Venues**
- Event
- Monument

### **Phase 3 - Seat Management**
- SeatLayout
- ShowSeatLayout

### **Phase 4 - Bookings & Recovery**
- Booking
- AbandonedCart

---

## **Detailed Dependency Analysis**

### **User.js** (Level 1)
- **Type:** Authentication & User Management
- **Depends on:** None
- **Used by:** Event (interestedUsers), SeatLayout (created_by), Booking (user), AbandonedCart (user)

### **Partner.js** (Level 1)
- **Type:** Partner/API Authentication
- **Depends on:** None
- **Used by:** None (standalone authentication system)

### **Event.js** (Level 2)
- **Type:** Event/Show Management
- **Depends on:** User (for interestedUsers tracking)
- **Used by:** Monument (events array), SeatLayout (event_id), ShowSeatLayout (event_id), Booking (event), AbandonedCart (event)
- **Note:** Central model for the booking system

### **Monument.js** (Level 2)
- **Type:** Monument/Venue Information
- **Depends on:** Event (references events array)
- **Used by:** None
- **Note:** Can be created after Event, but Events can exist independently

### **SeatLayout.js** (Level 3)
- **Type:** Master Seat Configuration
- **Depends on:** Event (event_id), User (created_by)
- **Used by:** ShowSeatLayout (template for show-specific layouts)
- **Note:** Defines the base seat layout for an event

### **ShowSeatLayout.js** (Level 3)
- **Type:** Show-Specific Seat Instances
- **Depends on:** Event (event_id)
- **Used by:** Booking (seat selections reference show layouts)
- **Note:** Creates per-show instances with specific date/time/language

### **Booking.js** (Level 4)
- **Type:** Booking Transactions
- **Depends on:** Event, User (optional)
- **Used by:** AbandonedCart (recoveredBookingId)
- **Note:** Can have bookings without user (guest bookings via sessionId/deviceId)

### **AbandonedCart.js** (Level 4)
- **Type:** Cart Recovery & Analytics
- **Depends on:** User (optional), Event, Booking (recoveredBookingId)
- **Used by:** None
- **Note:** Tracks incomplete bookings for recovery campaigns

---

## **Key Dependency Notes**

1. **User** is the foundation for authentication and must be created first
2. **Partner** is independent and used for API client authentication
3. **Event** is the central model that most other models depend on
4. **Monument** has a circular reference with Event, but Event takes priority
5. **SeatLayout** and **ShowSeatLayout** work together:
   - SeatLayout = Master template per event
   - ShowSeatLayout = Per-show instances (date/time/language specific)
6. **Booking** depends on Event but User is optional (supports guest bookings)
7. **AbandonedCart** must be created last as it references Booking

---

## **Special Relationships**

### **Circular Reference:**
- **Event ↔ Monument**: Event can reference Monument conceptually, Monument references Event array
  - Resolution: Create Event first, then Monument, then update Events if needed

### **Optional References:**
- **Booking.user**: Optional (supports guest bookings via sessionId/deviceId)
- **AbandonedCart.user**: Optional (can track anonymous carts via sessionId)

### **Seat Management Flow:**
1. Create **Event** (defines the show/performance)
2. Create **SeatLayout** (master seat configuration for the event)
3. Create **ShowSeatLayout** (per-show instances with date/time/language)
4. Create **Booking** (books seats from ShowSeatLayout)

---

## **Circular Dependency Check**
✅ No blocking circular dependencies detected
⚠️  Event ↔ Monument has circular reference but non-blocking (Monument.events is optional array)

---

## **Migration/Seeding Order**

When seeding data or migrating:
1. Users & Partners (authentication)
2. Events (core content)
3. Monuments (venue information, link to events)
4. SeatLayouts (master configurations)
5. ShowSeatLayouts (show-specific instances)
6. Bookings (transaction data)
7. AbandonedCarts (recovery tracking)

