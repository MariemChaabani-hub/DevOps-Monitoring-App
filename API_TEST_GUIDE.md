# Multi-Server Metrics API - Quick Test Guide

**Backend Running**: ✅ `http://localhost:3000`

---

## Test All New Endpoints

### 1. Get Latest Metrics from All Servers

```bash
curl http://localhost:3000/api/metrics/latest
```

**Response** (3 servers example):
```json
{
  "count": 3,
  "data": [
    {
      "serverId": "server-1",
      "server_name": "server-1",
      "cpu_percent": 47.3,
      "ram_percent": 59.8,
      "disk_percent": 35.2,
      "status": "OK",
      "timestamp": "2026-04-10T14:30:45.123Z"
    },
    {
      "serverId": "server-2",
      "server_name": "server-2",
      "cpu_percent": 52.1,
      "ram_percent": 63.4,
      "disk_percent": 41.5,
      "status": "OK",
      "timestamp": "2026-04-10T14:30:46.234Z"
    },
    {
      "serverId": "server-3",
      "server_name": "server-3",
      "cpu_percent": 39.8,
      "ram_percent": 51.2,
      "disk_percent": 28.9,
      "status": "OK",
      "timestamp": "2026-04-10T14:30:47.345Z"
    }
  ],
  "timestamp": "2026-04-10T14:30:50.000Z"
}
```

**Use For**: Dashboard overview, server status cards, current metrics

---

### 2. Get History for Specific Server (Charts)

```bash
# Last 100 metrics (default 60 minutes window)
curl http://localhost:3000/api/metrics/history/server-1

# Customize: Last 30 metrics in last 2 hours
curl "http://localhost:3000/api/metrics/history/server-1?limit=30&minutes=120"

# 24-hour history
curl "http://localhost:3000/api/metrics/history/server-1?minutes=1440"
```

**Response**:
```json
{
  "serverId": "server-1",
  "count": 12,
  "timeRange": {
    "from": "2026-04-10T13:30:50.000Z",
    "to": "2026-04-10T14:30:50.000Z",
    "minutes": 60
  },
  "data": [
    {
      "_id": "...",
      "server_id": "server-1",
      "serverId": "server-1",
      "timestamp": "2026-04-10T13:30:45.123Z",
      "cpu_percent": 45.2,
      "ram_percent": 58.3,
      "disk_percent": 34.7,
      "status": "OK"
    },
    ...more metrics...
  ]
}
```

**Use For**: Charts, trend analysis, performance graphs

---

### 3. Get Single Server Latest Metric

```bash
curl http://localhost:3000/api/metrics/server/server-1/latest
```

**Response**:
```json
{
  "serverId": "server-1",
  "_id": "507f1f77bcf86cd799439050",
  "server_id": "server-1",
  "server_name": "server-1",
  "timestamp": "2026-04-10T14:30:45.123Z",
  "cpu_percent": 47.3,
  "ram_percent": 59.8,
  "disk_percent": 35.2,
  "status": "OK",
  "uptime": 86400,
  "network_io": {
    "bytes_sent": 1024000,
    "bytes_recv": 2048000
  }
}
```

**Use For**: Single server detail page

---

### 4. Get Aggregated Stats Across All Servers

```bash
# Last 60 minutes (default)
curl http://localhost:3000/api/metrics/stats

# Last 24 hours
curl "http://localhost:3000/api/metrics/stats?minutes=1440"

# Last 7 days
curl "http://localhost:3000/api/metrics/stats?minutes=10080"
```

**Response**:
```json
{
  "timeRange": {
    "minutes": 60,
    "from": "2026-04-10T13:30:50.000Z",
    "to": "2026-04-10T14:30:50.000Z"
  },
  "server_count": 3,
  "data": [
    {
      "serverId": "server-1",
      "avg_cpu": 46.5,
      "max_cpu": 52.3,
      "min_cpu": 41.2,
      "avg_ram": 58.9,
      "max_ram": 65.4,
      "min_ram": 52.1,
      "avg_disk": 34.8,
      "max_disk": 36.2,
      "min_disk": 33.1,
      "metric_count": 12,
      "latest_status": "OK"
    },
    {
      "serverId": "server-2",
      "avg_cpu": 51.2,
      "max_cpu": 56.8,
      "min_cpu": 45.9,
      ...
    },
    {
      "serverId": "server-3",
      "avg_cpu": 39.8,
      "max_cpu": 44.3,
      ...
    }
  ],
  "timestamp": "2026-04-10T14:30:50.000Z"
}
```

