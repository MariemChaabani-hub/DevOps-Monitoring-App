# 🚀 Production-Ready Agent - Complete Guide

Your monitoring agent is now **production-grade** with all enterprise features.

---

## ✨ **Features Implemented**

### **1. Configuration Management (config.json)**
```json
{
  "api": {
    "url": "http://localhost:3000",
    "timeout": 10,
    "max_retries": 3,
    "backoff_factor": 2.0
  },
  "collection": {
    "interval": 5,
    "enabled_metrics": ["cpu", "ram", "disk", "network", "uptime"]
  },
  "logging": {
    "level": "INFO",
    "console": true,
    "file": true,
    "file_path": "agent.log",
    "max_file_size_mb": 10,
    "backup_count": 5
  },
  "behavior": {
    "check_api_health_on_start": true,
    "continue_if_api_down": true,
    "log_statistics_interval": 60
  }
}
```

**Features:**
- ✅ API configuration (URL, timeout, retries)
- ✅ Collection settings (interval, metrics)
- ✅ Logging configuration (level, file rotation)
- ✅ Behavior settings (health checks, error handling)

### **2. File + Console Logging**

**Console Output (Real-time):**
```
2024-04-10 15:30:45 - INFO - ✅ Sent successfully (Status: 200)
2024-04-10 15:30:50 - INFO - 📈 STATS - Collected: 10 | Sent: 10 | Success Rate: 100.0%
```

**File Output (agent.log with rotation):**
- Automatic rotation: 10MB per file, keep 5 backups
- All events logged with timestamps
- Easily view with: `tail -f agent.log`

**Setup in code:**
```python
def setup_logging(config):
    # Console handler (INFO level)
    # File handler with RotatingFileHandler (DEBUG level)
    # Automatic rotation based on file size
```

### **3. Retry Mechanism with Exponential Backoff**

**In sender.py:**
```
Attempt 1 → Fail → Wait 2^0 = 1 second
Attempt 2 → Fail → Wait 2^1 = 2 seconds
Attempt 3 → Fail → Wait 2^2 = 4 seconds
Attempt 4 → Success ✅ or Give up
```

**Handles:**
- ✅ Timeout errors (slow API)
- ✅ Connection errors (network down)
- ✅ HTTP 5xx errors (server issues)
- ✅ Request exceptions (generic failures)

**Configuration:**
```json
"api": {
  "max_retries": 3,
  "backoff_factor": 2.0
}
```

### **4. Comprehensive Exception Handling**

**Errors caught:**
```python
try:
    # Collection errors - caught, logged, skipped to next cycle
    metrics = collect_metrics()
except Exception as e:
    logger.error(f"Failed to collect: {e}", exc_info=True)
    return None

try:
    # Sending errors - caught, logged, retried
    success = sender.send(metrics)
except Exception as e:
    logger.error(f"Failed to send: {e}", exc_info=True)
    return False

try:
    # Startup errors - logged, exit with code 1
    agent = MonitoringAgent(config)
except Exception as e:
    logger.error(f"Fatal error: {e}", exc_info=True)
    sys.exit(1)
```

**Features:**
- ✅ Full stack traces logged with `exc_info=True`
- ✅ Graceful degradation (skip failed cycles)
- ✅ Proper exit codes (0 = success, 1 = error)
- ✅ Signal handling (SIGINT, SIGTERM)

---

## 🏃 **Running the Agent**

### **Basic Start:**
```powershell
cd C:\pfe-project\agent
python main.py
```

### **With Custom Config:**
Edit `config.json`:
```json
{
  "api": {
    "url": "http://192.168.1.100:3000",
    "timeout": 15,
    "max_retries": 5
  },
  "collection": {
    "interval": 10
  },
  "logging": {
    "level": "DEBUG"
  }
}
```

Then run:
```powershell
python main.py
```

### **Debug Mode:**
```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```

Run:
```powershell
python main.py
# Shows all debug messages, full stack traces
```

---

## 📊 **Expected Output**

### **Startup:**
```
======================================================================
🚀 MONITORING AGENT STARTED
API URL: http://localhost:3000
Collection Interval: 5s
Config: {'url': 'http://localhost:3000', 'timeout': 10, ...}
======================================================================
🔍 Checking API health...
✅ API is reachable
🔄 Starting collection loop (5s interval)
Press Ctrl+C to stop
```

### **Collection:**
```
✅ Sent successfully (Status: 200)
✅ Sent successfully (Status: 200)
✅ Sent successfully (Status: 200)
```

### **Periodic Stats (every 60s):**
```
📈 STATS - Collected: 12 | Sent: 12 | Failed: 0 | Success Rate: 100.0%
```

### **Shutdown:**
```
⏹️  Shutdown signal received

======================================================================
🛑 MONITORING AGENT SHUTTING DOWN
Total Collections: 23
Successful Sends: 23
Failed Sends: 0
Overall Success Rate: 100.0%
======================================================================
Agent stopped successfully
```

---

## 🔧 **Configuration Options**

### **API Settings**
```json
"api": {
  "url": "http://localhost:3000",      // Backend API URL
  "timeout": 10,                        // Request timeout (seconds)
  "max_retries": 3,                     // Retry attempts
  "backoff_factor": 2.0                 // Exponential backoff multiplier
}
```

