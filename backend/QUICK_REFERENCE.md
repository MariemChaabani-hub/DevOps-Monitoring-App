# CPU Alerting System - Quick Reference

## 📋 One-Page Setup & Testing Guide

### Installation (1 minute)
```bash
cd backend
npm install
npm start
```

### Test Alert System (2 minutes)
```bash
# Terminal 2
cd backend

# Test WARNING alert (CPU > 80%)
node test-alerts.js 85

# Test CRITICAL alert (CPU > 90%)
node test-alerts.js 95

# Test normal (CPU < 80%)
node test-alerts.js 50
```

### Verify in MongoDB
```bash
mongo
use pfe-monitoring
db.alerts.find()
```

---

## 🔧 Configuration

### Email Setup (Optional - for production)

**Gmail:**
1. Go to: https://myaccount.google.com/apppasswords
2. Create App Password
3. Set environment variables:
```powershell
$env:EMAIL_USER = "your-email@gmail.com"
$env:EMAIL_PASS = "your-app-password"
npm start
```

**Or create `.env` file:**
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 🚀 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/alerts` | GET | Get all alerts |
| `/api/alerts/server-1` | GET | Get alerts for server-1 |
| `/api/alerts/stats/summary` | GET | Get alert statistics |
| `/metrics` | POST | Send server metric |

### Example Requests
```bash
# Get all alerts
curl http://localhost:3000/api/alerts

# Get server-specific alerts
curl http://localhost:3000/api/alerts/server-1

# Get statistics
curl http://localhost:3000/api/alerts/stats/summary
```

---

## 📊 Alert Schema

```javascript
{
  serverId: "server-1",          // Server identifier
  type: "WARNING",               // "WARNING" or "CRITICAL"
  metric: "cpu_percent",         // Always cpu_percent
  value: 85.5,                   // Actual CPU %
  threshold: 80,                 // Threshold that triggered (80 or 90)
  timestamp: "2026-04-10T...",   // When alert created
  message: "WARNING: CPU...",    // Human readable
  emailSent: true,               // Email status
  emailSentAt: "2026-04-10T..."  // When email sent
}
```

---

## ⚙️ How It Works

```
Metric arrives with cpu_percent
     ↓
CpuAlertService.checkCpuAndAlert() called
     ↓
Is CPU > 80%?
  ├─ NO  → No alert
  └─ YES → Continue
     ↓
Was alert sent in last 60 seconds?
  ├─ YES → Skip (deduplication)
  └─ NO  → Create alert
     ↓
Determine severity:
  ├─ 80-90%  → WARNING
  └─ >90%    → CRITICAL
     ↓
Save to MongoDB + Send email
```

---

## 🎯 Alert Triggers

| CPU Level | Result | Threshold |
|-----------|--------|-----------|
| < 80% | No action | - |
| 80-90% | ⚠️ WARNING | 80% |
| > 90% | 🔴 CRITICAL | 90% |

---

## 🧪 Quick Test Scenarios

### Test 1: Trigger WARNING
```bash
node test-alerts.js 85
# ✅ Should create WARNING alert
# ✅ Email sent to mariemchaabani39@gmail.com
```

### Test 2: Trigger CRITICAL
```bash
node test-alerts.js 95
# ✅ Should create CRITICAL alert
# ✅ Separate from WARNING
```

### Test 3: Check Deduplication (60-second cooldown)
```bash
node test-alerts.js 85 server-1      # Alert created
sleep 30
node test-alerts.js 85 server-1      # Skipped (within 60s)
sleep 30
node test-alerts.js 85 server-1      # Created (after 60s)
```

### Test 4: Multiple Servers
```bash
node test-alerts.js 85 server-1
node test-alerts.js 95 server-2
node test-alerts.js 85 server-3
# ✅ All 3 alerts created independently
```

---

## 📁 Files Added/Modified

| File | Status | What Changed |
|------|--------|--------------|
| `package.json` | Modified | Added nodemailer |
| `models/Alert.js` | Replaced | Simplified schema |
| `services/emailService.js` | Replaced | Nodemailer implementation |
| `services/cpuAlertService.js` | Created | CPU alert logic |
| `server.js` | Modified | Integrated alert checking |
| `test-alerts.js` | Created | Testing utility |
| `ALERTING_SETUP.md` | Created | Full setup guide |
| `TESTING_GUIDE.md` | Created | Detailed testing |

---

## ✅ Checklist

- [ ] Installed nodemailer: `npm install`
- [ ] Backend starts: `npm start`
- [ ] Test WARNING: `node test-alerts.js 85`
- [ ] Test CRITICAL: `node test-alerts.js 95`
- [ ] Check MongoDB: `db.alerts.find()`
- [ ] Check API: `curl http://localhost:3000/api/alerts`
- [ ] (Optional) Configure email in .env
- [ ] (Optional) Test real emails

---

## 🔍 Troubleshooting

### Backend won't start
```bash
# Check Node.js version
node --version

# Install missing dependencies
npm install

# Check MongoDB
mongod --version
```

### No alerts created
```bash
# Check if CPU is > 80%
node test-alerts.js 85

# Check MongoDB connection
mongo
> use pfe-monitoring
> db.alerts.find()
```

### Email not working
```bash
# Check environment variables
echo $EMAIL_USER
echo $EMAIL_PASS

# For Gmail, use App Password (not regular password)
# Get it from: https://myaccount.google.com/apppasswords

# Test endpoint
curl http://localhost:3000/api/alerts
```

### Duplicate alerts still coming
```bash
# The cooldown is exactly 60 seconds from alert creation
# Wait 60+ seconds between identical alerts

# Check timestamps in MongoDB
db.alerts.find({serverId: "server-1", type: "WARNING"})
```

---

## 📖 Documentation Files

- **ALERTING_SETUP.md** - Complete setup guide with all options
- **TESTING_GUIDE.md** - Detailed testing procedures and scenarios
- **This file** - Quick reference for common tasks

---

## 🎓 Example Usage

### From Python Agent
```python
import requests

metrics = {
    'server_id': 'server-1',
    'cpu_percent': 85.5,
    'memory_percent': 50,
    'disk_percent': 40,
    'network_in': 1000,
    'network_out': 2000,
    'uptime': 86400
}

response = requests.post('http://localhost:3000/metrics', json=metrics)
print(response.status_code)  # 200 if successful
```

### From JavaScript
```javascript
const metric = {
  server_id: 'server-1',
  cpu_percent: 85.5,
  memory_percent: 50,
  disk_percent: 40,
  network_in: 1000,
  network_out: 2000,
  uptime: 86400
};

fetch('http://localhost:3000/metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(metric)
});
```

### From cURL
```bash
curl -X POST http://localhost:3000/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "server-1",
    "cpu_percent": 85.5,
    "memory_percent": 50,
    "disk_percent": 40,
    "network_in": 1000,
    "network_out": 2000,
    "uptime": 86400
  }'
```

---

## 📞 Support

If alerts aren't working:

1. **Check logs**: Look for `[AlertService]` or `[Email]` messages in terminal
2. **Test connectivity**: Verify MongoDB and backend are running
3. **Verify threshold**: Make sure CPU value is > 80%
4. **Check deduplication**: Wait 60+ seconds before resending
5. **Review documentation**: See ALERTING_SETUP.md and TESTING_GUIDE.md

---

## 🎉 You're All Set!

Your CPU alerting system is ready to use. Start with:
```bash
npm install && npm start
```

Then test with:
```bash
node test-alerts.js 85
```

That's it! 🚀
