# Multi-Server Metrics API Documentation

This document describes the new metrics endpoints that support multi-server metric storage and retrieval, grouped by `serverId`.

## Overview

The backend now supports flexible metric endpoints for accessing server metrics in various ways:

### Key Features
- **Latest Metrics**: Get the most recent metric from each server
- **Historical Data**: Retrieve metric history for specific servers (useful for charts)
- **Aggregated Stats**: Get statistics across all servers
- **Multi-Server Support**: All endpoints naturally group data by `serverId`
- **Flexible Filtering**: Support for time ranges and limits

---

## API Endpoints

### 1. GET `/api/metrics/latest`

Returns the latest metric from each server, grouped by `serverId`.

**Purpose**: Perfect for dashboard displays showing current status of all servers

**Query Parameters**: None

**Example Request**:
```bash
curl http://localhost:3000/api/metrics/latest
```

**Example Response**:
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
      "timestamp": "2026-04-10T14:30:45.123Z",
      "network_io": {
        "bytes_sent": 1024000,
        "bytes_recv": 2048000
      },
      "uptime": 86400,
      "location": "Unknown"
    },
    {
      "serverId": "server-2",
      "server_name": "server-2",
      "cpu_percent": 52.1,
      "ram_percent": 63.4,
      "disk_percent": 41.5,
      "status": "OK",
      "timestamp": "2026-04-10T14:30:46.234Z",
      "network_io": {
        "bytes_sent": 1512000,
        "bytes_recv": 3072000
      },
      "uptime": 86400,
      "location": "Unknown"
    },
    {
      "serverId": "server-3",
      "server_name": "server-3",
      "cpu_percent": 39.8,
      "ram_percent": 51.2,
      "disk_percent": 28.9,
      "status": "OK",
      "timestamp": "2026-04-10T14:30:47.345Z",
      "network_io": {
        "bytes_sent": 896000,
        "bytes_recv": 1792000
      },
      "uptime": 86400,
      "location": "Unknown"
    }
  ],
  "timestamp": "2026-04-10T14:30:50.000Z"
}
```

**Use Cases**:
- Dashboard cards showing current server status
- Quick overview of all servers
- Real-time status monitoring

---

### 2. GET `/api/metrics/history/:serverId`

Returns historical metrics for a specific server, useful for charts and trend analysis.

**Purpose**: Retrieve metric history for charting and trend analysis

**Query Parameters**:
- `limit` (optional, default: 100) - Maximum number of metrics to return
- `minutes` (optional, default: 60) - How far back to retrieve data (in minutes)

**Example Requests**:
```bash
# Get last 100 metrics (default last 60 minutes)
curl http://localhost:3000/api/metrics/history/server-1

# Get last 30 metrics for last 2 hours
curl http://localhost:3000/api/metrics/history/server-1?limit=30&minutes=120

# Get last 50 metrics for last 24 hours
curl http://localhost:3000/api/metrics/history/server-1?limit=50&minutes=1440
```

**Example Response**:
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
      "_id": "507f1f77bcf86cd799439011",
      "server_id": "server-1",
      "serverId": "server-1",
      "server_name": "server-1",
      "timestamp": "2026-04-10T13:30:45.123Z",
      "cpu_percent": 45.2,
      "ram_percent": 58.3,
      "disk_percent": 34.7,
      "status": "OK",
      "network_io": {
        "bytes_sent": 1024000,
        "bytes_recv": 2048000
      },
      "uptime": 82000
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "server_id": "server-1",
      "serverId": "server-1",
      "server_name": "server-1",
      "timestamp": "2026-04-10T13:35:45.223Z",
      "cpu_percent": 46.1,
      "ram_percent": 59.1,
      "disk_percent": 34.9,
      "status": "OK",
      "network_io": {
        "bytes_sent": 1024500,
        "bytes_recv": 2048500
      },
      "uptime": 82300
    }
  ],
  "timestamp": "2026-04-10T14:30:50.000Z"
}
```

**Use Cases**:
- Charting CPU/RAM/Disk trends
- Performance analysis
- Historical comparison
- Alert investigation

---

### 3. GET `/api/metrics/server/:serverId/latest`

Alternative endpoint for getting the latest metric of a specific server.

**Purpose**: Get single server's current status

**Query Parameters**: None

**Example Request**:
```bash
curl http://localhost:3000/api/metrics/server/server-1/latest
```

**Example Response**:
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
  "network_io": {
    "bytes_sent": 1024000,
    "bytes_recv": 2048000
  },
  "uptime": 86400,
  "location": "Unknown",
  "createdAt": "2026-04-10T14:30:45.123Z",
  "updatedAt": "2026-04-10T14:30:45.123Z"
}
```

**Use Cases**:
- Single server detail view
- Getting specific server status
- Server-focused monitoring

---

### 4. GET `/api/metrics/stats`

Returns aggregated statistics across all servers.

**Purpose**: High-level overview of system health across all servers

**Query Parameters**:
- `minutes` (optional, default: 60) - Time window for stats (in minutes)

**Example Requests**:
```bash
# Get stats for last 60 minutes
curl http://localhost:3000/api/metrics/stats

