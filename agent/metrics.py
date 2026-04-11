"""
System metrics collection module.
"""
import psutil
from datetime import datetime
from typing import Dict, Any
from logger import setup_logger
from config import Config

logger = setup_logger(__name__)


class MetricsCollector:
    """Collects system metrics from the host machine."""
    
    @staticmethod
    def get_cpu_metrics() -> Dict[str, Any]:
        """
        Collect CPU metrics.
        
        Returns:
            Dictionary containing CPU metrics
        """
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            return {
                'cpu_percent': round(cpu_percent, 2),
                'cpu_count': cpu_count,
                'cpu_freq_ghz': round(cpu_freq.current / 1000, 2) if cpu_freq else None
            }
        except Exception as e:
            logger.error(f"Error collecting CPU metrics: {e}")
            return {}
    
    @staticmethod
    def get_memory_metrics() -> Dict[str, Any]:
        """
        Collect RAM/Memory metrics.
        
        Returns:
            Dictionary containing memory metrics
        """
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            return {
                'ram_percent': round(memory.percent, 2),
                'ram_used_gb': round(memory.used / (1024 ** 3), 2),
                'ram_total_gb': round(memory.total / (1024 ** 3), 2),
                'ram_available_gb': round(memory.available / (1024 ** 3), 2),
                'swap_percent': round(swap.percent, 2),
                'swap_used_gb': round(swap.used / (1024 ** 3), 2),
                'swap_total_gb': round(swap.total / (1024 ** 3), 2),
            }
        except Exception as e:
            logger.error(f"Error collecting memory metrics: {e}")
            return {}
    
    @staticmethod
    def get_disk_metrics() -> Dict[str, Any]:
        """
        Collect disk usage metrics.
        
        Returns:
            Dictionary containing disk metrics
        """
        try:
            disk = psutil.disk_usage(Config.DISK_MOUNT_POINT)
            disk_io = psutil.disk_io_counters()
            
            metrics = {
                'disk_percent': round(disk.percent, 2),
                'disk_used_gb': round(disk.used / (1024 ** 3), 2),
                'disk_total_gb': round(disk.total / (1024 ** 3), 2),
                'disk_free_gb': round(disk.free / (1024 ** 3), 2),
            }
            
            if disk_io:
                metrics.update({
                    'disk_read_mb': round(disk_io.read_bytes / (1024 ** 2), 2),
                    'disk_write_mb': round(disk_io.write_bytes / (1024 ** 2), 2),
                })
            
            return metrics
        except Exception as e:
            logger.error(f"Error collecting disk metrics: {e}")
            return {}
    
    @staticmethod
    def get_network_metrics() -> Dict[str, Any]:
        """
        Collect network statistics.
        
        Returns:
            Dictionary containing network metrics
        """
        if not Config.ENABLE_NETWORK_STATS:
            return {}
        
        try:
            network = psutil.net_io_counters()
            
            return {
                'network_bytes_sent': round(network.bytes_sent / (1024 ** 2), 2),
                'network_bytes_recv': round(network.bytes_recv / (1024 ** 2), 2),
                'network_packets_sent': network.packets_sent,
                'network_packets_recv': network.packets_recv,
                'network_errors_in': network.errin,
                'network_errors_out': network.errout,
            }
        except Exception as e:
            logger.error(f"Error collecting network metrics: {e}")
            return {}
    
    @staticmethod
    def get_system_uptime() -> Dict[str, Any]:
        """
        Collect system uptime information.
        
        Returns:
            Dictionary containing uptime metrics
        """
        try:
            uptime_seconds = int(datetime.now().timestamp() - psutil.boot_time())
            uptime_hours = uptime_seconds // 3600
            uptime_days = uptime_hours // 24
            
            return {
                'uptime_seconds': uptime_seconds,
                'uptime_hours': uptime_hours,
                'uptime_days': uptime_days,
                'boot_time': datetime.fromtimestamp(psutil.boot_time()).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error collecting system uptime: {e}")
            return {}
    
    @staticmethod
    def get_process_count() -> Dict[str, Any]:
        """
        Collect process count statistics.
        
        Returns:
            Dictionary containing process metrics
        """
        try:
            return {
                'process_count': len(psutil.pids()),
            }
        except Exception as e:
            logger.error(f"Error collecting process count: {e}")
            return {}
    
    @staticmethod
    def collect_all() -> Dict[str, Any]:
        """
        Collect all available system metrics.
        
        Returns:
            Dictionary containing all system metrics with timestamp
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'hostname': psutil.os.environ.get('HOSTNAME', 'unknown'),
        }
        
        # Collect all metric types
        metrics.update(MetricsCollector.get_cpu_metrics())
        metrics.update(MetricsCollector.get_memory_metrics())
        metrics.update(MetricsCollector.get_disk_metrics())
        metrics.update(MetricsCollector.get_network_metrics())
        metrics.update(MetricsCollector.get_system_uptime())
        metrics.update(MetricsCollector.get_process_count())
        
        logger.debug(f"Collected metrics: {len(metrics)} fields")
        return metrics
