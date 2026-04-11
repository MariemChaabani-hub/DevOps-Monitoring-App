# CPU Alerting System - Setup Guide

## Overview

Your Node.js backend now has an intelligent CPU alerting system that:

✅ **Monitors CPU Usage**
  - WARNING alert when CPU > 80%
  - CRITICAL alert when CPU > 90%

✅ **Prevents Alert Spam**
  - No duplicate alerts within 1 minute for same server
  - Smart deduplication logic

✅ **Sends Email Notifications**
  - Emails sent to: mariemchaabani39@gmail.com
  - HTML formatted email with alert details
  - Timestamp of when alert occurred

✅ **Stores in MongoDB**
  - All alerts stored in "alerts" collection
  - Includes: serverId, type, metric value, threshold, timestamp
  - Indexed for efficient queries

---

## Installation

### 1. Install nodemailer dependency
```bash
cd backend
npm install nodemailer
```

Or if you want to install it directly:
```bash
npm install --save nodemailer
```

### 2. Configure Email (for production)

Create a `.env` file in the `backend` directory:

#### Option A: Gmail with App Password
```bash
# Get App Password from: https://myaccount.google.com/apppasswords
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/pfe-monitoring
```

#### Option B: Other Email Services
```bash
# For Outlook/Hotmail
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password

# For custom SMTP, update emailService.js with your provider details
```

### 3. Load environment variables in server.js (optional)

If you want to use a .env file, add at the top of server.js:
```javascript
require('dotenv').config();
```

And add to package.json dependencies:
```bash
npm install dotenv
```

---

## How It Works

### Alert Flow

```
Agent sends metrics with cpu_percent
    ↓
Backend receives on POST /metrics
    ↓
CpuAlertService.checkCpuAndAlert() called
    ↓
Check: Is CPU > 80% ?
    ├─ No  → Do nothing
    └─ Yes → Proceed
    ↓
Check: Was alert sent in last 60 seconds?
    ├─ Yes → Skip (prevent duplicate)
    └─ No  → Continue
    ↓
Determine severity
    ├─ CPU 80-90% → WARNING
    └─ CPU > 90%  → CRITICAL
    ↓
Save to MongoDB alerts collection
    ↓
Send email to admin (mariemchaabani39@gmail.com)
    ↓
Update alert with email_sent status
```

---

## Alert Schema (MongoDB)

```javascript
{
  _id: ObjectId,
  serverId: "server-1",
  type: "WARNING",  // or "CRITICAL"
  metric: "cpu_percent",
  value: 85.5,
  threshold: 80,
  timestamp: 2026-04-10T17:44:05.123Z,
  message: "WARNING: CPU usage is 85.5% (threshold: 80%)",
  emailSent: true,
  emailSentAt: 2026-04-10T17:44:06.456Z,
  createdAt: 2026-04-10T17:44:05.123Z,
  updatedAt: 2026-04-10T17:44:06.456Z
}
```

---

## API Endpoints

### Get all alerts
```bash
GET /api/alerts
```

Example response:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "serverId": "server-1",
    "type": "WARNING",
    "metric": "cpu_percent",
    "value": 85.5,
    "threshold": 80,
    "timestamp": "2026-04-10T17:44:05.123Z",
    "message": "WARNING: CPU usage is 85.5% (threshold: 80%)",
    "emailSent": true
  }
]
```

### Get alerts for specific server
```bash
GET /api/alerts/server-1
GET /api/alerts/server-1?limit=50
```

### Get alert statistics
```bash
GET /api/alerts/stats/summary
```

Response:
```json
{
  "summary": [
    { "_id": "WARNING", "count": 5 },
    { "_id": "CRITICAL", "count": 2 }
  ],
  "recent": [
    { "serverId": "server-1", "type": "CRITICAL", ... },
    ...
  ]
}
```

---

## Testing the Alert System

### Test 1: Check MongoDB Connection
```bash
# In MongoDB shell
use pfe-monitoring
db.alerts.find()
```

### Test 2: Simulate High CPU Alert

Edit your agent to send high CPU metric:

```python
# In agent/main.py, modify _collect_metrics or temporarily set:
metrics['cpu_percent'] = 85  # This will trigger WARNING
# or
metrics['cpu_percent'] = 95  # This will trigger CRITICAL
```

Then run agent and check:
1. MongoDB alerts collection for new entry
2. Console for email log (or your email inbox)
3. API endpoint at `GET /api/alerts`

### Test 3: Verify No Duplicates

1. Send metric with CPU 85% → Alert created + email sent
2. Wait 10 seconds
3. Send another metric with CPU 85% → Alert skipped (within 60 seconds)
4. Wait 50 more seconds (total 60)
5. Send another metric with CPU 85% → New alert created

This proves the 1-minute deduplication works!

---

## Troubleshooting

### Issue: No alerts being created

**Check 1**: Verify MongoDB is running
```bash
mongod --version
# or check if running: lsof -i :27017
```

**Check 2**: Check backend logs for errors
```bash
# Look for [AlertService] or [Email] messages
npm start
```

**Check 3**: Verify CPU metric is being sent
```bash
# Check if cpu_percent > 80 in the metrics
GET /api/servers/:id/metrics
```

### Issue: Emails not being sent

**For Development Mode** (no email configured):
```
Output will show in console:
[Email] Alert Email (Demo Mode):
  To: mariemchaabani39@gmail.com
  Subject: [WARNING] CPU Alert on Server server-1
  ...
