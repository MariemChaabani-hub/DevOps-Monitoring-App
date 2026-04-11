# Multi-Server Agent Guide

## Overview

The **multi-server agent** simulates 3 virtual servers (`server-1`, `server-2`, `server-3`), each sending independent metrics to the backend API.

**Key Features:**
- ✅ **3 Independent Servers** - Each runs in its own thread
- ✅ **Unique Baselines** - Different CPU/RAM values for each server
- ✅ **Metric Variation** - Each metric slightly varies ±5-8% from baseline
- ✅ **Parallel Execution** - All 3 servers send simultaneously
- ✅ **Real Uptime** - Uses actual system uptime
- ✅ **5-Second Interval** - Sends metrics every 5 seconds

---

## Quick Start

```bash
cd agent
python multi_server_agent.py
```

**Expected Output:**
```
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - ================================================================================
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - [START] MULTI-SERVER MONITORING SIMULATOR
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - Servers: server-1, server-2, server-3
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - API URL: http://localhost:3000
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - Collection Interval: 5s
2026-04-10 15:30:45 - [MultiServerSimulator] - INFO - ================================================================================
2026-04-10 15:30:45 - [Server.server-1] - INFO - Initialized - CPU baseline: 45.2%, RAM baseline: 62.1%
2026-04-10 15:30:45 - [Server.server-2] - INFO - Initialized - CPU baseline: 52.3%, RAM baseline: 68.5%
2026-04-10 15:30:45 - [Server.server-3] - INFO - Initialized - CPU baseline: 38.9%, RAM baseline: 55.7%
2026-04-10 15:30:46 - [Server.server-1] - INFO - ✓ Sent - CPU: 47.1%, RAM: 59.8%, Disk: 35.2%
2026-04-10 15:30:46 - [Server.server-2] - INFO - ✓ Sent - CPU: 51.5%, RAM: 70.2%, Disk: 42.1%
2026-04-10 15:30:46 - [Server.server-3] - INFO - ✓ Sent - CPU: 39.5%, RAM: 56.1%, Disk: 28.7%
```

---

## How It Works

### Each Virtual Server

1. **Unique Baseline Metrics**
   - **Server-1**: CPU ~45%, RAM ~62%
   - **Server-2**: CPU ~52%, RAM ~68%
   - **Server-3**: CPU ~38%, RAM ~55%
   - Baselines are randomized on startup

2. **Metric Variation**
   - Each metric varies ±5-8% from baseline
   - Creates realistic fluctuations
   - Example: If CPU baseline is 45%, actual values range 37-53%

3. **Sending Metrics**
   - Format: `POST /metrics` with JSON payload
   - Includes: `serverId`, `cpu_percent`, `ram_percent`, `disk_percent`, `uptime`, etc.
   - Sent every 5 seconds independently

### Example Payloads

**Server-1:**
```json
{
  "server_id": "server-1",
  "serverId": "server-1",
  "timestamp": "2026-04-10T15:30:46.123456",
  "cpu_percent": 47.1,
  "ram_percent": 59.8,
  "disk_percent": 35.2,
  "memory_percent": 59.8,
  "uptime": 86400,
  "network_in": 1024000,
  "network_out": 2048000
}
```

**Server-2:**
```json
{
  "server_id": "server-2",
  "serverId": "server-2",
  "timestamp": "2026-04-10T15:30:46.234567",
  "cpu_percent": 51.5,
  "ram_percent": 70.2,
  "disk_percent": 42.1,
  "memory_percent": 70.2,
  "uptime": 86400,
  "network_in": 1024000,
  "network_out": 2048000
}
```

**Server-3:**
```json
{
  "server_id": "server-3",
  "serverId": "server-3",
  "timestamp": "2026-04-10T15:30:46.345678",
  "cpu_percent": 39.5,
  "ram_percent": 56.1,
  "disk_percent": 28.7,
  "memory_percent": 56.1,
  "uptime": 86400,
  "network_in": 1024000,
  "network_out": 2048000
}
```

---

## Threading Architecture