### **Collection Settings**
```json
"collection": {
  "interval": 5,                        // Collection interval (seconds)
  "enabled_metrics": [                  // Which metrics to collect
    "cpu", "ram", "disk", 
    "network", "uptime"
  ]
}
```

### **Logging Settings**
```json
"logging": {
  "level": "INFO",                      // Log level (DEBUG/INFO/WARNING/ERROR)
  "console": true,                      // Enable console output
  "file": true,                         // Enable file logging
  "file_path": "agent.log",             // Log file location
  "max_file_size_mb": 10,               // Rotate file at 10MB
  "backup_count": 5                     // Keep 5 backup files
}
```

### **Behavior Settings**
```json
"behavior": {
  "check_api_health_on_start": true,    // Health check before start
  "continue_if_api_down": true,         // Don't exit if API is down
  "log_statistics_interval": 60         // Stats every 60 seconds
}
```

---

## 🛠️ **Common Scenarios**

### **Scenario 1: API is Down**
```
🔍 Checking API health...
⚠️  API is unreachable
🔄 Starting collection loop (5s interval)...

⚠️ Connection error (attempt 1/3)
🔄 Retrying in 1.0s...
⚠️ Connection error (attempt 2/3)
🔄 Retrying in 2.0s...
⚠️ Connection error (attempt 3/3)
❌ Failed after 3 attempts

[Next cycle starts, retries again...]
```

Agent keeps running, retries every cycle until API comes back.

### **Scenario 2: API Recovers**
```
❌ Failed after 3 attempts
[waiting for next cycle...]
✅ Sent successfully (Status: 200)
```

Agent automatically resumes when API is back.

### **Scenario 3: Slow API (Timeout)**
```
⏱️  Request timeout (1/3)
🔄 Retrying in 1.0s...
✅ Sent successfully (Status: 200)
```

Retries with exponential backoff.

### **Scenario 4: Metrics Collection Error**
```
❌ Failed to collect metrics: [error]
[skips this cycle, continues to next]
✅ Sent successfully (Status: 200)
```

One failed collection doesn't stop the agent.

---

## 📈 **Monitoring the Agent**

### **View Logs in Real-time:**
```powershell
# PowerShell
Get-Content agent.log -Wait

# Or watch for updates
tail -f agent.log
```

### **Check Success Rate:**
Look for stats lines:
```
📈 STATS - Collected: 12 | Sent: 12 | Failed: 0 | Success Rate: 100.0%
```

### **Monitor Processes:**
```powershell
Get-Process python  # Find agent process
```

### **Stop the Agent:**
```powershell
Ctrl+C              # Graceful shutdown
# or
taskkill /IM python.exe /F
```

---

## 🔒 **Production Best Practices**

### **1. Use Real API URL:**
```json
"api": {
  "url": "http://production-api.example.com:3000"
}
```

### **2. Increase Timeouts for Production:**
```json
"api": {
  "timeout": 15,
  "max_retries": 5
}
```

### **3. Use INFO Level Logging (not DEBUG):**
```json
"logging": {
  "level": "INFO"
}
```

### **4. Enable Log Rotation:**
```json
"logging": {
  "max_file_size_mb": 50,
  "backup_count": 10
}
```

### **5. Monitor Log Files:**
```bash
# Check log size
wc -l agent.log

# Rotate manually if needed
mv agent.log agent.log.$(date +%s)
```

### **6. Run as Service (Linux/Systemd):**
See `systemd_service.md` for systemd service setup

### **7. Docker Deployment:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

---

## 🧪 **Testing**

### **Test 1: Verify Configuration Loading**
```powershell
python -c "
import json
with open('config.json') as f:
    config = json.load(f)
print('✅ Config loaded successfully')
print(f'API URL: {config[\"api\"][\"url\"]}')
"
```

### **Test 2: Verify Logging Setup**
```powershell
python -c "
import main
print('✅ Logging configured')
print(f'Log file: {main.CONFIG[\"logging\"][\"file_path\"]}')
"
```

### **Test 3: Test Collection**
```powershell
python -c "
from collector import collect_metrics
metrics = collect_metrics()
print(f'✅ Collected {len(metrics)} metrics')
"
```

### **Test 4: Test Retry Logic**
Stop backend API and run:
```powershell
python main.py
# Should see retries with exponential backoff
```

### **Test 5: Test Graceful Shutdown**
```powershell
python main.py
# Run for 10 seconds
# Press Ctrl+C
# Should see final statistics
```

---

## 📋 **Checklist - Production Ready**

- ✅ Configuration file (config.json)
- ✅ File logging with rotation
- ✅ Console logging for real-time view
- ✅ Retry mechanism with exponential backoff
- ✅ Comprehensive exception handling
- ✅ Graceful shutdown with statistics
- ✅ Signal handlers (SIGINT, SIGTERM)
- ✅ Health check before start
- ✅ Periodic statistics logging
- ✅ Error logging with stack traces
- ✅ Timeout protection
- ✅ Configurable behavior

**Your agent is production-ready!** 🎉

---

## 📂 **Files Structure**

```
agent/
├── main.py              ← Entry point (orchestrator)
├── collector.py         ← Metrics collection
├── sender.py            ← API sending with retry
├── config.json          ← Configuration file
├── agent.log            ← Log file (created on first run)
└── requirements.txt     ← Dependencies
```

**Run with:** `python main.py`