# Get stats for last 24 hours
curl http://localhost:3000/api/metrics/stats?minutes=1440
```

**Example Response**:
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
      "_id": "server-1",
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
      "_id": "server-2",
      "serverId": "server-2",
      "avg_cpu": 51.2,
      "max_cpu": 56.8,
      "min_cpu": 45.9,
      "avg_ram": 62.3,
      "max_ram": 68.2,
      "min_ram": 56.7,
      "avg_disk": 40.1,
      "max_disk": 42.5,
      "min_disk": 37.8,
      "metric_count": 12,
      "latest_status": "OK"
    },
    {
      "_id": "server-3",
      "serverId": "server-3",
      "avg_cpu": 39.8,
      "max_cpu": 44.3,
      "min_cpu": 35.6,
      "avg_ram": 51.2,
      "max_ram": 58.9,
      "min_ram": 43.4,
      "avg_disk": 28.9,
      "max_disk": 31.2,
      "min_disk": 26.5,
      "metric_count": 12,
      "latest_status": "OK"
    }
  ],
  "timestamp": "2026-04-10T14:30:50.000Z"
}
```

**Use Cases**:
- System-wide health dashboard
- Capacity planning
- Performance reports
- Alert threshold tuning

---

## Data Structure

### Metric Object

All metric endpoints return metric objects with the following structure:

```json
{
  "server_id": "server-1",           // Unique server identifier (snake_case)
  "serverId": "server-1",            // Unique server identifier (camelCase)
  "server_name": "server-1",         // Human-readable server name
  "timestamp": "2026-04-10T14:30:45.123Z",
  "cpu_percent": 47.3,               // CPU usage 0-100
  "ram_percent": 59.8,               // RAM usage 0-100
  "disk_percent": 35.2,              // Disk usage 0-100
  "memory_percent": 59.8,            // Alias for ram_percent
  "status": "OK",                    // OK | WARNING | CRITICAL
  "uptime": 86400,                   // System uptime in seconds
  "network_io": {
    "bytes_sent": 1024000,           // Network bytes sent
    "bytes_recv": 2048000            // Network bytes received
  },
  "location": "Unknown"              // Server location
}
```

---

## MongoDB Data Model

### Collection: `metrics`

**Indexes**:
- `server_id` (ascending) + `timestamp` (descending) - for efficient history queries
- `serverId` (ascending) + `timestamp` (descending) - for camelCase queries
- `timestamp` (descending) - for latest metrics
- `status` (ascending) - for alert queries

**Pre-save Hook**: Automatically ensures `serverId` matches `server_id` if not provided

---

## Integration with Dashboard

### React Component Usage

**Fetch latest metrics for all servers**:
```javascript
const response = await axios.get('/api/metrics/latest');
const servers = response.data.data;
```

**Fetch history for chart**:
```javascript
const response = await axios.get(`/api/metrics/history/${serverId}?minutes=120`);
const historyData = response.data.data;
```

**Fetch statistics**:
```javascript
const response = await axios.get('/api/metrics/stats?minutes=1440');
const stats = response.data.data;
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK` - Successful request
- `404 Not Found` - Server/metric not found
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Database error

### Error Response Format

```json
{
  "error": "No metrics found for this server",
  "serverId": "server-1",
  "timeRange": {
    "minutes": 60,
    "from": "2026-04-10T13:30:50.000Z",
    "to": "2026-04-10T14:30:50.000Z"
  }
}
```

---

## Performance Considerations

1. **Indexing**: Queries use indexed fields (`server_id`, `serverId`, `timestamp`) for fast retrieval
2. **Aggregation Pipeline**: `/metrics/latest` uses MongoDB aggregation for efficient grouping
3. **Limits**: Default limit of 100 metrics prevents memory overload
4. **Time Ranges**: Specify appropriate `minutes` parameter to limit data volume

### Recommended Limits

| Use Case | Limit | Minutes |
|----------|-------|---------|
| Dashboard (real-time) | 100 | 60 |
| 1-hour chart | 12 | 60 |
| 4-hour chart | 48 | 240 |
| 24-hour chart | 288 | 1440 |
| Historical analysis | 1000 | 10080 |

---

## Migration from Old Endpoints

### Old: `/api/servers/:serverId/metrics`
### New: `/api/metrics/history/:serverId`

Both endpoints work, but the new endpoint is optimized for multi-server scenarios and returns data in a more structured format.

---

## Testing

### Test with cURL

```bash
# Get all server's latest metrics
curl http://localhost:3000/api/metrics/latest

# Get specific server history
curl http://localhost:3000/api/metrics/history/server-1

# Get stats for last 24 hours
curl http://localhost:3000/api/metrics/stats?minutes=1440

# Get stats for last 7 days
curl http://localhost:3000/api/metrics/stats?minutes=10080
```

### Test with Agent

The multi-server agent automatically sends metrics to `POST /metrics`:

```python
# Each virtual server sends JSON with both server_id and serverId
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

---

## Summary

| Endpoint | Purpose | Best For |
|----------|---------|----------|
| `GET /api/metrics/latest` | Latest from each server | Dashboard overview |
| `GET /api/metrics/history/:serverId` | Historical metrics | Charts, trends |
| `GET /api/metrics/server/:serverId/latest` | Single server status | Detail views |
| `GET /api/metrics/stats` | Aggregated statistics | System health reports |

All endpoints support multi-server monitoring with automatic grouping by `serverId`.