```
Main Process
    │
    ├─ VirtualServer (server-1)
    │  └─ Thread: Collect CPU/RAM/Disk → Send to /metrics every 5s
    │
    ├─ VirtualServer (server-2)
    │  └─ Thread: Collect CPU/RAM/Disk → Send to /metrics every 5s
    │
    └─ VirtualServer (server-3)
       └─ Thread: Collect CPU/RAM/Disk → Send to /metrics every 5s
```

**All 3 servers run in parallel** - metrics are sent simultaneously every 5 seconds.

---

## Metric Characteristics

### CPU Percentage
- **Server-1**: 20-50% baseline + ±8% variation → 12-58%
- **Server-2**: 20-50% baseline + ±8% variation → 12-58%
- **Server-3**: 20-50% baseline + ±8% variation → 12-58%
- *Each server has different baseline*

### RAM Percentage
- **Server-1**: 40-70% baseline + ±5% variation → 35-75%
- **Server-2**: 40-70% baseline + ±5% variation → 35-75%
- **Server-3**: 40-70% baseline + ±5% variation → 35-75%
- *Each server has different baseline*

### Disk Percentage
- **All Servers**: 20-60% baseline + ±2% variation → 18-62%
- Similar across servers (less variation)

### Uptime
- Real system uptime (seconds since boot)
- Same for all servers (same physical machine)

### Network I/O
- Real network metrics from system
- Same for all servers (same physical machine)

---

## Monitoring Dashboard Integration

When running the multi-server agent:

1. **View all 3 servers** in the React dashboard
2. **Different colors for each** based on CPU threshold
3. **Independent trends** - each server has its own chart
4. **Real-time updates** every 5 seconds

**Dashboard URL:** http://localhost:3000

**Expected View:**
```
┌─────────────────────────────────────────────────┐
│   DevOps Monitoring Dashboard                   │
│   Last update: 15:30:50                         │
└─────────────────────────────────────────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  server-1    │  │  server-2    │  │  server-3    │
│  Status: 🟢  │  │  Status: 🟢  │  │  Status: 🟢  │
│  CPU:  47%   │  │  CPU:  51%   │  │  CPU:  39%   │
│  RAM:  59%   │  │  RAM:  70%   │  │  RAM:  56%   │
│  Disk: 35%   │  │  Disk: 42%   │  │  Disk: 28%   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Running Multi-Server Agent

### Terminal Setup

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend  
cd frontend
npm start

# Terminal 3: Multi-Server Agent
cd agent
python multi_server_agent.py
```

### Expected Results

**Backend Terminal:**
```
Metrics POST received:
  server-1: CPU 47.1%, RAM 59.8%
  server-2: CPU 51.5%, RAM 70.2%
  server-3: CPU 39.5%, RAM 56.1%
...
```

