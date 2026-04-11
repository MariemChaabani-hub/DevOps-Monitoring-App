# Multi-Server Agent - Quick Start Card

## 🚀 Run in 30 Seconds

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm start

# Terminal 3
cd agent && python multi_server_agent.py
```

Then open: **http://localhost:3000**

---

## 📊 What You Get

### 3 Virtual Servers Sending Metrics
```
server-1: CPU 47%, RAM 59%, Disk 35%
server-2: CPU 52%, RAM 68%, Disk 42%
server-3: CPU 38%, RAM 55%, Disk 28%
```

### Live Dashboard with Real-Time Updates
```
Every 5 seconds, all 3 servers update simultaneously
with unique metric values
```

### Professional Monitoring Interface
```
✓ Server cards with progress bars
✓ Color-coded status (green/yellow/red)
✓ Real-time charts (CPU & RAM trends)
✓ System summary statistics
✓ Independent per-server data
```

---

## 📝 JSON Payload Example

```json
{
  "server_id": "server-1",
  "serverId": "server-1",
  "timestamp": "2026-04-10T15:31:20.123456",
  "cpu_percent": 47.3,
  "ram_percent": 59.8,
  "disk_percent": 35.2,
  "uptime": 86400,
  "network_in": 1024000,
  "network_out": 2048000
}
```

---

## 🎯 Metrics Features

| Server | CPU Baseline | RAM Baseline | Variation |
|--------|-------------|-------------|-----------|
| server-1 | 20-50% | 40-70% | ±8% |
| server-2 | 20-50% | 40-70% | ±8% |
| server-3 | 20-50% | 40-70% | ±8% |

**Each server gets unique random baseline on startup**

---

## 🔧 Customize

### Add More Servers
```python
# In agent/multi_server_agent.py, main() function:
simulator = MultiServerSimulator(
    server_ids=['server-1', 'server-2', 'server-3', 'server-4', 'server-5'],
    api_url='http://localhost:3000',
    interval=5
)
```

### Change Update Interval
```python
interval=10  # 10 seconds instead of 5
```

### Adjust CPU Baselines
```python
self.cpu_baseline = random.uniform(30, 80)  # 30-80% instead of 20-50%
self.cpu_variation = random.uniform(-10, 10)  # ±10% instead of ±8%
```

---

## 🧪 Test Alerts

```bash
cd backend
node test-alerts.js 85   # WARNING (CPU > 80%)
node test-alerts.js 95   # CRITICAL (CPU > 90%)
```

---

## 📁 Key Files

```
agent/
├── multi_server_agent.py       ← Main script to run
├── MULTI_SERVER_GUIDE.md       ← Full documentation
└── requirements.txt

frontend/
├── src/components/Dashboard.js  ← Dashboard component
└── package.json

backend/
├── server.js                    ← API server
└── test-alerts.js               ← Alert testing
```

---

## 🎨 Dashboard Views

### Server Cards
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  server-1    │  │  server-2    │  │  server-3    │
│  Status: 🟢  │  │  Status: 🟡  │  │  Status: 🟢  │
│  CPU:  47%   │  │  CPU:  71%   │  │  CPU:  39%   │
│  RAM:  59%   │  │  RAM:  68%   │  │  RAM:  55%   │
│  Disk: 35%   │  │  Disk: 42%   │  │  Disk: 28%   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Status Logic
- 🟢 OK: CPU < 70%
- 🟡 WARNING: CPU 70-90%
- 🔴 CRITICAL: CPU > 90%

### Summary Stats
```
Total: 3 | Healthy: 2 | Warning: 1 | Critical: 0
```

---

## ⚡ Features

✅ **3 Independent Servers** - Each in own thread
✅ **Unique Metrics** - Different CPU/RAM per server
✅ **Parallel Execution** - All send simultaneously
✅ **5-Second Interval** - Regular metric updates
✅ **Real Uptime** - Uses actual system boot time
✅ **Realistic Variation** - ±5-8% fluctuation
✅ **Easy to Extend** - Add more servers in 1 line
✅ **No Configuration** - Everything code-based

---

## 🛑 Stop

```bash
# Press Ctrl+C in agent terminal
# Graceful shutdown with statistics
```

---

## 📚 Documentation

- **MULTI_SERVER_IMPLEMENTATION.md** - Full details
- **MULTI_SERVER_GUIDE.md** - Comprehensive guide
- **INTEGRATION_GUIDE.md** - System integration
- **SETUP_CHECKLIST.md** - Verification steps

---

## 💡 Tips

### Monitor in Real-Time
```bash
# Terminal 1: Backend (keeps running)
cd backend && npm start

# Terminal 2: Frontend (keeps running)
cd frontend && npm start

# Terminal 3: Agent (shows live logs)
cd agent && python multi_server_agent.py
```

### View Logs
```bash
# See each server sending metrics:
# [Server.server-1] - INFO - ✓ Sent - CPU: 47.1%, RAM: 59.8%
# [Server.server-2] - INFO - ✓ Sent - CPU: 52.3%, RAM: 68.5%
# [Server.server-3] - INFO - ✓ Sent - CPU: 39.2%, RAM: 55.9%
```

### Check API
```bash
curl http://localhost:3000/api/servers
curl http://localhost:3000/api/servers/server-1/metrics
curl http://localhost:3000/api/alerts
```

---

## 🎯 Next

1. ✅ Run: `python multi_server_agent.py`
2. ✅ View: http://localhost:3000
3. ✅ Monitor: 3 servers with live metrics
4. ✅ Test: Alert system with high CPU
5. ✅ Deploy: Production-ready system

**Enjoy your multi-server monitoring!** 🚀
