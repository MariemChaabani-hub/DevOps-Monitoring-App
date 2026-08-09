"""
Metrics sender module.
Sends metrics to an API endpoint with retry logic and error handling.
"""
import requests
import time
import json
from typing import Dict, Any, Optional, Tuple


class MetricsSender:
    """Sends metrics to a backend API with retry logic."""

    def __init__(
        self,
        api_url: str,
        timeout: int = 10,
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        connect_timeout: int = 10
    ):
        """
        Initialize the metrics sender.

        Args:
            api_url: Base API URL (e.g., 'http://localhost:3000')
            timeout: Read timeout in seconds — how long to wait for a
                response once connected (default: 10)
            max_retries: Maximum number of retry attempts (default: 3)
            backoff_factor: Exponential backoff multiplier (default: 2.0)
            connect_timeout: How long to wait to establish the TCP
                connection, kept short and separate from `timeout` so a
                DNS/network hang fails fast instead of stalling for the
                full read timeout (default: 10)
        """
        self.api_url = api_url
        self.endpoint = '/metrics'
        self.full_url = f"{self.api_url}{self.endpoint}"
        self.timeout = timeout
        self.connect_timeout = min(connect_timeout, timeout)
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

        # A dedicated Session with trust_env=False so this never silently
        # picks up HTTP_PROXY/HTTPS_PROXY/NO_PROXY from the pod's
        # environment — a proxy misconfigured for cluster-internal hosts
        # is a classic cause of "curl works, requests hangs forever".
        self._session = requests.Session()
        self._session.trust_env = False

    def send(self, metrics: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Send metrics to the API with retry logic.

        Args:
            metrics: Dictionary of metrics to send

        Returns:
            Tuple of (success: bool, message: str)
        """
        for attempt in range(self.max_retries):
            try:
                response = self._session.post(
                    self.full_url,
                    json=metrics,
                    timeout=(self.connect_timeout, self.timeout)
                )

                # Success response codes
                if response.status_code in [200, 201]:
                    return True, f"[OK] Sent successfully (Status: {response.status_code})"
                
                # Non-success status code
                error_msg = f"[FAIL] Status {response.status_code}: {response.text[:100]}"
                
                # Retry on server error (5xx)
                if response.status_code >= 500 and attempt < self.max_retries - 1:
                    wait_time = self._get_backoff_time(attempt)
                    print(f"[WARN] {error_msg}")
                    print(f"[RETRY] Retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                    continue
                
                return False, error_msg
            
            except requests.exceptions.Timeout:
                error_msg = f"[TIMEOUT] Request timeout ({attempt + 1}/{self.max_retries})"
                
                if attempt < self.max_retries - 1:
                    wait_time = self._get_backoff_time(attempt)
                    print(f"{error_msg}")
                    print(f"[RETRY] Retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    return False, f"[FAIL] {error_msg}"
            
            except requests.exceptions.ConnectionError:
                error_msg = f"[CONN_ERROR] Connection error ({attempt + 1}/{self.max_retries})"
                
                if attempt < self.max_retries - 1:
                    wait_time = self._get_backoff_time(attempt)
                    print(f"{error_msg}")
                    print(f"[RETRY] Retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    return False, f"[FAIL] {error_msg}"
            
            except requests.exceptions.RequestException as e:
                error_msg = f"[ERROR] Request error: {str(e)[:50]}"
                
                if attempt < self.max_retries - 1:
                    wait_time = self._get_backoff_time(attempt)
                    print(f"{error_msg} ({attempt + 1}/{self.max_retries})")
                    print(f"[RETRY] Retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    return False, error_msg
            
            except Exception as e:
                error_msg = f"[ERROR] Unexpected error: {str(e)[:50]}"
                return False, error_msg
        
        return False, f"[FAIL] Failed after {self.max_retries} attempts"
    
    def _get_backoff_time(self, attempt: int) -> float:
        """
        Calculate exponential backoff wait time.
        
        Args:
            attempt: Current attempt number (0-indexed)
            
        Returns:
            Wait time in seconds
        """
        return self.backoff_factor ** attempt
    
    def health_check(self) -> bool:
        """
        Check if the API is reachable.
        
        Returns:
            True if API is reachable, False otherwise
        """
        try:
            response = self._session.get(
                self.api_url,
                timeout=(self.connect_timeout, self.timeout)
            )
            return response.status_code < 500
        except Exception:
            return False
    
    def set_url(self, api_url: str) -> None:
        """
        Update the API URL.
        
        Args:
            api_url: New API base URL
        """
        self.api_url = api_url
        self.full_url = f"{self.api_url}{self.endpoint}"
    
    def get_config(self) -> Dict[str, Any]:
        """
        Get current sender configuration.
        
        Returns:
            Configuration dictionary
        """
        return {
            'api_url': self.api_url,
            'full_url': self.full_url,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'backoff_factor': self.backoff_factor,
        }


# Convenience function for simple usage
def send_metrics(
    metrics: Dict[str, Any],
    api_url: str = "http://localhost:3000",
    timeout: int = 10,
    max_retries: int = 3
) -> Tuple[bool, str]:
    """
    Quick function to send metrics.
    
    Args:
        metrics: Dictionary of metrics
        api_url: API base URL
        timeout: Request timeout in seconds
        max_retries: Number of retry attempts
        
    Returns:
        Tuple of (success, message)
    """
    sender = MetricsSender(api_url, timeout, max_retries)
    return sender.send(metrics)


# Example usage
if __name__ == "__main__":
    # Example metrics
    example_metrics = {
        "timestamp": "2024-04-10T15:30:45.123456",
        "cpu_percent": 25.5,
        "ram_percent": 45.2,
        "disk_percent": 62.5,
        "network_io": {
            "bytes_sent": 1024000,
            "bytes_recv": 2048000,
            "packets_sent": 45000,
            "packets_recv": 50000
        },
        "uptime": {
            "uptime_days": 7,
            "uptime_hours": 168,
            "uptime_seconds": 604800
        }
    }
    
    # Example 1: Using convenience function
    print("=" * 60)
    print("Example 1: Quick send")
    print("=" * 60)
    success, message = send_metrics(example_metrics)
    print(message)
    
    # Example 2: Using MetricsSender class with custom config
    print("\n" + "=" * 60)
    print("Example 2: With custom configuration")
    print("=" * 60)
    sender = MetricsSender(
        api_url="http://localhost:3000",
        timeout=5,
        max_retries=3,
        backoff_factor=2.0
    )
    
    # Check if API is up
    print("Checking API health...")
    is_healthy = sender.health_check()
    print(f"API Status: {'[OK] Reachable' if is_healthy else '[FAIL] Unreachable'}")
    
    # Send metrics
    print("\nSending metrics...")
    success, message = sender.send(example_metrics)
    print(message)
    
    # Show configuration
    print("\n" + "=" * 60)
    print("Sender Configuration:")
    print("=" * 60)
    config = sender.get_config()
    for key, value in config.items():
        print(f"{key}: {value}")
