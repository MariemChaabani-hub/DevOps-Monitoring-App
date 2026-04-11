#!/usr/bin/env python3
"""
Intelligent server monitoring agent.
Collects system metrics and sends them to a monitoring backend API.

Usage:
    python agent.py              # Run with default config
    python agent.py --debug      # Run in debug mode
"""
import signal
import sys
import time
from typing import Optional
from logger import setup_logger
from config import Config
from metrics import MetricsCollector
from api_client import APIClient, RetryConfig

logger = setup_logger(__name__)


class MonitoringAgent:
    """
    Main monitoring agent that orchestrates metric collection and API communication.
    """
    
    def __init__(self):
        """Initialize the monitoring agent."""
        self.running = True
        self.metrics_collector = MetricsCollector()
        self.api_client = APIClient()
        self.collection_count = 0
        self.successful_sends = 0
        
        logger.info("=" * 60)
        logger.info("🚀 Monitoring Agent Started")
        logger.info(f"Collection interval: {Config.COLLECTION_INTERVAL}s")
        logger.info(f"API endpoint: {Config.get_full_api_url()}")
        logger.info(f"Max retries: {Config.MAX_RETRIES}")
        logger.info("=" * 60)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info("\n⏹️  Shutdown signal received (SIGTERM/SIGINT)")
        self.running = False
    
    def _register_signal_handlers(self) -> None:
        """Register signal handlers for graceful shutdown."""
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _perform_health_check(self) -> bool:
        """
        Perform initial API health check.
        
        Returns:
            True if API is reachable, False otherwise
        """
        logger.info("Performing initial API health check...")
        if not self.api_client.health_check():
            logger.warning("⚠️  API is not reachable, but continuing anyway...")
            return False
        return True
    
    def _collect_and_send_metrics(self) -> None:
        """Collect metrics and send to backend API."""
        try:
            # Collect metrics
            logger.debug("Collecting system metrics...")
            metrics = self.metrics_collector.collect_all()
            self.collection_count += 1
            
            # Send to API
            if self.api_client.send_metrics(metrics):
                self.successful_sends += 1
            
            # Log statistics periodically
            if self.collection_count % 12 == 0:  # Every 60s with 5s interval
                success_rate = (self.successful_sends / self.collection_count) * 100
                logger.info(
                    f"📊 Stats - Collected: {self.collection_count}, "
                    f"Sent: {self.successful_sends}, "
                    f"Success Rate: {success_rate:.1f}%"
                )
        
        except Exception as e:
            logger.error(f"Unexpected error in collection cycle: {e}", exc_info=True)
    
    def run(self) -> None:
        """
        Main run loop for the monitoring agent.
        """
        self._register_signal_handlers()
        self._perform_health_check()
        
        logger.info(f"🔄 Starting collection loop ({Config.COLLECTION_INTERVAL}s interval)...")
        
        try:
            while self.running:
                start_time = time.time()
                
                # Collect and send metrics
                self._collect_and_send_metrics()
                
                # Sleep for the configured interval (account for execution time)
                elapsed_time = time.time() - start_time
                sleep_time = max(0, Config.COLLECTION_INTERVAL - elapsed_time)
                
                if sleep_time > 0:
                    time.sleep(sleep_time)
        
        except KeyboardInterrupt:
            logger.info("⏹️  Keyboard interrupt received")
        
        finally:
            self._shutdown()
    
    def _shutdown(self) -> None:
        """Graceful shutdown."""
        logger.info("=" * 60)
        logger.info("🛑 Monitoring Agent Shutting Down")
        logger.info(f"Total collections: {self.collection_count}")
        logger.info(f"Successful sends: {self.successful_sends}")
        if self.collection_count > 0:
            success_rate = (self.successful_sends / self.collection_count) * 100
            logger.info(f"Overall success rate: {success_rate:.1f}%")
        logger.info("=" * 60)


def main():
    """Entry point for the monitoring agent."""
    try:
        agent = MonitoringAgent()
        agent.run()
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