**Use For**: System-wide reports, capacity planning, performance analysis

---

## Integration with Multi-Server Agent

When you run the Python agent, it sends metrics in this format:

```json
{
  "server_id": "server-1",
  "serverId": "server-1",
  "cpu_percent": 47.3,
  "ram_percent": 59.8,
  "disk_percent": 35.2,
  "timestamp": "2026-04-10T14:30:45.123Z",
  "uptime": 86400,
  "network_in": 1024000,
  "network_out": 2048000
}
```

**Backend automatically**:
1. Stores with both `server_id` and `serverId`
2. Groups data by server
3. Returns through new `/api/metrics` endpoints

---

## Common Commands

### Test Backend is Running
```bash
curl http://localhost:3000
```

### Poll Latest Every 5 Seconds (Demo)
```bash
for i in {1..10}; do echo "=== Poll $i ===" ; curl -s http://localhost:3000/api/metrics/latest | jq '.data[].serverId'; sleep 5; done
```

### Stream Metrics Growth
```bash
# Watch metric count grow as agent sends data
for i in {1..30}; do count=$(curl -s http://localhost:3000/api/metrics/stats?minutes=1440 | jq '.data[0].metric_count'); echo "Server-1 metrics: $count"; sleep 10; done
```

### Export 24-Hour History to JSON
```bash
curl "http://localhost:3000/api/metrics/history/server-1?minutes=1440" > server-1-history.json
```

---

## Frontend Integration Examples

### React Hook: Fetch Latest Metrics
```javascript
const [servers, setServers] = useState([]);

useEffect(() => {
  const fetchLatest = async () => {
    const res = await axios.get('/api/metrics/latest');
    setServers(res.data.data);
  };

  const interval = setInterval(fetchLatest, 5000); // Poll every 5s
  fetchLatest(); // Initial fetch

  return () => clearInterval(interval);
}, []);
```

### React: Fetch Server History
```javascript
const [history, setHistory] = useState([]);

useEffect(() => {
  const fetchHistory = async () => {
    const res = await axios.get(`/api/metrics/history/server-1?minutes=120`);
    setHistory(res.data.data);
  };

  fetchHistory();
}, []);

// Use history for Recharts:
// <Rechart data={history} ... />
```

---

## Troubleshooting

### No data returned?
- Ensure backend is running: `node C:\pfe-project\backend\server.js`
- Ensure MongoDB is running
- Start the Python agent to send metrics: `python C:\pfe-project\agent\multi_server_agent.py`
- Wait 5 seconds for first metric to arrive

### Empty `data` array?
- Check MongoDB is collecting metrics: `db.metrics.count()`
- Verify agent is running and connected
- Check agent logs for connection errors

### Wrong time range?
- Use `minutes` parameter: `?minutes=120` for 2 hours
- Default is 60 minutes
- Adjust `limit` if needed: `?limit=50&minutes=1440`

---

## Endpoint Summary Table

| Endpoint | Method | Returns | Best For |
|----------|--------|---------|----------|
| `/api/metrics/latest` | GET | Latest per server | Dashboard overview |
| `/api/metrics/history/:serverId` | GET | Historical metrics | Charts, trends |
| `/api/metrics/server/:serverId/latest` | GET | Single latest | Server detail |
| `/api/metrics/stats` | GET | Aggregated stats | Reports, capacity |

---

**Backend Status**: ✅ Running  
**MongoDB**: ✅ Connected  
**Metrics API**: ✅ All 4 endpoints ready

Start the Python agent and watch data flow through the dashboard!
