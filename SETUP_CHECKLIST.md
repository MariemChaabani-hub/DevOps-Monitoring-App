# Quick Setup & Deployment Checklist

## ✅ Phase 1: Installation (5 minutes)

### Backend Setup
- [ ] Navigate to `backend/` directory
- [ ] Run `npm install` (installs axios, recharts, tailwindcss, etc.)
- [ ] Verify MongoDB is running
- [ ] Run `npm start`
- [ ] Verify backend running: `curl http://localhost:3000/api/servers`

### Frontend Setup
- [ ] Navigate to `frontend/` directory  
- [ ] Run `npm install` (installs axios, recharts, tailwindcss)
- [ ] Run `npm start`
- [ ] Verify React opens at http://localhost:3000 (or next available port)

### Agent Setup
- [ ] Navigate to `agent/` directory
- [ ] Run `pip install -r requirements.txt`
- [ ] Run `python main.py`
- [ ] Verify metrics being sent: check backend terminal for logs

---

## ✅ Phase 2: Verification (2 minutes)

### Check Backend
```bash
# Terminal with backend running
# Should see: [OK] DevOps Monitoring Dashboard - Backend
# Should see: Available endpoints: GET /api/servers, GET /api/servers/:id/metrics, etc.
```

### Check Frontend
```bash
# Browser at http://localhost:3000
# Should see: "Loading servers..." → then server cards appear
# Should update every 5 seconds
```

### Check Agent
```bash
# Terminal with agent running
# Should see: "Sending metrics to http://localhost:3000/metrics"
# Should see: "CPU: X%, RAM: Y%, Disk: Z%"
```

### Check Database
```bash
mongo
use pfe-monitoring
db.servers.find()           # Should show server(s)
db.metrics.find()           # Should have metric documents
db.alerts.find()            # Should be empty (no alerts yet)
```

---

## ✅ Phase 3: Dashboard Features (5 minutes)

### Server Cards
- [ ] See multiple server cards (one per running agent)
- [ ] Each card shows:
  - [ ] Server ID
  - [ ] Status badge (green/yellow/red)
  - [ ] CPU % with progress bar
  - [ ] RAM % with progress bar
  - [ ] Disk % with progress bar
  - [ ] Last update timestamp

### Status Colors
- [ ] Green badge for CPU < 70% (OK)
- [ ] Yellow badge for CPU 70-90% (WARNING)
- [ ] Red badge for CPU > 90% (CRITICAL)

### Charts
- [ ] Click on a server card
- [ ] See detail view with CPU/RAM chart
- [ ] Chart shows last 60 seconds (12 data points)
- [ ] Chart updates every 5 seconds

### Summary Statistics
- [ ] Total Servers count
- [ ] Healthy Servers (CPU < 70%)
- [ ] Warning Servers (CPU 70-90%)
- [ ] Critical Servers (CPU > 90%)
- [ ] All update in real-time

---

## ✅ Phase 4: Alert Testing (5 minutes)

### Trigger WARNING Alert
```bash
cd backend
node test-alerts.js 85      # CPU = 85% (triggers warning)
```
- [ ] Check MongoDB: `db.alerts.find({type: "WARNING"})`
- [ ] See alert in response
- [ ] Check console: Email sent (demo mode) or inbox (real email)

### Trigger CRITICAL Alert  
```bash
node test-alerts.js 95      # CPU = 95% (triggers critical)
```
- [ ] Check MongoDB: `db.alerts.find({type: "CRITICAL"})`
- [ ] See different alert
- [ ] Email sent

### Test Deduplication
```bash
node test-alerts.js 85      # First alert (created)
# Wait 30 seconds
node test-alerts.js 85      # Duplicate (skipped, within 60s)
# Wait 31 more seconds (total 61 seconds)
node test-alerts.js 85      # New alert (after 60s cooldown)
```
- [ ] Only 2 alerts in database total, not 3
- [ ] Deduplication confirmed

---

## ✅ Phase 5: Email Configuration (Optional, 3 minutes)

### For Demo Mode (Default)
- [ ] Alerts show in backend terminal console logs
- [ ] Text: `[Email] Alert Email (Demo Mode):`
- [ ] No email configuration needed

### For Real Emails (Gmail)
1. [ ] Go to https://myaccount.google.com/apppasswords
   - [ ] Select "Mail" application
   - [ ] Select "Windows" device
   - [ ] Get 16-character App Password

2. [ ] Set environment variables
   ```powershell
   $env:EMAIL_USER = "your-email@gmail.com"
   $env:EMAIL_PASS = "16-character-app-password"
   ```

3. [ ] Restart backend: `npm start`

4. [ ] Test alert: `node test-alerts.js 85`

5. [ ] Check email inbox
   - [ ] Subject: "[WARNING] CPU Alert on Server server-1"
   - [ ] Contains CPU value, threshold, timestamp

---

## ✅ Phase 6: Dashboard Customization (Optional)

### Change Refresh Interval
Edit `frontend/src/components/Dashboard.js` line ~90:
```javascript
setInterval(fetchAllMetrics, 5000);  // Change 5000 to desired milliseconds
```