**Frontend Browser (http://localhost:3000):**
- 3 server cards displayed
- All update simultaneously every 5 seconds
- Each shows unique metrics

**Agent Terminal:**
```
✓ server-1: CPU 47.1%, RAM 59.8%, Disk 35.2%
✓ server-2: CPU 51.5%, RAM 70.2%, Disk 42.1%
✓ server-3: CPU 39.5%, RAM 56.1%, Disk 28.7%
```

---

## Differences from Single-Server Agent

| Feature | Single Agent (`main.py`) | Multi-Server Agent (`multi_server_agent.py`) |
|---------|-------------------------|----------------------------------------------|
| Servers Simulated | 1 | 3 |
| Execution | Single thread | 3 parallel threads |
| Metrics Variation | Real system | Simulated unique baselines |
| Configuration | `config.json` | Code-defined |
| Use Case | Real monitoring | Dashboard testing |
| Metrics Freshness | Real-time | Simulated 5s interval |

---

## Customization

### Add More Servers

Edit `multi_server_agent.py`, in `main()` function:

```python
simulator = MultiServerSimulator(
    server_ids=['server-1', 'server-2', 'server-3', 'server-4'],  # Add more here
    api_url='http://localhost:3000',
    interval=5
)
```

### Change Collection Interval

```python
# From 5 seconds to 10 seconds
simulator = MultiServerSimulator(
    server_ids=['server-1', 'server-2', 'server-3'],
    api_url='http://localhost:3000',
    interval=10  # Changed from 5 to 10
)
```

### Change API Endpoint

```python
simulator = MultiServerSimulator(
    server_ids=['server-1', 'server-2', 'server-3'],
    api_url='http://192.168.1.100:3000',  # Different host/port
    interval=5
)
```

### Adjust Metric Baselines

Edit `VirtualServer.__init__()`:

```python
# Change baseline ranges
self.cpu_baseline = random.uniform(30, 70)       # 30-70% instead of 20-50%
self.ram_baseline = random.uniform(50, 80)       # 50-80% instead of 40-70%
self.cpu_variation = random.uniform(-10, 10)     # ±10% instead of ±8%
```

---

## Stopping the Agent

### Method 1: Keyboard Interrupt
```bash
# Press Ctrl+C in the agent terminal
^C
[STOP] Shutdown signal received
[SHUTDOWN] Stopping all servers...
...
All servers stopped successfully
```

### Method 2: Process Kill
```bash
# From another terminal
taskkill /PID <pid> /F
# or
kill -9 <pid>
```

### Graceful Shutdown Messages
```
[SHUTDOWN] Stopping all servers...
================================================================================
Final Statistics:
================================================================================
  server-1     → Sent:   120  Failed:    0  Success: 100.0%
  server-2     → Sent:   120  Failed:    0  Success: 100.0%
  server-3     → Sent:   120  Failed:    0  Success: 100.0%
================================================================================
All servers stopped successfully
```

---

## Troubleshooting

### Agent doesn't start metrics

**Problem:** Agent runs but no metrics appear in dashboard

**Solution:**
1. Check backend is running: `curl http://localhost:3000/api/servers`
2. Check agent logs for connection errors
3. Verify API URL is correct: `http://localhost:3000`

### All metrics show same values

**Problem:** All 3 servers have identical metrics

**Solution:**
- This is expected if they just started (initialization)
- Wait 10+ seconds, should see divergence
- Each has different baseline, so values will differ

### Metrics stop after few seconds

**Problem:** Agent stops sending metrics

**Solution:**
1. Check backend is still running
2. Check for errors in agent terminal
3. Restart agent: `python multi_server_agent.py`

### Different values for same server each time

**Problem:** Metrics fluctuate for a single server

**Expected Behavior** ✅
- This is normal! Each server varies ±5-8% around baseline
- Creates realistic fluctuations
- Example: server-1 CPU goes 45→48→42→47→50 (around 45% baseline)

---

## Performance

- **Memory**: ~50-100 MB (3 threads + logging)
- **CPU**: <5% (minimal overhead)
- **Network**: ~1 KB per metric per server (~200 bytes/5 seconds)
- **Throughput**: 3 metrics/5 seconds × 20 metrics = 60 metrics/5 seconds

---

## Logs

Logs appear in terminal with format:
```
TIMESTAMP - [Logger] - LEVEL - MESSAGE
2026-04-10 15:30:46 - [Server.server-1] - INFO - ✓ Sent - CPU: 47.1%, RAM: 59.8%, Disk: 35.2%
```

**Log Levels:**
- `INFO`: Normal operation
- `WARNING`: Non-fatal issues (connection errors, etc.)
- `ERROR`: Errors that don't stop the agent

---

## Use Cases

1. **Dashboard Testing**
   - Test with realistic multi-server data
   - No need to configure multiple physical servers

2. **Performance Testing**
   - Load test the backend API
   - Monitor with realistic metric volumes

3. **Alert System Testing**
   - Trigger alerts by manipulating metric baselines
   - Test deduplication with multiple servers

4. **UI/UX Testing**
   - See how dashboard looks with 3+ servers
   - Test responsive design with varying metrics

---

## Next Steps

1. ✅ Start the multi-server agent: `python multi_server_agent.py`
2. ✅ Watch 3 servers in dashboard: http://localhost:3000
3. ✅ See independent metrics update every 5 seconds
4. ✅ Test alerts by triggering high CPU scenarios
5. ✅ Monitor deduplication with same-type alerts

Enjoy your multi-server monitoring! 🚀
