# 🖥️ Intelligent Server Monitoring Agent

A production-ready monitoring agent for collecting and reporting system metrics to a backend API.

## Features

✅ **Comprehensive Metrics Collection**
- CPU usage, frequency, and core count
- Memory (RAM) and swap usage
- Disk usage and I/O statistics
- Network traffic and errors
- System uptime and boot time
- Process count

✅ **Robust Error Handling**
- Automatic retry with exponential backoff
- Connection timeout handling
- Graceful shutdown on signals (SIGTERM, SIGINT)

✅ **Production-Ready**
- Modular, extensible architecture
- Comprehensive logging with rotation
- Configuration via environment variables
- Systemd service integration (Linux)

✅ **Easy to Extend**
- Clean separation of concerns
- Plugin-style metric collection
- Custom retry strategies
- API client with health check

## Quick Start

### Installation

```bash
# 1. Navigate to agent directory
cd agent

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and configure environment
cp .env.example .env
nano .env  # Edit API_BASE_URL and other settings
```

### Running the Agent

```bash
# Run directly
python3 agent.py

# Run with logging to file
python3 agent.py > agent.log 2>&1 &

# Debug mode (set LOG_LEVEL=DEBUG in .env)
LOG_LEVEL=DEBUG python3 agent.py
```

### Running as Systemd Service (Linux/Debian)

See [systemd_service.md](systemd_service.md) for complete instructions:

```bash
# Quick setup
sudo bash systemd_service.md

# Or follow manual steps in the guide
```

## Configuration

Edit `.env` file to customize behavior:

```env
# API Configuration
API_BASE_URL=http://localhost:3000
COLLECTION_INTERVAL=5

# Retry Configuration
MAX_RETRIES=3
RETRY_BACKOFF_FACTOR=2.0
TIMEOUT=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/monitoring-agent/agent.log

# System Monitoring
DISK_MOUNT_POINT=/
ENABLE_NETWORK_STATS=true
ENABLE_PROCESS_STATS=false
```

## Architecture

### Module Overview

```
agent/
├── agent.py              # Main orchestrator and run loop
├── config.py             # Configuration management
├── logger.py             # Logging setup
├── metrics.py            # Metrics collection (CPU, RAM, Disk, etc.)
├── api_client.py         # API communication with retry logic
├── requirements.txt      # Python dependencies
├── .env.example          # Configuration template
└── systemd_service.md    # Linux service setup guide
```

### Data Flow

```
┌──────────────────┐
│ MonitoringAgent  │
│   (main loop)    │
└────────┬─────────┘
         │
         ├─→ MetricsCollector.collect_all()
         │       ├─→ get_cpu_metrics()
         │       ├─→ get_memory_metrics()
         │       ├─→ get_disk_metrics()
         │       ├─→ get_network_metrics()
         │       └─→ get_system_uptime()
         │
         └─→ APIClient.send_metrics()
                 ├─→ HTTP POST (retry up to N times)
                 └─→ Exponential backoff on failure
```

## Example Metrics Sent to Backend

```json
{
  "timestamp": "2024-04-10T15:30:45.123456",
  "hostname": "server-01",
  "cpu_percent": 25.5,
  "cpu_count": 4,
  "cpu_freq_ghz": 2.4,
  "ram_percent": 45.2,
  "ram_used_gb": 7.2,
  "ram_total_gb": 16.0,
  "ram_available_gb": 8.8,
  "swap_percent": 0.0,
  "swap_used_gb": 0.0,
  "swap_total_gb": 2.0,
  "disk_percent": 62.5,
  "disk_used_gb": 250.0,
  "disk_total_gb": 400.0,
  "disk_free_gb": 150.0,
  "disk_read_mb": 1234.56,
  "disk_write_mb": 567.89,
  "network_bytes_sent": 1024.5,
  "network_bytes_recv": 2048.3,
  "network_packets_sent": 45000,
  "network_packets_recv": 50000,
  "network_errors_in": 0,
  "network_errors_out": 0,
  "uptime_seconds": 604800,
  "uptime_hours": 168,
  "uptime_days": 7,
  "boot_time": "2024-04-03T15:30:00",
  "process_count": 245
}
```

