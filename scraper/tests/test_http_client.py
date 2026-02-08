"""Tests for HTTP client."""

import responses

from scraper.fetcher import RateLimitedClient


class TestRateLimitedClient:
    @responses.activate
    def test_get_success(self):
        responses.add(
            responses.GET,
            "https://example.com/test",
            body="<html>Test</html>",
            status=200,
        )

        with RateLimitedClient(delay=0) as client:
            result = client.get("https://example.com/test")

        assert result == "<html>Test</html>"

    @responses.activate
    def test_context_manager(self):
        responses.add(
            responses.GET,
            "https://example.com/test",
            body="Test",
            status=200,
        )

        with RateLimitedClient(delay=0) as client:
            client.get("https://example.com/test")

        assert client._session is None

    @responses.activate
    def test_user_agent_header(self):
        responses.add(
            responses.GET,
            "https://example.com/test",
            body="Test",
            status=200,
        )

        with RateLimitedClient(delay=0) as client:
            client.get("https://example.com/test")

        assert "User-Agent" in responses.calls[0].request.headers
        assert "Mozilla" in responses.calls[0].request.headers["User-Agent"]

    @responses.activate
    def test_retry_on_server_error(self):
        responses.add(
            responses.GET,
            "https://example.com/test",
            body="Error",
            status=503,
        )
        responses.add(
            responses.GET,
            "https://example.com/test",
            body="Success",
            status=200,
        )

        with RateLimitedClient(delay=0) as client:
            result = client.get("https://example.com/test")

        assert result == "Success"
        assert len(responses.calls) == 2
