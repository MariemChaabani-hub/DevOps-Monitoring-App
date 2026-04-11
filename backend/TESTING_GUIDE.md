# CPU Alerting System - Testing Guide

## Quick Start Testing (5 minutes)

### Setup
```bash
# Terminal 1: Start Backend
cd backend
npm install
npm start

# Terminal 2: Run test scripts
cd backend
node test-alerts.js 85        # Send WARNING alert
```

---

## Detailed Testing Scenarios

### Test 1: Trigger WARNING Alert (CPU > 80%)

**Expected behavior:**
- Alert created in MongoDB
- Email sent to admin (console log in demo mode)
- Alert stored with type: "WARNING"

**Steps:**
```bash
# Terminal 2
node test-alerts.js 85 server-1

# Check MongoDB
# Terminal 3
mongo
> use pfe-monitoring
> db.alerts.find().sort({timestamp:-1}).limit(1)

# Output should show:
# { 
#   _id: ObjectId...,
#   serverId: "server-1",
#   type: "WARNING",
#   value: 85,
#   threshold: 80,
#   ...
# }
```

**Verification:**
- ✅ Backend shows: `[AlertService] Alert saved`
- ✅ MongoDB has 1 document with type: "WARNING"
- ✅ Console shows email log (demo mode)

---

### Test 2: Trigger CRITICAL Alert (CPU > 90%)

**Expected behavior:**
- Alert created in MongoDB with type: "CRITICAL"
- Email sent immediately
- Different from WARNING (should be stored as separate alert)

**Steps:**
```bash
# Terminal 2
node test-alerts.js 95 server-1

# Check the alert in MongoDB
mongo
> db.alerts.findOne({type: "CRITICAL"})

# Should show threshold: 90, value: 95
```

**Verification:**
- ✅ Alert with type: "CRITICAL" is created
- ✅ Threshold is 90%
- ✅ Value shows actual CPU (95%)

---

### Test 3: No Alert When CPU Normal (CPU ≤ 80%)

**Expected behavior:**
- No new alert created
- No email sent
- Metrics processed normally

**Steps:**
```bash
# Terminal 2
node test-alerts.js 50 server-1

# Check MongoDB - alert count should be unchanged
mongo
> db.alerts.find({serverId: "server-1"}).count()
# Should still show 1 (from Test 1)
```

**Verification:**
- ✅ No new alert document created
- ✅ No email sent
- ✅ Previous alerts still in database

---

### Test 4: Alert Deduplication (No duplicate within 60 seconds)

**Expected behavior:**
- First alert sent immediately
- Second identical alert skipped (same server, same type)
- Wait 60+ seconds, then alert works again

**Steps:**

#### Step 4A: Send first WARNING
```bash
# Terminal 2
node test-alerts.js 85 server-1
# ✅ Alert created, email sent
```

#### Step 4B: Send same alert immediately (within 60 seconds)
```bash
# Terminal 2 (in same minute)
node test-alerts.js 85 server-1
# ✅ No new alert created (deduplication active)

# Verify in MongoDB
mongo
> db.alerts.find({serverId: "server-1", type: "WARNING"}).count()
# Should still be 1 (not 2)
```

#### Step 4C: Wait exactly 60 seconds, send again
```bash
# Terminal 2
# Wait 60+ seconds...
node test-alerts.js 85 server-1
# ✅ New alert created (deduplication window expired)

# Verify in MongoDB
mongo
> db.alerts.find({serverId: "server-1", type: "WARNING"}).count()
# Should now be 2
```

**Verification:**
- ✅ Only 1 email sent for repeated alerts within 60 seconds
- ✅ Second alert created after 60+ seconds
- ✅ System prevented alert spam

---

### Test 5: Different Servers Can Alert Independently

**Expected behavior:**
- Server-1 and Server-2 alerts are independent
- Can have simultaneous alerts

**Steps:**
```bash
# Terminal 2
node test-alerts.js 85 server-1   # WARNING for server-1
node test-alerts.js 95 server-2   # CRITICAL for server-2
node test-alerts.js 85 server-3   # WARNING for server-3

# Verify in MongoDB
mongo
> db.alerts.find()
# Should show 3 alerts, one for each server

> db.alerts.find({serverId: "server-1"}).count()
# Should be 1

> db.alerts.find({serverId: "server-2"}).count()
# Should be 1

> db.alerts.find({serverId: "server-3"}).count()
# Should be 1
```

**Verification:**
- ✅ Each server has independent alert tracking
- ✅ Alerts for different servers don't trigger deduplication
- ✅ Each server-type combo is separate

---

### Test 6: API Endpoints

#### 6A: Get all alerts
```bash
curl http://localhost:3000/api/alerts

# Response:
# [
#   {
#     "_id": "...",
#     "serverId": "server-1",
#     "type": "WARNING",
#     "value": 85,
#     ...
#   }
# ]
```

#### 6B: Get alerts for specific server
```bash
curl http://localhost:3000/api/alerts/server-1

# Response: Only server-1 alerts
```

#### 6C: Get alert statistics
```bash
curl http://localhost:3000/api/alerts/stats/summary

# Response:
# {
#   "summary": [
#     { "_id": "WARNING", "count": 2 },
#     { "_id": "CRITICAL", "count": 1 }
#   ],
#   "recent": [...]
# }
```

**Verification:**
- ✅ All endpoints return data
- ✅ Stats show correct counts
- ✅ Recent array shows latest alerts

---

### Test 7: Email Configuration (Production Mode)

