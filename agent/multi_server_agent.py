#!/usr/bin/env python3
"""
Multi-Server Monitoring Agent Simulator
Simulates 3 virtual servers, each generating independent metrics with unique values.
Each server runs in its own thread and sends metrics to the backend API.
"""
import threading
import time
import signal
import sys
import logging
from datetime import datetime
from typing import Dict, Any
import random

import psutil
import requests


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(name)s] - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


class VirtualServer:
    """Represents a virtual server that simulates metrics and sends them independently."""
    
    def __init__(self, server_id: str, api_url: str = 'http://localhost:3000'):
        """
        Initialize virtual server with unique baseline metrics.
        
        Args:
            server_id: Unique server identifier (e.g., 'server-1')
            api_url: Backend API URL for sending metrics
        """
        self.server_id = server_id
        self.api_url = api_url
        self.running = True
        self.logger = logging.getLogger(f"Server.{server_id}")
        
        # Each server gets unique baseline metrics
        self.cpu_baseline = random.uniform(20, 50)       # 20-50% base CPU
        self.ram_baseline = random.uniform(40, 70)       # 40-70% base RAM
        self.disk_baseline = random.uniform(20, 60)      # 20-60% base disk
        
        # Variation around baseline (simulates fluctuations)
        self.cpu_variation = random.uniform(-8, 8)       # ±8% CPU variation
        self.ram_variation = random.uniform(-5, 5)       # ±5% RAM variation
        self.disk_variation = random.uniform(-2, 2)      # ±2% disk variation
        
        # Statistics
        self.metrics_sent = 0
        self.metrics_failed = 0
        
        self.logger.info(f"Initialized - CPU baseline: {self.cpu_baseline:.1f}%, RAM baseline: {self.ram_baseline:.1f}%")
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Generate simulated metrics for this virtual server.
        
        Variations:
        - CPU: baseline ± random variation
        - RAM: baseline ± random variation  
        - Disk: baseline ± random variation
        - Network/Uptime: Real values from actual system
        
        Returns:
            Dictionary with server metrics in correct format
        """
        # Get real network metrics from the actual system
        try:
            net_io = psutil.net_io_counters()
        except:
            net_io = None
        
        # Generate CPU and RAM around server's baseline (adds variation)
        cpu = min(100, max(0, self.cpu_baseline + random.uniform(-self.cpu_variation, self.cpu_variation)))
        ram = min(100, max(0, self.ram_baseline + random.uniform(-self.ram_variation, self.ram_variation)))
        disk = min(100, max(0, self.disk_baseline + random.uniform(-self.disk_variation, self.disk_variation)))
        
        # Real uptime from actual system
        uptime_seconds = int(datetime.now().timestamp() - psutil.boot_time())
        
        # Build metrics dictionary
        metrics = {
            'server_id': self.server_id,
            'serverId': self.server_id,  # Also include camelCase version
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': round(cpu, 2),
            'ram_percent': round(ram, 2),
            'disk_percent': round(disk, 2),
            'memory_percent': round(ram, 2),  # Alternative name for RAM
            'uptime': uptime_seconds,
        }
        
        # Add network metrics if available
        if net_io:
            metrics['network_in'] = net_io.bytes_recv
            metrics['network_out'] = net_io.bytes_sent
        
        return metrics
    
    def send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """
        Send metrics to backend API.
        
        Args:
            metrics: Metrics dictionary to send
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Send POST request to backend
            response = requests.post(
                f"{self.api_url}/metrics",
                json=metrics,
                timeout=10
            )
            
            if response.status_code == 200:
                self.metrics_sent += 1
                self.logger.info(
                    f"✓ Sent - CPU: {metrics['cpu_percent']:.1f}%, "
                    f"RAM: {metrics['ram_percent']:.1f}%, "
                    f"Disk: {metrics['disk_percent']:.1f}%"
                )
                return True
            else:
                self.metrics_failed += 1
                self.logger.warning(f"✗ API returned status {response.status_code}")
                return False
        
        except requests.exceptions.ConnectionError:
            self.metrics_failed += 1
            self.logger.warning("✗ Connection failed - backend not reachable?")
            return False
        
        except requests.exceptions.Timeout:
            self.metrics_failed += 1
            self.logger.warning("✗ Request timeout")
            return False
        
        except Exception as e:
            self.metrics_failed += 1
            self.logger.error(f"✗ Error: {e}")
            return False
    
    def run(self, interval: int = 5):
        """
        Main run loop - collect and send metrics periodically.
        
        Args:
            interval: Seconds between metric collections
        """
        self.logger.info(f"Starting collection loop (interval: {interval}s)")
        
        try:
            while self.running:
                try:
                    # Collect metrics for this server
                    metrics = self.get_metrics()
                    
                    # Send to backend
                    self.send_metrics(metrics)
                    
                    # Wait for next cycle
                    time.sleep(interval)
                
                except Exception as e:
                    self.logger.error(f"Error in cycle: {e}")
                    time.sleep(interval)
        
        except KeyboardInterrupt:
            self.logger.info("Keyboard interrupt")
        
        finally:
            self.logger.info(
                f"Stopped - Sent: {self.metrics_sent}, Failed: {self.metrics_failed}"
            )
    
    def stop(self):
        """Signal this server to stop collection."""
        self.running = False


