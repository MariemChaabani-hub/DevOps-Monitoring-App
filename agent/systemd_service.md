# Running the Monitoring Agent as a Systemd Service on Linux (Debian)

This guide explains how to set up the monitoring agent to run continuously as a system service.

## Prerequisites

1. Python 3.8+ installed
2. Agent directory in `/opt/monitoring-agent/` or similar
3. `sudo` access for systemd commands

## Installation Steps

### 1. Create Agent Directory and Install Dependencies

```bash
# Create directory
sudo mkdir -p /opt/monitoring-agent
cd /opt/monitoring-agent

# Copy agent files
sudo cp -r /path/to/pfe-project/agent/* /opt/monitoring-agent/

# Create Python virtual environment
cd /opt/monitoring-agent
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Create `.env` Configuration File

```bash
sudo cp .env.example .env
sudo nano .env
```

Edit and customize settings as needed:
```
API_BASE_URL=http://your-server-ip:3000
COLLECTION_INTERVAL=5
LOG_FILE=/var/log/monitoring-agent/agent.log
```

### 3. Create Log Directory

```bash
sudo mkdir -p /var/log/monitoring-agent
sudo chown -R $(whoami) /var/log/monitoring-agent
sudo chmod 755 /var/log/monitoring-agent
```

### 4. Create Systemd Service File

Create `/etc/systemd/system/monitoring-agent.service`:

```bash
sudo nano /etc/systemd/system/monitoring-agent.service
```

Paste the following:

```ini
[Unit]
Description=Intelligent Server Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/monitoring-agent
ExecStart=/opt/monitoring-agent/venv/bin/python3 /opt/monitoring-agent/agent.py
Restart=always
RestartSec=10
StandardOutput=inherit
StandardError=inherit
Environment="PATH=/opt/monitoring-agent/venv/bin"

[Install]
WantedBy=multi-user.target
```

### 5. Enable and Start the Service

```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable monitoring-agent

# Start the service
sudo systemctl start monitoring-agent

# Check status
sudo systemctl status monitoring-agent

# View logs
sudo journalctl -u monitoring-agent -f
```

## Managing the Service

### View Logs

```bash
# Last 50 lines
sudo journalctl -u monitoring-agent -n 50

# Follow logs in real-time
sudo journalctl -u monitoring-agent -f

# View agent log file directly
tail -f /var/log/monitoring-agent/agent.log
```

### Stop/Restart Service

```bash
# Stop
sudo systemctl stop monitoring-agent

# Restart
sudo systemctl restart monitoring-agent

# Check status
sudo systemctl status monitoring-agent
```

### Disable Autostart

```bash
sudo systemctl disable monitoring-agent
```

## Troubleshooting

### Check if service is running

```bash
sudo systemctl status monitoring-agent
```

### Check for errors

```bash
sudo journalctl -u monitoring-agent --no-pager | tail -100
```

### Manual testing before service install

```bash
cd /opt/monitoring-agent
source venv/bin/activate
python3 agent.py
```

### Common Issues

1. **ImportError for psutil or requests**
   ```bash
   cd /opt/monitoring-agent
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Permission denied on log file**
   ```bash
   sudo chown -R root:root /var/log/monitoring-agent
   sudo chmod 755 /var/log/monitoring-agent
   ```

3. **API connection failed**
   - Check `.env` file for correct API_BASE_URL
   - Verify backend API is running: `curl http://localhost:3000`
   - Check firewall rules

## Monitoring Agent in Production

### Recommended Setup

```
/opt/monitoring-agent/
├── venv/                 # Virtual environment
├── agent.py             # Main agent
├── config.py            # Configuration
├── logger.py            # Logging
├── metrics.py           # Metrics collection
├── api_client.py        # API communication
├── requirements.txt     # Dependencies
├── .env                 # Environment variables (keep secure)
└── .env.example         # Example env file
```

### Security Recommendations

1. **Restrict .env permissions**
   ```bash
   sudo chmod 600 /opt/monitoring-agent/.env
   ```

2. **Use non-root user** (modify service file):
   ```ini
   User=monitoring
   ```

3. **Monitor logs regularly**
   ```bash
   sudo tail -f /var/log/monitoring-agent/agent.log
   ```

4. **Set up log rotation** (`/etc/logrotate.d/monitoring-agent`):
   ```
   /var/log/monitoring-agent/agent.log {
       daily
       rotate 7
       compress
       delaycompress
       notifempty
       create 0644 root root
   }
   ```

## Extending the Agent

The modular architecture makes it easy to add new metrics:

### Adding Custom Metrics

Edit `metrics.py`:

```python
@staticmethod
def get_custom_metrics() -> Dict[str, Any]:
    """Your custom metrics collection."""
    try:
        # Implementation
        return {'custom_metric': value}
    except Exception as e:
        logger.error(f"Error collecting custom metrics: {e}")
        return {}

# In collect_all():
metrics.update(MetricsCollector.get_custom_metrics())
```

### Custom API Retry Strategy

In `agent.py`:

```python
import api_client

custom_retry = api_client.RetryConfig(
    max_retries=5,
    backoff_factor=3.0,
    timeout=15
)
agent.api_client = api_client.APIClient(custom_retry)
```

## Performance Notes

- **CPU**: ~1-2% average (depends on interval)
- **Memory**: ~20-50MB with virtual environment
- **Network**: ~0.5-2KB per collection
- **Disk**: ~500B per collection (rotated logs)

Adjust `COLLECTION_INTERVAL` to balance accuracy with resource usage.
