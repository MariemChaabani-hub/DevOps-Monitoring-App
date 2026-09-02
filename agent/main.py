"""
Main monitoring agent - orchestrates metrics collection and sending.
Collects system metrics every N seconds and sends to backend API.
Production-ready with configuration, logging, retry logic, and error handling.
"""
import time
import signal
import sys
import logging
import logging.handlers
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any

from dotenv import load_dotenv
load_dotenv()

from collector import collect_metrics, AGENT_VERSION
from sender import MetricsSender


def setup_logging(config: Dict[str, Any]) -> logging.Logger:
    """
    Setup logging with console and file handlers.
    
    Args:
        config: Logging configuration dictionary
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(__name__)
    log_level = getattr(logging, config.get('level', 'INFO'))
    logger.setLevel(log_level)
    
    # Clear any existing handlers
    logger.handlers.clear()
    
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    if config.get('console', True):
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    # File handler with rotation
    if config.get('file', True):
        file_path = config.get('file_path', 'agent.log')
        max_bytes = config.get('max_file_size_mb', 10) * 1024 * 1024
        backup_count = config.get('backup_count', 5)
        
        try:
            file_handler = logging.handlers.RotatingFileHandler(
                file_path,
                maxBytes=max_bytes,
                backupCount=backup_count
            )
            file_handler.setLevel(log_level)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Failed to setup file logging: {e}")
    
    return logger


def load_config(config_path: str = 'config.json') -> Dict[str, Any]:
    """
    Load configuration from JSON file.
    
    Args:
        config_path: Path to config file
        
    Returns:
        Configuration dictionary
    """
    try:
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        return config
    
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON in config file: {e}")
        sys.exit(1)
    
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        print(f"   Using defaults from config.json")
        sys.exit(1)
    
    except Exception as e:
        print(f"[ERROR] Error loading config: {e}")
        sys.exit(1)


# Load configuration at module level
try:
    CONFIG = load_config()
    logger = setup_logging(CONFIG.get('logging', {}))
except Exception as e:
    print(f"[ERROR] Fatal error during initialization: {e}")
    sys.exit(1)


class MonitoringAgent:
    """Main monitoring agent with production-ready features."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the monitoring agent.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Extract configurations
        api_config = config.get('api', {})
        collection_config = config.get('collection', {})
        behavior_config = config.get('behavior', {})
        server_config = config.get('server', {})
        
        # Server identification (environment variables override config.json
        # values). `os.getenv(key, default)` only falls back to `default`
        # when the variable is completely unset — if Kubernetes injects it
        # as an empty string (e.g. from a blank ConfigMap/Secret key), the
        # default is skipped and we'd end up with server_name = "". Using
        # `os.getenv(key) or default` treats an empty string the same as
        # unset, so config.json's server.name is always used as a real
        # fallback.
        self.server_id = os.getenv("MONITORING_SERVER_ID") or server_config.get('id', 'unknown-server')
        self.server_name = os.getenv("MONITORING_SERVER_NAME") or server_config.get('name', self.server_id)
        self.server_location = os.getenv("MONITORING_SERVER_LOCATION") or server_config.get('location', 'Unknown')
        
        self.api_url = api_config.get('url', 'http://localhost:3000')
        self.collection_interval = collection_config.get('interval', 5)
        self.check_health_on_start = behavior_config.get('check_api_health_on_start', True)
        self.continue_if_api_down = behavior_config.get('continue_if_api_down', True)
        self.stats_interval = behavior_config.get('log_statistics_interval', 60)
        
        self.running = True
        self.collection_count = 0
        self.successful_sends = 0
        self.failed_sends = 0

        # Initialize sender with config
        try:
            self.sender = MetricsSender(
                api_url=self.api_url,
                timeout=api_config.get('timeout', 10),
                max_retries=api_config.get('max_retries', 3),
                backoff_factor=api_config.get('backoff_factor', 2.0)
            )
            logger.debug("[OK] Sender initialized successfully")
        except Exception as e:
            logger.error(f"[ERROR] Failed to initialize sender: {e}")
            raise

        self._log_startup()
    
    def _log_startup(self):
        """Log startup information."""
        logger.info("=" * 70)
        logger.info("[START] MONITORING AGENT STARTED")
        logger.info(f"Agent Version:      {AGENT_VERSION}")
        logger.info(f"Server ID:          {self.server_id}")
        logger.info(f"Server Name:        {self.server_name}")
        logger.info(f"Server Location:    {self.server_location}")
        logger.info(f"API URL:            {self.api_url}")
        logger.info(f"Collection Interval: {self.collection_interval}s")
        logger.info("=" * 70)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info("\n[STOP] Shutdown signal received")
        self.running = False
    
    def _register_signals(self):
        """Register signal handlers for graceful shutdown."""
        try:
            signal.signal(signal.SIGINT, self._signal_handler)   # Ctrl+C
            signal.signal(signal.SIGTERM, self._signal_handler)  # Termination
            logger.debug("[OK] Signal handlers registered")
        except Exception as e:
            logger.warning(f"Failed to register signal handlers: {e}")
    
    def _check_api_health(self) -> bool:
        """
        Check if API is reachable.
        
        Returns:
            True if API is healthy, False otherwise
        """
        if not self.check_health_on_start:
            return True
        
        try:
            logger.info("[CHECK] Checking API health...")
            if self.sender.health_check():
                logger.info("[OK] API is reachable")
                return True
            else:
                logger.warning("[WARN] API is unreachable")
                return False
        except Exception as e:
            logger.warning(f"[WARN] Health check failed: {e}")
            return False
    
    def _collect_metrics(self) -> Optional[Dict[str, Any]]:
        """
        Safely collect system metrics.
        
        Returns:
            Metrics dictionary or None if collection fails
        """
        try:
            logger.debug("[INFO] Collecting metrics...")
            metrics = collect_metrics(
                server_id=self.server_id,
                server_name=self.server_name,
                location=self.server_location
            )
            self.collection_count += 1
            # So the backend can size its OFFLINE-detection threshold to
            # this agent's actual cadence instead of a single hardcoded
            # value — a 30s threshold against a 5-minute interval declares
            # every agent permanently offline.
            metrics['collection_interval'] = self.collection_interval
            logger.debug(f"[OK] Collected {len(metrics)} fields")
            if metrics.get('services') is None:
                logger.warning("[WARN] Service detection unavailable this cycle (see collector logs above)")
            return metrics
        
        except Exception as e:
            logger.error(f"[ERROR] Failed to collect metrics: {e}", exc_info=True)
            return None
    
    def _send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """
        Safely send metrics to API.

        Args:
            metrics: Metrics dictionary to send

        Returns:
            True if successful, False otherwise
        """
        try:
            send_start = time.time()
            success, message = self.sender.send(metrics)
            elapsed = time.time() - send_start

            if success:
                self.successful_sends += 1
                logger.info(f"[OK] {message} ({elapsed:.1f}s)")
            else:
                self.failed_sends += 1
                logger.warning(f"[FAIL] {message} ({elapsed:.1f}s)")

            return success

        except Exception as e:
            self.failed_sends += 1
            logger.error(f"[ERROR] Error sending metrics: {e}", exc_info=True)
            return False

    def _log_statistics(self):
        """Log periodic statistics."""
        if self.collection_count == 0:
            return

        success_rate = (self.successful_sends / self.collection_count) * 100
        logger.info(
            f"[STATS] "
            f"Collected: {self.collection_count} | "
            f"Sent: {self.successful_sends} | "
            f"Failed: {self.failed_sends} | "
            f"Success Rate: {success_rate:.1f}%"
        )
    
    def run(self):
        """Main agent run loop."""
        self._register_signals()
        
        # Check API health
        api_healthy = self._check_api_health()
        if not api_healthy and not self.continue_if_api_down:
            logger.error("[ERROR] API is not reachable and continue_if_api_down is False")
            sys.exit(1)
        
        logger.info(f"[START] Starting collection loop ({self.collection_interval}s interval)")
        logger.info("Press Ctrl+C to stop\n")

        last_stats_time = time.time()

        try:
            while self.running:
                cycle_start = time.time()

                try:
                    # 1. Collect metrics
                    metrics = self._collect_metrics()
                    if metrics is None:
                        continue

                    # 2. Send metrics immediately
                    self._send_metrics(metrics)

                    # 3. Log statistics periodically
                    current_time = time.time()
                    if current_time - last_stats_time >= self.stats_interval:
                        self._log_statistics()
                        last_stats_time = current_time
                
                except Exception as e:
                    logger.error(f"[ERROR] Unexpected error in collection cycle: {e}", exc_info=True)
                
                # 4. Sleep for the interval (accounting for execution time)
                cycle_time = time.time() - cycle_start
                sleep_time = max(0, self.collection_interval - cycle_time)
                
                if sleep_time > 0:
                    time.sleep(sleep_time)
        
        except KeyboardInterrupt:
            logger.info("[STOP] Keyboard interrupt received")
        
        except Exception as e:
            logger.error(f"[ERROR] Fatal error in run loop: {e}", exc_info=True)
        
        finally:
            self._shutdown()
    
    def _shutdown(self):
        """Graceful shutdown with statistics."""
        self.running = False

        logger.info("\n" + "=" * 70)
        logger.info("[SHUTDOWN] MONITORING AGENT SHUTTING DOWN")
        logger.info(f"Total Collections: {self.collection_count}")
        logger.info(f"Successful Sends: {self.successful_sends}")
        logger.info(f"Failed Sends: {self.failed_sends}")

        if self.collection_count > 0:
            success_rate = (self.successful_sends / self.collection_count) * 100
            logger.info(f"Overall Success Rate: {success_rate:.1f}%")

        logger.info("=" * 70)
        logger.info("Agent stopped successfully")



def main():
    """Entry point - loads config and starts agent."""
    try:
        logger.info("Initializing monitoring agent...")
        
        # Create agent with loaded config
        agent = MonitoringAgent(CONFIG)
        
        # Start the agent
        agent.run()
        
        sys.exit(0)
    
    except KeyboardInterrupt:
        logger.info("[STOP] Interrupted by user")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"[ERROR] Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