## Retry Logic

The agent implements **exponential backoff** for failed API requests:

- **Attempt 1**: Immediate (wait 1s = 2^0)
- **Attempt 2**: Wait 2s (2^1)
- **Attempt 3**: Wait 4s (2^2)
- **Attempt 4**: Wait 8s (2^3)

Configurable via `.env`:
```env
MAX_RETRIES=3
RETRY_BACKOFF_FACTOR=2.0
TIMEOUT=10
```

## Logging

### Log Output
Logs are written to both **console** and **file**:
- **Console**: INFO level only
- **File**: DEBUG level (with rotation)

### Viewing Logs

```bash
# Systemd service logs
sudo journalctl -u monitoring-agent -f

# Direct log file
tail -f /var/log/monitoring-agent/agent.log

# Debug output
LOG_LEVEL=DEBUG python3 agent.py
```

### Log Examples

```
2024-04-10 15:30:45 - agent - INFO - 🚀 Monitoring Agent Started
2024-04-10 15:30:46 - api_client - INFO - ✅ Metrics sent successfully (Status: 200)
2024-04-10 15:31:00 - metrics - DEBUG - Collected metrics: 24 fields
2024-04-10 15:31:00 - agent - INFO - 📊 Stats - Collected: 12, Sent: 12, Success Rate: 100.0%
```

## Extending the Agent

### Adding Custom Metrics

Edit `metrics.py`:

```python
@staticmethod
def get_my_custom_metric() -> Dict[str, Any]:
    """Collect custom metric."""
    try:
        # Your metric collection code
        return {'my_metric': value}
    except Exception as e:
        logger.error(f"Error collecting custom metric: {e}")
        return {}

# In collect_all(), add:
metrics.update(MetricsCollector.get_my_custom_metric())
```

### Custom API Retry Strategy

In your code:

```python
from api_client import APIClient, RetryConfig

custom_retry = RetryConfig(
    max_retries=5,
    backoff_factor=3.0,
    timeout=15
)
api_client = APIClient(retry_config=custom_retry)
```

### Adding Hooks

Extend `MonitoringAgent` class:

```python
class CustomAgent(MonitoringAgent):
    def _collect_and_send_metrics(self):
        super()._collect_and_send_metrics()
        # Your custom logic here
```

## Performance

| Metric | Value |
|--------|-------|
| CPU Usage | 1-2% (depends on interval) |
| Memory (with venv) | ~20-50 MB |
| Network per collection | ~0.5-2 KB |
| Disk I/O (rotated logs) | ~500 B per collection |

## Troubleshooting

### Agent not starting

```bash
# Test with debug logging
LOG_LEVEL=DEBUG python3 agent.py

# Check for import errors
python3 -c "import psutil, requests, dotenv; print('OK')"

# Check .env file
cat .env
```

### Metrics not being sent

```bash
# Check API connectivity
curl -v http://localhost:3000/metrics

# View logs
tail -f /var/log/monitoring-agent/agent.log

# Test API manually
python3 -c "import requests; print(requests.get('http://localhost:3000').status_code)"
```

### High CPU usage

- Increase `COLLECTION_INTERVAL` in `.env`
- Disable unnecessary metrics (e.g., `ENABLE_NETWORK_STATS=false`)
- Check `LOG_LEVEL=INFO` (not DEBUG)

## Security Notes

1. **Protect `.env` file** - Contains API URL and credentials
   ```bash
   chmod 600 .env
   ```

2. **Use environment variables** - For sensitive configuration
   ```bash
   export API_BASE_URL="http://private-api:3000"
   python3 agent.py
   ```

3. **Run as non-root** (if possible)
   ```ini
   [Service]
   User=monitoring
   ```

4. **Enable TLS** - If API supports HTTPS
   ```env
   API_BASE_URL=https://secure-api.example.com
   ```

## Support & Contributing

For issues, improvements, or questions:
1. Check logs: `journalctl -u monitoring-agent`
2. Test manually: `python3 agent.py`
3. Verify API is reachable: `curl http://localhost:3000`

## License

Part of PFE (Projet de Fin d'Études) - Final Year Project
