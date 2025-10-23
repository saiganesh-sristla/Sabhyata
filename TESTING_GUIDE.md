# Testing Guide - Seat Lock Release Feature

## Quick Test

### 1. Manual Cleanup Test (Immediate)
You can manually trigger the cleanup process without waiting:

```bash
# Using curl
curl -X POST http://localhost:5000/api/temp-bookings/test-cleanup

# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:5000/api/temp-bookings/test-cleanup" -Method POST
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test cleanup completed - check server logs for details",
  "timestamp": "2025-01-23T12:00:00.000Z"
}
```

**Check Server Logs For:**
```
🧪 Manual test cleanup triggered
🧹 Starting cleanup of expired bookings...
Found X expired bookings to clean up
🧹 Starting global cleanup of expired seat locks...
  - Timeout: 5 minutes
  - Expiry cutoff: 2025-01-23T11:55:00.000Z
  - Found Y layouts with locked seats
✅ Global cleanup completed: Z layouts processed, W seats released
✅ Cleanup completed: X expired bookings processed
```

---

## Full End-to-End Test

### Step 1: Lock Some Seats
1. Open the frontend: `http://localhost:8080`
2. Navigate to an event with seat selection
3. Select a date and time
4. Click on some seats to select them
5. Click "Proceed to Payment" (but DON'T complete payment)
6. Note the seat IDs you selected

### Step 2: Verify Seats Are Locked
1. Open a new incognito/private browser window
2. Navigate to the same event, date, and time
3. **Expected**: The seats you selected should appear gray/locked
4. Try clicking them - they should not be selectable

### Step 3: Wait for Auto-Release (5 minutes)
**Option A: Wait naturally**
- Wait 5 minutes
- The seats should automatically become available

**Option B: Trigger cleanup manually**
```bash
# Trigger cleanup immediately
curl -X POST http://localhost:5000/api/temp-bookings/test-cleanup
```

### Step 4: Verify Seats Are Released
1. In the incognito window, wait 30 seconds (for auto-refresh)
   - OR refresh the page manually
2. **Expected**: The seats should now appear in their original color (available)
3. Try clicking them - they should now be selectable

---

## Monitoring & Debugging

### Server Logs to Watch

**Every 30 seconds, you should see:**
```
🧹 Starting cleanup of expired bookings...
Found 0 expired bookings to clean up
🧹 Starting global cleanup of expired seat locks...
  - Timeout: 5 minutes
  - Expiry cutoff: 2025-01-23T11:55:00.000Z
  - Found 0 layouts with locked seats
✅ Global cleanup completed: 0 layouts processed, 0 seats released
✅ Cleanup completed: 0 expired bookings processed
```

**When seats are locked:**
```
✓ Locked 3 seats for session abc123
```

**When locks expire and are released:**
```
🔓 Releasing expired locks for layout 507f1f77bcf86cd799439011
  - Total locked seats: 3
  - Expired locks to release: 3
✅ Released 3 expired locks in layout 507f1f77bcf86cd799439011
  - Locked seats remaining: 0
```

### Frontend Console Logs

**Every 30 seconds:**
```
🔄 Auto-refreshing seat layout...
```

**When seats are released:**
```
✅ Seat layout updated - expired locks released
```

---

## Test Scenarios

### Scenario 1: Normal Booking Flow
1. User selects seats → **Seats locked**
2. User completes payment within 5 min → **Seats marked as booked**
3. **Result**: ✅ Seats permanently booked

### Scenario 2: Abandoned Booking
1. User selects seats → **Seats locked**
2. User closes browser/abandons → **Seats locked**
3. After 5 minutes → **Cleanup job releases seats**
4. **Result**: ✅ Seats become available again

### Scenario 3: Multiple Users
1. User A selects seats → **Seats locked for User A**
2. User B tries to select same seats → **Cannot select (locked)**
3. User A abandons after 5 min → **Seats released**
4. User B's page auto-refreshes → **Seats now available**
5. User B selects seats → **Success**
6. **Result**: ✅ Seats properly managed between users

### Scenario 4: Payment Timeout
1. User selects seats → **Seats locked**
2. User reaches payment page → **Timer shows 5:00**
3. User waits until timer reaches 0:00 → **Session expired**
4. **Result**: ✅ Seats released, user redirected

---

## Troubleshooting

### Problem: Seats not releasing after 5 minutes

**Check 1: Is cleanup job running?**
```bash
# Look for this in server logs every 30 seconds:
grep "Starting cleanup of expired bookings" server.log
```

**Check 2: Are expired locks being found?**
```bash
# Look for:
grep "Found.*layouts with locked seats" server.log
```

**Check 3: Manual trigger**
```bash
curl -X POST http://localhost:5000/api/temp-bookings/test-cleanup
# Check response and server logs
```

### Problem: Frontend not showing released seats

**Check 1: Is auto-refresh working?**
- Open browser console
- Look for "🔄 Auto-refreshing seat layout..." every 30 seconds

**Check 2: Manual refresh**
- Refresh the page manually
- Seats should update

**Check 3: Clear browser cache**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Problem: Cleanup job not running

**Check server.js:**
```javascript
// Should be present around line 118-119:
const { cleanupExpiredBookings } = require('./controllers/tempBookingController');
setInterval(cleanupExpiredBookings, 30 * 1000);
```

**Restart server:**
```bash
# Stop server (Ctrl+C)
# Start server
npm start
```

---

## API Endpoints for Testing

### Get Seat Layout
```bash
GET /api/seat-layouts/{eventId}?date=2025-01-23&time=10:00&language=en
```

### Create Temp Booking
```bash
POST /api/temp-bookings
{
  "eventId": "...",
  "date": "2025-01-23",
  "time": "10:00",
  "seats": [...],
  "adults": 2,
  "children": 0,
  "totalAmount": 500,
  "deviceId": "...",
  "sessionId": "..."
}
```

### Manual Cleanup
```bash
POST /api/temp-bookings/test-cleanup
```

---

## Success Criteria

✅ **Seats lock** when user selects them  
✅ **Seats release** after 5 minutes if payment not completed  
✅ **Seats book** permanently when payment is completed  
✅ **Frontend updates** automatically within 30 seconds  
✅ **Multiple users** can't select same locked seats  
✅ **Cleanup job** runs every 30 seconds  
✅ **Logs show** detailed information about cleanup process  

---

## Performance Notes

- **Cleanup frequency**: Every 30 seconds (configurable in server.js)
- **Lock timeout**: 5 minutes (configurable in ShowSeatLayout model)
- **Frontend refresh**: Every 30 seconds (configurable in UserSeatMap.tsx)
- **Database queries**: Optimized with indexes on event_id, date, time, language

---

## Next Steps After Testing

1. Monitor server logs in production for 24 hours
2. Check for any memory leaks from interval jobs
3. Verify cleanup is working across different timezones
4. Consider adding metrics/monitoring for:
   - Number of seats locked per hour
   - Number of seats released per hour
   - Average time seats remain locked
   - Conversion rate (locked → booked)
