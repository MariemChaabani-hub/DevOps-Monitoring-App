"""
System metrics collector module.
Collects system information using psutil and returns as JSON.
"""
import json
import subprocess
import psutil
from datetime import datetime
from typing import Dict, Any, List


class SystemCollector:
    """Collects system metrics and returns as JSON."""
    
    @staticmethod
    def get_cpu_percent() -> float:
        """Get CPU usage percentage (0-100)."""
        return psutil.cpu_percent(interval=1)
    
    @staticmethod
    def get_ram_percent() -> float:
        """Get RAM usage percentage (0-100)."""
        return psutil.virtual_memory().percent
    
    @staticmethod
    def get_disk_percent() -> float:
        """Get Disk usage percentage (0-100)."""
        return psutil.disk_usage('/').percent
    
    @staticmethod
    def get_network_io() -> Dict[str, Any]:
        """Get network I/O statistics."""
        net_io = psutil.net_io_counters()
        return {
            'bytes_sent': net_io.bytes_sent,
            'bytes_recv': net_io.bytes_recv,
            'packets_sent': net_io.packets_sent,
            'packets_recv': net_io.packets_recv,
            'errors_in': net_io.errin,
            'errors_out': net_io.errout,
        }
    
    @staticmethod
    def detect_active_services() -> List[str]:
        """
        Detect all active systemd services on this host.

        Returns:
            List of active service names (without the '.service' suffix).
            Returns an empty list on non-systemd hosts or if detection
            fails for any reason — this must never crash metric collection.
        """
        try:
            result = subprocess.run(
                ['systemctl', 'list-units', '--type=service', '--state=active', '--no-pager', '--plain'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode != 0:
                return []

            services = []
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line or line.startswith('UNIT') or line.startswith('*'):
                    continue
                unit = line.split()[0]
                if unit.endswith('.service'):
                    services.append(unit[:-len('.service')])
            return services

        except (subprocess.SubprocessError, OSError, FileNotFoundError):
            return []

    @staticmethod
    def get_uptime() -> Dict[str, Any]:
        """Get system uptime information."""
        uptime_seconds = int(datetime.now().timestamp() - psutil.boot_time())
        uptime_hours = uptime_seconds // 3600
        uptime_days = uptime_hours // 24
        
        return {
            'uptime_seconds': uptime_seconds,
            'uptime_hours': uptime_hours,
            'uptime_days': uptime_days,
            'boot_time': datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        }
    
    @staticmethod
    def collect(server_id: str = None, server_name: str = None, location: str = None) -> Dict[str, Any]:
        """
        Collect all system metrics and return as dictionary.
        
        Args:
            server_id: Server identifier (optional)
            server_name: Server name (optional)
            location: Server location (optional)
        
        Returns:
            Dictionary with all collected metrics
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': SystemCollector.get_cpu_percent(),
            'ram_percent': SystemCollector.get_ram_percent(),
            'disk_percent': SystemCollector.get_disk_percent(),
            'network_io': SystemCollector.get_network_io(),
            'uptime': SystemCollector.get_uptime(),
            'services': SystemCollector.detect_active_services(),
        }

        # Server identification: always included as keys (the backend
        # requires server_id/server_name), even if a value ends up empty —
        # that way a missing value is visible in the payload/logs instead
        # of the key silently disappearing.
        metrics['server_id'] = server_id or ''
        metrics['server_name'] = server_name or ''
        metrics['location'] = location or ''

        return metrics
    
    @staticmethod
    def collect_json(server_id: str = None, server_name: str = None, location: str = None) -> str:
        """
        Collect all metrics and return as JSON string.
        
        Args:
            server_id: Server identifier (optional)
            server_name: Server name (optional)
            location: Server location (optional)

        Returns:
            JSON string of metrics
        """
        metrics = SystemCollector.collect(server_id=server_id, server_name=server_name, location=location)
        return json.dumps(metrics, indent=2)


# Convenience function for quick usage
def collect_metrics(server_id: str = None, server_name: str = None, location: str = None) -> Dict[str, Any]:
    """Quick function to collect all metrics."""
    return SystemCollector.collect(server_id=server_id, server_name=server_name, location=location)


def collect_metrics_json(server_id: str = None, server_name: str = None, location: str = None) -> str:
    """Quick function to collect all metrics as JSON."""
    return SystemCollector.collect_json(server_id=server_id, server_name=server_name, location=location)


# Example usage
if __name__ == "__main__":
    # Example 1: As dictionary
    print("=" * 60)
    print("System Metrics (Dictionary):")
    print("=" * 60)
    metrics_dict = collect_metrics()
    for key, value in metrics_dict.items():
        print(f"{key}: {value}")
    
    # Example 2: As JSON
    print("\n" + "=" * 60)
    print("System Metrics (JSON):")
    print("=" * 60)
    metrics_json = collect_metrics_json()
    print(metrics_json)
