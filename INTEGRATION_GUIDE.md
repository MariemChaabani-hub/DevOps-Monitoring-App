# Multi-Server Agent Integration Guide

## Running Your Complete System

This guide shows how to run the **entire monitoring system** with 3 virtual servers.

---

## Setup (One-Time)

### 1. Install Python Dependencies

```bash
cd agent
pip install -r requirements.txt
```

Ensure you have:
- `psutil` - System metrics
- `requests` - HTTP requests

### 2. Install Node Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## Full System Startup

Open **3 terminals** in your workspace:

### Terminal 1: Backend API Server

```bash
cd backend
npm start
```

**Expected Output:**
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
  ...
```

**Verify:** Open http://localhost:3000 in browser - should get JSON response

### Terminal 2: Frontend Dashboard

```bash
cd frontend
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view frontend in the browser.

  Local:   http://localhost:3000
  On Your Network: ...
```

Browser will open automatically showing: "Loading servers..."

### Terminal 3: Multi-Server Agent (Simulates 3 Servers)

```bash
cd agent
python multi_server_agent.py
```

**Expected Output:**
```
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - ================================================================================
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - [START] MULTI-SERVER MONITORING SIMULATOR
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - Servers: server-1, server-2, server-3
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - ================================================================================
2026-04-10 15:30:45 - [Server.server-1] - INFO - Initialized - CPU baseline: 45.2%, RAM baseline: 62.1%
2026-04-10 15:30:45 - [Server.server-2] - INFO - Initialized - CPU baseline: 52.3%, RAM baseline: 68.5%
2026-04-10 15:30:45 - [Server.server-3] - INFO - Initialized - CPU baseline: 38.9%, RAM baseline: 55.7%
2026-04-10 15:30:46 - [Server.server-1] - INFO - Starting collection loop (interval: 5s)
2026-04-10 15:30:46 - [Server.server-2] - INFO - Starting collection loop (interval: 5s)
2026-04-10 15:30:46 - [Server.server-3] - INFO - Starting collection loop (interval: 5s)

All servers running. Monitoring dashboard: http://localhost:3000

2026-04-10 15:30:51 - [Server.server-1] - INFO - ✓ Sent - CPU: 47.1%, RAM: 59.8%, Disk: 35.2%
2026-04-10 15:30:51 - [Server.server-2] - INFO - ✓ Sent - CPU: 51.5%, RAM: 70.2%, Disk: 42.1%
2026-04-10 15:30:51 - [Server.server-3] - INFO - ✓ Sent - CPU: 39.5%, RAM: 56.1%, Disk: 28.7%
```

---

## Watch the Dashboard

Go to **http://localhost:3000** in your browser:

### What You'll See

**Servers Overview:**
- 3 server cards (server-1, server-2, server-3)
- Each with unique metrics:
  - CPU % with progress bar
  - RAM % with progress bar
  - Disk % with progress bar
  - Status badge (🟢 OK, 🟡 WARNING, 🔴 CRITICAL)

**Example:**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  server-1    │  │  server-2    │  │  server-3    │
│  Status: 🟢  │  │  Status: 🟡  │  │  Status: 🟢  │
│  CPU:  47%   │  │  CPU:  71%   │  │  CPU:  39%   │
│  RAM:  59%   │  │  RAM:  70%   │  │  RAM:  56%   │
│  Disk: 35%   │  │  Disk: 42%   │  │  Disk: 28%   │
└──────────────┘  └──────────────┘  └──────────────┘

     Last updated: 15:30:51
```

### Live Updates

- ✅ Every 5 seconds, all metrics update
- ✅ server-2 shows WARNING (CPU 71% > 70%)
- ✅ server-1 and server-3 show OK (CPU < 70%)
- ✅ Each server has different values

### Click on a Server

- Click any server card
- See detailed chart showing CPU & RAM history (last 60 seconds)
- Chart updates in real-time

---

## System Summary

Below the server cards, see real-time statistics:

```
┌─────────┬──────────┬──────────┬────────────┐
│ Servers │ Healthy  │ Warning  │ Critical   │
│    3    │    2     │    1     │      0     │
└─────────┴──────────┴──────────┴────────────┘
```

This updates automatically based on CPU thresholds:
- Healthy: CPU < 70%
- Warning: CPU 70-90%
- Critical: CPU > 90%

---

## Test Alert System

### Trigger WARNING Alert

```bash
cd backend
node test-alerts.js 85
```

Expected:
- Alert created in MongoDB
- Email sent (console log in demo mode)
- Dashboard shows CPU 85% = WARNING

### Trigger CRITICAL Alert

```bash
node test-alerts.js 95
```

Expected:
- Alert created with type CRITICAL
- Dashboard shows CPU 95% = CRITICAL

### Check Alerts in API

```bash
curl http://localhost:3000/api/alerts
```

Response:
```json
[
  {
    "_id": "...",
    "serverId": "server-1",
    "type": "WARNING",
    "value": 85,
    "threshold": 80,
    ...
  },
  {
    "_id": "...",
    "serverId": "server-1",
    "type": "CRITICAL",
    "value": 95,
    "threshold": 90,
    ...
  }
]
```

---

## Component Overview

