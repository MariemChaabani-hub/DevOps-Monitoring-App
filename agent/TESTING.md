# 🧪 Testing & Verification Guide

Quick guide to test your monitoring agent setup.

## Pre-Test Checklist

```bash
# 1. Verify Python version (3.8+)
python3 --version

# 2. Check dependencies are installed
cd agent
pip list | grep -E "psutil|requests|python-dotenv"

# 3. Verify .env file exists
ls -la .env

# 4. Verify backend API is running
curl http://localhost:3000/
```

## Test 1: Import Check (5 seconds)

Verify all modules can be imported:

```bash
cd agent
python3 -c "
import config
import logger
import metrics
import api_client
print('✅ All imports successful')
"
```

## Test 2: Metrics Collection (10 seconds)

Test that metrics can be collected:

```bash
python3 -c "
from metrics import MetricsCollector
m = MetricsCollector()
data = m.collect_all()
print(f'✅ Collected {len(data)} metrics')
print('Sample metrics:')
for key, value in list(data.items())[:5]:
    print(f'  {key}: {value}')
"
```

## Test 3: API Connection (10 seconds)

Test API connectivity:

```bash
python3 -c "
from api_client import APIClient
client = APIClient()
is_healthy = client.health_check()
print(f'✅ API is {\"reachable\" if is_healthy else \"unreachable\"}')
"
```

## Test 4: Send Metrics (15 seconds)

Test sending actual metrics to backend:

```bash
python3 -c "
from metrics import MetricsCollector
from api_client import APIClient
m = MetricsCollector()
api = APIClient()
metrics = m.collect_all()
success = api.send_metrics(metrics)
print(f'✅ Send metrics: {\"SUCCESS\" if success else \"FAILED\"}')"
"
```

## Test 5: Full Agent Run (30 seconds)

Run the agent for a short test:

```bash
# Run for ~30 seconds (6 collections at 5s interval)
timeout 30 python3 agent.py

# Expected output:
# 🚀 Monitoring Agent Started
# ✅ Metrics sent successfully (Status: 200)
# ...
# 🛑 Monitoring Agent Shutting Down
```

## Test 6: Logging Verification (1 minute)

Check that logs are being written:

```bash
# In one terminal, run agent:
python3 agent.py &

# In another terminal, tail logs:
tail -f /var/log/monitoring-agent/agent.log

# Or if that doesn't exist, look for agent.log in current dir:
tail -f agent.log
```

## Test 7: Retry Logic (2 minutes)

Test retry behavior with API down:

```bash
# 1. Stop backend API
# 2. Run agent:
python3 agent.py

# Expected output showing retries:
# ⚠️  Connection error (attempt 1)
# Waiting 1.0s before retry...
# ⚠️  Connection error (attempt 2)
# Waiting 2.0s before retry...
# ⚠️  Connection error (attempt 3)
# 🛑 Failed to send metrics after 3 attempts
```

## Test 8: Graceful Shutdown (30 seconds)

Test signal handling:

```bash
# In terminal 1:
python3 agent.py

# In terminal 2, after a few seconds:
kill -SIGTERM $(pgrep -f "python3 agent.py")

# Should see graceful shutdown:
# 🛑 Monitoring Agent Shutting Down
# Total collections: 5
# Overall success rate: 100.0%
```

## Test 9: Configuration Override (1 minute)

Test environment variable overrides:

```bash
# Change collection interval to 2 seconds
COLLECTION_INTERVAL=2 python3 agent.py

# Should collect every 2 seconds instead of 5
```

## Test 10: Debug Mode (2 minutes)

Enable debug logging:

```bash
LOG_LEVEL=DEBUG python3 agent.py

# Expected to see DEBUG messages:
# [collect_all] Collected metrics: 24 fields
# [send_metrics] Sending metrics (attempt 1/3)
```

## Verification Checklist

After running the tests, verify:

- [ ] All modules import successfully
- [ ] Metrics are collected (40+ fields)
- [ ] API connection established
- [ ] Metrics sent to backend (HTTP 200)
- [ ] Logs written to file
- [ ] Retry logic works on API failure
- [ ] Graceful shutdown completes
- [ ] Configuration overrides work
- [ ] Debug mode shows detailed logs

## Common Issues & Solutions

### "ModuleNotFoundError: No module named 'psutil'"
```bash
pip install -r requirements.txt
```

### "Connection refused" errors
```bash
# Check if backend is running
curl http://localhost:3000/
# If not running, start it:
cd ../backend && npm start
```

### "Permission denied" on log file
```bash
mkdir -p /var/log/monitoring-agent
chmod 755 /var/log/monitoring-agent
```

### Agent exits immediately
```bash
# Check for errors
python3 agent.py  # Run directly to see error messages
python3 -c "import agent"  # Check for import errors
```

### No metrics in backend
- Check backend API is receiving POST requests
- Verify `.env` has correct `API_BASE_URL`
- Check logs for error messages

## Expected Metrics Output

When collecting metrics, you should see approximately:

```python
{
    'timestamp': '2024-04-10T15:30:45.123456',   # ISO timestamp
    'hostname': 'my-server',                     # System hostname
    
    # CPU Metrics
    'cpu_percent': 25.5,
    'cpu_count': 4,
    'cpu_freq_ghz': 2.4,
    
    # Memory Metrics
    'ram_percent': 45.2,
    'ram_used_gb': 7.2,
    'ram_total_gb': 16.0,
    'ram_available_gb': 8.8,
    'swap_percent': 0.0,
    'swap_used_gb': 0.0,
    'swap_total_gb': 2.0,
    
    # Disk Metrics
    'disk_percent': 62.5,
    'disk_used_gb': 250.0,
    'disk_total_gb': 400.0,
    'disk_free_gb': 150.0,
    'disk_read_mb': 1234.56,
    'disk_write_mb': 567.89,
    
    # Network Metrics
    'network_bytes_sent': 1024.5,
    'network_bytes_recv': 2048.3,
    'network_packets_sent': 45000,
    'network_packets_recv': 50000,
    
    # System Metrics
    'uptime_seconds': 604800,
    'uptime_hours': 168,
    'uptime_days': 7,
    'process_count': 245
}
```

## Load Testing (Optional)

Test multiple agents simultaneously:

```bash
# Terminal 1
python3 agent.py

# Terminal 2
python3 agent.py

# Terminal 3
python3 agent.py

# Backend should receive metrics from all 3
```

## Performance Baseline

Expected resource usage:

| Metric | Value |
|--------|-------|
| CPU | 1-2% |
| Memory | 20-50 MB |
| Network per collection | 0.5-2 KB |
| Seconds per collection | ~1s |

If significantly higher, check for issues or tune `COLLECTION_INTERVAL`.

---

**✅ All tests passing? Your agent is production-ready!**
