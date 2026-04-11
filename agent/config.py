"""
Configuration management for the monitoring agent.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class."""
    
    # API Configuration
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")
    API_ENDPOINT = "/metrics"
    
    # Agent Configuration
    COLLECTION_INTERVAL = int(os.getenv("COLLECTION_INTERVAL", 5))  # seconds
    
    # Retry Configuration
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
    RETRY_BACKOFF_FACTOR = float(os.getenv("RETRY_BACKOFF_FACTOR", 2.0))
    TIMEOUT = int(os.getenv("TIMEOUT", 10))  # HTTP request timeout
    
    # Logging Configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "/var/log/monitoring-agent/agent.log")
    LOG_MAX_BYTES = int(os.getenv("LOG_MAX_BYTES", 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", 5))
    
    # System Monitoring
    DISK_MOUNT_POINT = os.getenv("DISK_MOUNT_POINT", "/")
    ENABLE_NETWORK_STATS = os.getenv("ENABLE_NETWORK_STATS", "true").lower() == "true"
    ENABLE_PROCESS_STATS = os.getenv("ENABLE_PROCESS_STATS", "false").lower() == "true"
    
    @staticmethod
    def get_full_api_url():
        """Get the full API URL."""
        return f"{Config.API_BASE_URL}{Config.API_ENDPOINT}"
