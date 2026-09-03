"""
System metrics collector module.
Collects system information using psutil and returns as JSON.
"""
import json
import logging
import subprocess
import psutil
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Bump on any change to what/how this module reports (new metrics fields,
# detection behavior, payload shape) — sent with every metrics payload so a
# server running a stale agent is visible from the dashboard instead of
# looking like a detection bug (see collect()/AGENT_VERSION usage below).
AGENT_VERSION = "1.3.2"

# Unit-name prefixes that are always host/OS infrastructure, never an
# application Clediss cares about monitoring individually. Broad on
# purpose — a real Ubuntu host has dozens of these (apt-daily-upgrade,
# apt-daily, cloud-init, cloud-final, snapd.seeded, e2scrub_all, ...) and
# the whole point of is_system is to keep them out of the default
# "Applicatifs" view, which should hold only the handful an admin actually
# cares about (apache2, nginx, mongod, ssh, docker, mysql, ...).
SYSTEM_UNIT_PREFIXES = (
    'systemd-', 'getty@', 'user@', 'snap-', 'snapd',
    'apt-', 'cloud-', 'e2scrub', 'plymouth',
)

# Exact unit names classified as system/infra rather than application.
# ssh/sshd is deliberately NOT here: an admin managing remote servers wants
# it in the default view at all times since it's their access to the
# machine — it stays visible, just protected by criticality='restart_only'
# on the actions side.
SYSTEM_UNIT_NAMES = frozenset({
    'dbus', 'polkit', 'udisks2', 'multipathd', 'ModemManager',
    'accounts-daemon', 'packagekit', 'colord', 'avahi-daemon',
    'cron', 'rsyslog', 'unattended-upgrades', 'apport',
    'apparmor', 'apport-autoreport', 'auditd', 'blk-availability',
    'keyboard-setup', 'console-setup', 'setvtrgb', 'networkd-dispatcher',
})


class SystemCollector:
    """Collects system metrics and returns as JSON."""

    @staticmethod
    def _is_system_unit(name: str) -> bool:
        """Classify a unit name as system/infra (True) vs application (False)."""
        if name in SYSTEM_UNIT_NAMES:
            return True
        return any(name.startswith(prefix) for prefix in SYSTEM_UNIT_PREFIXES)


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
    def detect_services() -> Optional[List[Dict[str, str]]]:
        """
        Detect all systemd service units on this host, active or not.

        Returns:
            A list of dicts, one per unit: {name, active_state, sub_state,
            description}. `active_state` is systemd's ActiveState (active/
            inactive/failed/...) and `sub_state` its SubState (running/
            exited/dead/failed/...) — a service can be ActiveState=active
            while SubState=exited (a one-shot unit that already finished),
            which is NOT "running".

            Returns None — never an empty list — when detection itself
            failed (systemctl missing, non-systemd host, timeout, non-zero
            exit code), so callers can tell "nothing to report" apart from
            "couldn't check". Never raises; failures are logged.
        """
        try:
            result = subprocess.run(
                ['systemctl', 'list-units', '--type=service', '--all',
                 '--no-pager', '--plain', '--no-legend'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode != 0:
                logger.warning(
                    "systemctl list-units exited with code %s: %s",
                    result.returncode, result.stderr.strip()
                )
                return None

            services = []
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                # Columns: UNIT LOAD ACTIVE SUB DESCRIPTION (--no-legend
                # drops the header/footer, but the description itself may
                # contain spaces, hence the maxsplit of 4).
                parts = line.split(None, 4)
                if len(parts) < 4:
                    continue
                unit, _load_state, active_state, sub_state = parts[:4]
                if not unit.endswith('.service'):
                    continue
                name = unit[:-len('.service')]
                services.append({
                    'name': name,
                    'active_state': active_state,
                    'sub_state': sub_state,
                    'description': parts[4] if len(parts) > 4 else '',
                    'is_system': SystemCollector._is_system_unit(name),
                })
            return services

        except subprocess.TimeoutExpired as e:
            logger.warning("systemctl list-units timed out: %s", e)
            return None
        except (subprocess.SubprocessError, OSError, FileNotFoundError) as e:
            logger.warning("systemctl list-units failed: %s", e)
            return None

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
            # tz=timezone.utc: without it, this is a naive local-time string
            # with no offset — the backend's Date parser then interprets it
            # per its OWN host timezone, not the agent's. A metric sent by
            # an agent in UTC+2 and ingested by a backend process running in
            # UTC (or vice versa) ends up shifted by the difference, which
            # can push a fresh metric outside the dashboard's "last 60
            # minutes" window.
            'boot_time': datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc).isoformat(),
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
            # tz=timezone.utc for the same reason as boot_time below: an
            # offset-less timestamp is interpreted per the *backend's* local
            # timezone on ingestion, not the agent's, which is wrong
            # whenever the two differ.
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'cpu_percent': SystemCollector.get_cpu_percent(),
            'ram_percent': SystemCollector.get_ram_percent(),
            'disk_percent': SystemCollector.get_disk_percent(),
            'network_io': SystemCollector.get_network_io(),
            'uptime': SystemCollector.get_uptime(),
            'services': SystemCollector.detect_services(),
            'agent_version': AGENT_VERSION,
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