class MultiServerSimulator:
    """Manages multiple virtual servers running in parallel threads."""
    
    def __init__(
        self,
        server_ids: list = None,
        api_url: str = 'http://localhost:3000',
        interval: int = 5
    ):
        """
        Initialize simulator with virtual servers.
        
        Args:
            server_ids: List of server IDs (default: server-1, server-2, server-3)
            api_url: Backend API URL
            interval: Seconds between metric collections
        """
        if server_ids is None:
            server_ids = ['server-1', 'server-2', 'server-3']
        
        self.server_ids = server_ids
        self.api_url = api_url
        self.interval = interval
        self.servers: Dict[str, VirtualServer] = {}
        self.threads: Dict[str, threading.Thread] = {}
        self.running = True
        
        self.logger = logging.getLogger("MultiServerSimulator")
        
        # Create virtual servers with unique metrics
        for server_id in server_ids:
            self.servers[server_id] = VirtualServer(server_id, api_url)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        self.logger.info("\n[STOP] Shutdown signal received")
        self.stop()
        sys.exit(0)
    
    def start(self):
        """Start all virtual servers in parallel threads."""
        # Register signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self.logger.info("=" * 80)
        self.logger.info("[START] MULTI-SERVER MONITORING SIMULATOR")
        self.logger.info(f"Servers: {', '.join(self.server_ids)}")
        self.logger.info(f"API URL: {self.api_url}")
        self.logger.info(f"Collection Interval: {self.interval}s")
        self.logger.info("=" * 80)
        self.logger.info("Starting 3 virtual servers with independent metrics...")
        self.logger.info("Press Ctrl+C to stop\n")
        
        # Start a thread for each server
        for server_id, server in self.servers.items():
            thread = threading.Thread(
                target=server.run,
                args=(self.interval,),
                daemon=False,
                name=f"VirtualServer-{server_id}"
            )
            thread.start()
            self.threads[server_id] = thread
            self.logger.info(f"[OK] Started {server_id} in thread")
            time.sleep(0.5)  # Stagger starts slightly
        
        self.logger.info("\nAll servers running. Monitoring dashboard: http://localhost:3000\n")
        
        # Wait for all threads to complete
        try:
            for thread in self.threads.values():
                thread.join()
        except KeyboardInterrupt:
            self.stop()
    
    def stop(self):
        """Stop all virtual servers gracefully."""
        if not self.running:
            return
        
        self.running = False
        self.logger.info("\n" + "=" * 80)
        self.logger.info("[SHUTDOWN] Stopping all servers...")
        self.logger.info("=" * 80)
        
        # Signal all servers to stop
        for server in self.servers.values():
            server.stop()
        
        # Wait for all threads with timeout
        for server_id, thread in self.threads.items():
            thread.join(timeout=5)
            if thread.is_alive():
                self.logger.warning(f"[WARN] Thread for {server_id} did not stop gracefully")
        
        # Log final statistics
        self.logger.info("\nFinal Statistics:")
        self.logger.info("=" * 80)
        for server_id, server in self.servers.items():
            total = server.metrics_sent + server.metrics_failed
            if total > 0:
                success_rate = (server.metrics_sent / total) * 100
                self.logger.info(
                    f"  {server_id:12} → Sent: {server.metrics_sent:5d}  "
                    f"Failed: {server.metrics_failed:3d}  "
                    f"Success: {success_rate:5.1f}%"
                )
        self.logger.info("=" * 80)
        self.logger.info("All servers stopped successfully\n")


def main():
    """Entry point - start multi-server simulator."""
    try:
        # Create simulator with 3 virtual servers
        simulator = MultiServerSimulator(
            server_ids=['server-1', 'server-2', 'server-3'],
            api_url='http://localhost:3000',
            interval=5
        )
        
        # Start all servers
        simulator.start()
    
    except KeyboardInterrupt:
        logging.info("Interrupted by user")
        sys.exit(0)
    
    except Exception as e:
        logging.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