**Setup:**
```bash
# Terminal 1: Set environment variables
$env:EMAIL_USER = "your-email@gmail.com"
$env:EMAIL_PASS = "your-app-password"    # NOT regular password!

npm start

# Terminal 2: Send alert
node test-alerts.js 85 server-1

# Check: Your actual inbox should receive email
```

**Verification:**
- ✅ Email arrives in inbox
- ✅ Subject: "[WARNING] CPU Alert on Server server-1"
- ✅ Email contains CPU value, threshold, timestamp

**Troubleshooting:**
If email not received:
1. Check console for errors
2. Verify EMAIL_USER and EMAIL_PASS are correct
3. If using Gmail, make sure you generated App Password (not regular password)
4. Check spam folder

---

### Test 8: Different CPU Thresholds

**Test WARNING (75-90%):**
```bash
node test-alerts.js 75 server-test   # Between 80-90
node test-alerts.js 89 server-test   # Between 80-90
```

**Test CRITICAL (>90%):**
```bash
node test-alerts.js 90.1 server-test   # Just above 90
node test-alerts.js 100 server-test    # At max
```

**Test Normal (<80%):**
```bash
node test-alerts.js 0 server-test      # Minimum
node test-alerts.js 79.9 server-test   # Just below warned
```

**Verification:**
- ✅ 75-89% creates WARNING
- ✅ >90% creates CRITICAL
- ✅ <80% creates nothing

---

## Comprehensive Test Script

Run this complete test sequence:

```bash
# Terminal 1: Start backend
cd backend
npm start

# Wait for "Server running on port 3000"
# Then open Terminal 2:

# PHASE 1: Basic functionality
echo "=== PHASE 1: Testing basic alerts ==="
node test-alerts.js 50 server-1      # No alert
node test-alerts.js 85 server-1      # WARNING
node test-alerts.js 95 server-1      # CRITICAL
sleep 5

# PHASE 2: Deduplication
echo "=== PHASE 2: Testing deduplication ==="
node test-alerts.js 85 server-1      # Should skip (duplicate)
echo "Waiting 60 seconds..."
sleep 60
node test-alerts.js 85 server-1      # Should work (after 60s)
sleep 5

# PHASE 3: Multiple servers
echo "=== PHASE 3: Testing multiple servers ==="
node test-alerts.js 85 server-2
node test-alerts.js 90 server-3
sleep 5

# PHASE 4: API testing
echo "=== PHASE 4: Testing API endpoints ==="
curl http://localhost:3000/api/alerts
curl http://localhost:3000/api/alerts/server-1
curl http://localhost:3000/api/alerts/stats/summary
```

---

## MongoDB Query Reference

### View all alerts
```javascript
db.alerts.find()
```

### View recent alerts
```javascript
db.alerts.find().sort({timestamp: -1}).limit(10)
```

### View alerts for specific server
```javascript
db.alerts.find({serverId: "server-1"})
```

### Count by alert type
```javascript
db.alerts.aggregate([
  { $group: { _id: "$type", count: { $sum: 1 } } }
])
```

### Alerts from last hour
```javascript
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
db.alerts.find({ timestamp: { $gte: oneHourAgo } })
```

### Delete all alerts (for testing)
```javascript
db.alerts.deleteMany({})
```

---

## Performance Testing

### Stress test: Send 10 alerts rapidly
```bash
for i in {1..10}; do
  node test-alerts.js 85 server-$i &
done
wait

# Check MongoDB
mongo
> db.alerts.find().count()
# Should be ~10 (one per server)
```

### Continuous monitoring: Send alerts every 5 seconds
```bash
while true; do
  node test-alerts.js 85 server-1
  sleep 5
done

# Watch MongoDB or API
# Every 60 seconds you should see new alert
# Within 60 seconds you should see deduplication
```

---

## Debugging Reference

### Check if backend is running
```bash
curl http://localhost:3000/api/servers
# Should return list of servers
```

### Check MongoDB connection
```bash
# Terminal
mongo
> db.stats()
# Should show database info
```

### Monitor backend logs in real-time
```bash
# Terminal 1
npm start

# Watch for lines:
# [AlertService] Alert saved: server-1 - WARNING
# [Email] Sent to mariemchaabani39@gmail.com
# [Error] if something goes wrong
```

### Enable debug mode
```bash
$env:DEBUG = "pfe:*"
npm start

# More detailed logging
```

---

## Checklist: Successful Implementation

- [ ] Backend starts without errors
- [ ] Test 1: WARNING alert created (CPU 85%)
- [ ] Test 2: CRITICAL alert created (CPU 95%)
- [ ] Test 3: No alert when CPU low (CPU 50%)
- [ ] Test 4: Deduplication works (no duplicate within 60s)
- [ ] Test 5: Different servers independent
- [ ] Test 6: API endpoints return data
- [ ] Test 7: Email sent (or console log in demo)
- [ ] Test 8: Correct thresholds applied
- [ ] MongoDB collection has alerts documents

✅ If all checked, alerting system is fully functional!

---

## Next Steps

1. **Integrate with Real Agent**
   - Update agent to send actual CPU metrics
   - Test with real-time monitoring

2. **Add to Dashboard**
   - Display alerts in React frontend
   - Show real-time alert count
   - List recent alerts

3. **Configure Email**
   - Set up Gmail App Password
   - Update .env with credentials
   - Test with real emails

4. **Monitor Production**
   - Watch alert trends
   - Adjust thresholds if needed
   - Check email deliverability