### Change Status Thresholds
Edit `frontend/src/components/ServerCard.js` line ~35:
```javascript
if (cpu > 90) { status = 'CRITICAL'; }    // Change 90 to desired threshold
else if (cpu > 70) { status = 'WARNING'; } // Change 70 to desired threshold
```

### Change Color Scheme
Edit `frontend/tailwind.config.js`:
```javascript
colors: {
  'status-ok': '#10b981',       // Change green color
  'status-warning': '#f59e0b',  // Change yellow color
  'status-critical': '#ef4444'  // Change red color
}
```

---

## 🎯 What Each Component Does

### Backend (`localhost:3000`)
- Receives metrics from Python agent
- Stores in MongoDB
- Checks CPU thresholds
- Sends email alerts
- Provides REST API for dashboard

### Frontend (`localhost:3000`via React)
- Displays 5+ servers with live metrics
- Shows real-time status badges
- Renders CPU/RAM trend charts
- Updates every 5 seconds
- Professional DevOps dashboard style

### Agent (`python main.py`)
- Collects CPU, RAM, Disk, Network metrics
- Sends to backend every 5 seconds
- Runs continuously
- Auto-creates server entry

### Alerts
- CPU > 80% = WARNING
- CPU > 90% = CRITICAL
- One alert per server per type per 60 seconds
- Stored in MongoDB
- Email notification sent

---

## 📊 Expected Output

### Backend Terminal
```
[OK] DevOps Monitoring Dashboard - Backend
API Server:       http://localhost:3000
WebSocket:        ws://localhost:3000
Database:         MongoDB
Status:           Running

Available endpoints:
  GET  /api/servers
  GET  /api/servers/:id/metrics
  POST /metrics
  GET  /api/alerts
  ...
```

### Frontend Browser
```
DevOps Monitoring Dashboard
Real-time server monitoring and performance tracking

Servers Overview
[Server Card 1] [Server Card 2] [Server Card 3]
├─ Server ID
├─ Status: 🟢 OK
├─ CPU: 45.2%
├─ RAM: 62.1%
├─ Disk: 34.5%

Detailed Metrics - server-1
[Area Chart showing CPU and RAM trends over 60 seconds]

System Summary
├─ Total Servers: 3
├─ Healthy: 3
├─ Warning: 0
└─ Critical: 0
```

### Agent Terminal
```
Connected to http://localhost:3000
Collecting metrics every 5 seconds
Sending metrics...
CPU: 45.2%, RAM: 62.1%, Disk: 34.5%, Uptime: 86400s
CPU: 46.1%, RAM: 62.3%, Disk: 34.5%, Uptime: 86405s
...
```

---

## 🚨 Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Dashboard shows "Loading servers..." | Check backend is running: `curl http://localhost:3000/api/servers` |
| No data in charts | Wait 30+ seconds for metrics to accumulate (need 5+ data points) |
| Frontend won't start | Kill other process on port 3000 or use different port |
| Backend won't start | Check MongoDB running: `mongod --version` |
| Agent not sending | Check Python installed: `python --version` and `pip install -r requirements.txt` |
| Email not working | Check backend logs, verify EMAIL_USER/EMAIL_PASS set correctly |
| Alerts not triggering | Run test: `node test-alerts.js 95` to verify system |

---

## 📁 Files Created/Modified This Session

| Category | File | Status |
|----------|------|--------|
| **Frontend - Config** | `package.json` | ✅ Updated (added axios, recharts, tailwindcss) |
| **Frontend - Config** | `tailwind.config.js` | ✅ Created |
| **Frontend - Config** | `postcss.config.js` | ✅ Created |
| **Frontend - Styles** | `src/index.css` | ✅ Updated (added Tailwind directives) |
| **Frontend - Main** | `src/App.js` | ✅ Updated (uses Dashboard) |
| **Frontend - Styles** | `src/App.css` | ✅ Updated (minimal styles) |
| **Frontend - Components** | `src/components/Dashboard.js` | ✅ Created |
| **Frontend - Components** | `src/components/ServerCard.js` | ✅ Created |
| **Frontend - Components** | `src/components/MetricsChart.js` | ✅ Created |
| **Frontend - Components** | `src/components/StatusBadge.js` | ✅ Created |
| **Documentation** | `frontend/DASHBOARD_GUIDE.md` | ✅ Created |
| **Documentation** | `README.md` | ✅ Created |

---

## ✨ Features Summary

- ✅ **Multi-server dashboard** - Cards for each server
- ✅ **Live metrics** - CPU, RAM, Disk, Network, Uptime
- ✅ **Status indicators** - Color-coded badges (green/yellow/red)
- ✅ **Real-time charts** - CPU/RAM trends (last 60 seconds)
- ✅ **Auto-update** - Every 5 seconds
- ✅ **Professional styling** - Dark theme, responsive design
- ✅ **Alert system** - CPU thresholds (80%, 90%)
- ✅ **Deduplication** - 60-second cooldown per alert
- ✅ **Email alerts** - Nodemailer configured
- ✅ **System summary** - Overview statistics

---

## 🎉 You're Ready!

Run all three commands in separate terminals and monitor your system in real-time:

```bash
# Terminal 1
cd backend && npm start

# Terminal 2  
cd frontend && npm start

# Terminal 3
cd agent && python main.py
```

Then open: **http://localhost:3000** and enjoy your professional monitoring dashboard! 🚀
