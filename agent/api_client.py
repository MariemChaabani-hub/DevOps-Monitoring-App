"""
API client with retry logic and error handling.
"""
import requests
import time
from typing import Dict, Any, Optional
from logger import setup_logger
from config import Config

logger = setup_logger(__name__)


class RetryConfig:
    """Configuration for retry strategy."""
    
    def __init__(
        self,
        max_retries: int = Config.MAX_RETRIES,
        backoff_factor: float = Config.RETRY_BACKOFF_FACTOR,
        timeout: int = Config.TIMEOUT,
    ):
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.timeout = timeout
    
    def get_wait_time(self, attempt: int) -> float:
        """
        Calculate exponential backoff wait time.
        
        Args:
            attempt: Retry attempt number (0-indexed)
            
        Returns:
            Wait time in seconds
        """
        return self.backoff_factor ** attempt


class APIClient:
    """
    API client with built-in retry logic and error handling.
    """
    
    def __init__(self, retry_config: Optional[RetryConfig] = None):
        """
        Initialize API client.
        
        Args:
            retry_config: RetryConfig instance for customizing retry behavior
        """
        self.retry_config = retry_config or RetryConfig()
        self.api_url = Config.get_full_api_url()
        logger.info(f"APIClient initialized with URL: {self.api_url}")
    
    def send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """
        Send metrics to the backend API with retry logic.
        
        Args:
            metrics: Dictionary containing metrics to send
            
        Returns:
            True if successful, False otherwise
        """
        for attempt in range(self.retry_config.max_retries):
            try:
                logger.debug(f"Sending metrics (attempt {attempt + 1}/{self.retry_config.max_retries})")
                
                response = requests.post(
                    self.api_url,
                    json=metrics,
                    timeout=self.retry_config.timeout
                )
                
                # Check for successful response
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Metrics sent successfully (Status: {response.status_code})")
                    return True
                
                # Handle non-successful status codes
                logger.warning(
                    f"Unexpected status code {response.status_code}: {response.text[:200]}"
                )
                
                if attempt < self.retry_config.max_retries - 1:
                    self._wait_before_retry(attempt)
                
            except requests.exceptions.Timeout:
                logger.warning(f"Request timeout (attempt {attempt + 1})")
                if attempt < self.retry_config.max_retries - 1:
                    self._wait_before_retry(attempt)
            
            except requests.exceptions.ConnectionError:
                logger.warning(f"Connection error (attempt {attempt + 1})")
                if attempt < self.retry_config.max_retries - 1:
                    self._wait_before_retry(attempt)
            
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request error: {e} (attempt {attempt + 1})")
                if attempt < self.retry_config.max_retries - 1:
                    self._wait_before_retry(attempt)
            
            except Exception as e:
                logger.error(f"Unexpected error sending metrics: {e}")
                if attempt < self.retry_config.max_retries - 1:
                    self._wait_before_retry(attempt)
        
        logger.error(f"Failed to send metrics after {self.retry_config.max_retries} attempts")
        return False
    
    def _wait_before_retry(self, attempt: int) -> None:
        """
        Wait before retrying with exponential backoff.
        
        Args:
            attempt: Current attempt number (0-indexed)
        """
        wait_time = self.retry_config.get_wait_time(attempt)
        logger.debug(f"Waiting {wait_time:.1f}s before retry...")
        time.sleep(wait_time)
    
    def health_check(self) -> bool:
        """
        Check if the API is reachable.
        
        Returns:
            True if API is reachable, False otherwise
        """
        try:
            response = requests.get(
                Config.API_BASE_URL,
                timeout=self.retry_config.timeout
            )
            logger.info(f"API health check passed (Status: {response.status_code})")
            return response.status_code < 500
        except Exception as e:
            logger.warning(f"API health check failed: {e}")
            return False
