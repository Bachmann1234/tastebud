"""Rate-limited HTTP client with retry logic."""

import time
from types import TracebackType

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scraper.config import (
    BACKOFF_FACTOR,
    DEFAULT_DELAY,
    MAX_RETRIES,
    REQUEST_TIMEOUT,
    USER_AGENT,
)


class RateLimitedClient:
    """HTTP client with rate limiting and automatic retries."""

    def __init__(self, delay: float = DEFAULT_DELAY, timeout: float = REQUEST_TIMEOUT) -> None:
        self.delay = delay
        self.timeout = timeout
        self._last_request_time: float | None = None
        self._session: requests.Session | None = None

    def _create_session(self) -> requests.Session:
        """Create a session with retry configuration."""
        session = requests.Session()

        retry_strategy = Retry(
            total=MAX_RETRIES,
            backoff_factor=BACKOFF_FACTOR,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
        )

        return session

    @property
    def session(self) -> requests.Session:
        """Get or create the session."""
        if self._session is None:
            self._session = self._create_session()
        return self._session

    def _wait_for_rate_limit(self) -> None:
        """Wait if necessary to respect rate limiting."""
        if self._last_request_time is not None:
            elapsed = time.time() - self._last_request_time
            if elapsed < self.delay:
                time.sleep(self.delay - elapsed)

    def get(self, url: str) -> str:
        """Fetch a URL and return the response text."""
        self._wait_for_rate_limit()

        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()

        self._last_request_time = time.time()
        return response.text

    def __enter__(self) -> "RateLimitedClient":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self.close()

    def close(self) -> None:
        """Close the session."""
        if self._session is not None:
            self._session.close()
            self._session = None