```

**For Production** (email configured):

1. Verify .env variables are set
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

2. For Gmail, make sure:
   - 2-factor authentication is enabled
   - App Password is used (not regular password)
   - Get it from: https://myaccount.google.com/apppasswords

3. Test email configuration:
   ```javascript
   // Add to server.js temporarily:
   EmailService.sendTestEmail('your-email@gmail.com').then(console.log);
   ```

### Issue: Duplicate alerts still being sent

**Check**: Wait exactly 60 seconds between metrics
  - The deduplication window is exactly 60 seconds
  - Alert at T=0s, no new alert until T=60s

### Issue: MongoDB auth errors

If using MongoDB with authentication:
```bash
# Update connection string in server.js or .env:
MONGODB_URI=mongodb://username:password@localhost:27017/pfe-monitoring?authSource=admin
```

---

## Customizing Alert Thresholds

To change WARNING or CRITICAL thresholds, edit `cpuAlertService.js`:

```javascript
// In cpuAlertService.js checkCpuAndAlert() method:

if (cpuPercent > 95) {  // Change 90 to 95
  alertType = 'CRITICAL';
  threshold = 95;
} else if (cpuPercent > 85) {  // Change 80 to 85
  alertType = 'WARNING';
  threshold = 85;
}
```

Then restart backend: `npm start`

---

## Customizing Admin Email

To change admin email, update server.js line where checkCpuAndAlert is called:

```javascript
// Current:
await CpuAlertService.checkCpuAndAlert(metric, 'mariemchaabani39@gmail.com');

// Change to:
await CpuAlertService.checkCpuAndAlert(metric, 'your-email@example.com');
```

Or make it configurable via .env:
```bash
# In .env
ADMIN_EMAIL=your-email@example.com

# In server.js
await CpuAlertService.checkCpuAndAlert(metric, process.env.ADMIN_EMAIL);
```

---

## Advanced Usage

### Query alerts by type
```javascript
// In MongoDB shell
db.alerts.find({ type: "CRITICAL" })
db.alerts.find({ type: "WARNING" })
```

### Get alerts from last 24 hours
```javascript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
db.alerts.find({ timestamp: { $gte: oneDayAgo } })
```

### Count alerts by server
```javascript
db.alerts.aggregate([
  { $group: { _id: "$serverId", count: { $sum: 1 } } }
])
```

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modified | Added nodemailer dependency |
| `models/Alert.js` | Replaced | Simplified schema for CPU alerts |
| `services/emailService.js` | Replaced | Implemented with nodemailer |
| `services/cpuAlertService.js` | Created | CPU threshold checking + deduplication |
| `server.js` | Modified | Added alert endpoints + CPU alert integration |

---

## Monitoring the Alerting System

### Real-time monitoring in console
```bash
npm start
# Watch for lines:
# [AlertService] Alert saved: server-1 - WARNING
# [Email] Alert sent to mariemchaabani39@gmail.com
```

### Check alerts in Dashboard
```
GET /api/alerts from your dashboard
Displays all alerts with timestamps
```

### Check MongoDB directly
```bash
mongodb> db.alerts.count()                    # Total alerts
mongodb> db.alerts.find().sort({timestamp:-1}).limit(5)  # Last 5
```

---

## Email Template

When an alert is sent, it looks like this:

```
To: mariemchaabani39@gmail.com
Subject: [WARNING] CPU Alert on Server server-1

---

[WARNING] CPU Usage Alert

Server: server-1
Metric: cpu_percent
Current Value: 85.5% (colored red/orange)
Threshold: 80%
Alert Type: WARNING
Timestamp: 2026-04-10T17:44:05.123Z

---
This is an automated alert from your DevOps Monitoring System.
```

---

## Summary

Your alerting system is now ready! Just follow these steps:

1. ✅ **Dependency**: `npm install` (nodemailer added to package.json)
2. ✅ **Configuration**: Optional - Add .env for Gmail setup
3. ✅ **API**: Endpoints available at `/api/alerts`
4. ✅ **MongoDB**: Alerts stored in `pfe-monitoring.alerts` collection
5. ✅ **Testing**: Send a metric with CPU > 80% and watch it trigger!

**Next**: Run your agents and send metrics with high CPU values to test the system!