### Backend (Terminal 1)
```
Node.js Express Server
├─ Receives POST /metrics from agent
├─ Stores metrics in MongoDB
├─ Checks CPU thresholds
├─ Sends email alerts
├─ Provides REST API
└─ WebSocket for real-time updates
```

### Frontend (Terminal 2)
```
React Dashboard
├─ Fetches servers from GET /api/servers
├─ Fetches metrics from GET /api/servers/:id/metrics
├─ Displays server cards with live metrics
├─ Shows charts with historical data
├─ Updates every 5 seconds
└─ Displays system summary statistics
```

### Agent (Terminal 3)
```
3 Virtual Servers
├─ server-1: 45% CPU, 62% RAM (baseline)
├─ server-2: 52% CPU, 68% RAM (baseline)
├─ server-3: 38% CPU, 55% RAM (baseline)
└─ Each sends metrics to POST /metrics every 5 seconds
```

---

## Data Flow

```
Server 1 ─┐
          ├─→ Agent (multi_server_agent.py)
Server 2 ─┤     (3 threads)
          │
Server 3 ─┘
            ↓ POST /metrics every 5 seconds
            
         Backend
         (Express)
            ↓
         MongoDB
         (stores metrics)
            ↓
         Frontend pulls
         GET /api/metrics
            ↓
         React Dashboard
         (updates every 5s)
```

---

## Stopping Everything

### Graceful Shutdown

1. **Stop Agent**: Press `Ctrl+C` in Terminal 3
   ```
   [STOP] Shutdown signal received
   [SHUTDOWN] Stopping all servers...
   Final Statistics:
   ...
   All servers stopped successfully
   ```

2. **Stop Frontend**: Press `Ctrl+C` in Terminal 2
   ```
   Terminated
   ```

3. **Stop Backend**: Press `Ctrl+C` in Terminal 1
   ```
   Shutting down...
   ```

---

## Verification Checklist

- [ ] Backend running on http://localhost:3000
- [ ] Frontend running (React development server)
- [ ] Agent sending 3 servers
- [ ] Dashboard shows 3 server cards
- [ ] Metrics update every 5 seconds
- [ ] Different values for each server
- [ ] Status badges show correct colors
- [ ] Charts update in real-time
- [ ] System summary updates correctly

---

## Troubleshooting

### Dashboard shows "Loading servers..." forever

**Problem:** Frontend can't reach backend API

**Solution:**
```bash
# Check backend is running
curl http://localhost:3000/api/servers

# Should return JSON array []
# If connection refused, backend not running
```

### Agent sends metrics but dashboard doesn't update

**Problem:** Frontend not polling or data not in DB

**Solution:**
```bash
# Check database has metrics
mongo
use pfe-monitoring
db.metrics.find().count()

# Check API endpoint works
curl http://localhost:3000/api/servers/server-1/metrics

# If empty, agent not sending yet (wait 5 seconds)
```

### All servers show same metrics

**Problem:** Metrics not varying

**Solution:** This should not happen. Each server has random baseline.
- Check agent is sending different `serverId` in each request
- Wait 10+ seconds for variation to appear
- Metrics vary ±5-8% around baseline

### Agent crashes on startup

**Problem:** Missing dependencies or connection error

**Solution:**
```bash
# Install dependencies
pip install -r requirements.txt

# Check requests and psutil installed
python -c "import requests, psutil; print('OK')"

# Check backend is running
curl http://localhost:3000/
```

---

## Next Steps

1. ✅ Run all 3 terminals
2. ✅ View dashboard at http://localhost:3000
3. ✅ Watch 3 servers with live metrics
4. ✅ Test alerts with `node test-alerts.js`
5. ✅ Customize thresholds if desired
6. ✅ Deploy to production when ready

---

## Performance Expectations

- **Dashboard Load Time**: ~2 seconds
- **Metric Update Latency**: <1 second
- **API Response Time**: 100-200ms
- **Memory Usage**: ~200 MB (backend + frontend)
- **Network**: ~1 KB per 5 seconds (3 servers)

---

## File Structure

```
pfe-project/
├── backend/
│   ├── server.js         # Main Express app
│   ├── models/           # MongoDB schemas
│   ├── services/         # Alert and status services
│   ├── routes/           # API routes
│   └── test-alerts.js    # Alert testing utility
├── frontend/
│   ├── src/
│   │   ├── App.js        # Root component
│   │   ├── components/
│   │   │   ├── Dashboard.js  # Main dashboard
│   │   │   ├── ServerCard.js
│   │   │   ├── MetricsChart.js
│   │   │   └── StatusBadge.js
│   │   └── index.js
│   └── package.json
└── agent/
    ├── multi_server_agent.py  # 3 virtual servers 🆕
    ├── main.py               # Single server option
    ├── collector.py
    ├── sender.py
    └── config.json
```

---

## Quick Command Reference

```bash
# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm start

# Start multi-server agent
cd agent && python multi_server_agent.py

# Test alert
cd backend && node test-alerts.js 85

# Check servers in API
curl http://localhost:3000/api/servers

# Check metrics
curl http://localhost:3000/api/servers/server-1/metrics

# Check alerts
curl http://localhost:3000/api/alerts
```

Enjoy your multi-server monitoring system! 🚀
