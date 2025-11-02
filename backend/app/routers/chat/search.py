"""Search deduplication and caching logic."""

import json
from typing import Any


SEARCH_CLAMP_LIMIT = 6  # Maximum unique searches per conversation


def create_search_cache_key(args: dict[str, Any]) -> str:
    """Create a cache key for search deduplication.

    Args:
        args: Search function arguments

    Returns:
        JSON string key for caching
    """
    query = (args.get("query") or "").strip().lower()
    after = str(args.get("after") or "").strip()
    before = str(args.get("before") or "").strip()
    time_hint = str(args.get("time_hint") or "").strip().lower()

    return json.dumps({
        "q": query,
        "after": after,
        "before": before,
        "hint": time_hint,
    }, sort_keys=True)


def is_search_cached(cache: dict[str, dict], key: str) -> bool:
    """Check if a search result is cached.

    Args:
        cache: Search cache dictionary
        key: Cache key

    Returns:
        True if result is cached
    """
    return key in cache


def get_cached_search(cache: dict[str, dict], key: str) -> dict[str, Any] | None:
    """Get cached search result.

    Args:
        cache: Search cache dictionary
        key: Cache key

    Returns:
        Cached result or None
    """
    return cache.get(key)


def cache_search_result(
    cache: dict[str, dict],
    key: str,
    result: dict[str, Any]
) -> None:
    """Cache a successful search result.

    Args:
        cache: Search cache dictionary
        key: Cache key
        result: Search result to cache
    """
    if result and result.get("success"):
        cache[key] = result


def should_clamp_search(
    unique_count: int,
    limit: int = SEARCH_CLAMP_LIMIT
) -> bool:
    """Check if search should be clamped due to excessive calls.

    Args:
        unique_count: Number of unique searches performed
        limit: Maximum allowed searches

    Returns:
        True if search should be clamped
    """
    return unique_count >= limit


def create_clamp_error(limit: int = SEARCH_CLAMP_LIMIT) -> dict[str, Any]:
    """Create error result for clamped search.

    Args:
        limit: Search clamp limit

    Returns:
        Error result dictionary
    """
    return {
        "success": False,
        "error": f"Search trimmed by clamp ({limit})"
    }


class SearchTracker:
    """Track search deduplication and clamping."""

    def __init__(self, clamp_limit: int = SEARCH_CLAMP_LIMIT):
        """Initialize search tracker.

        Args:
            clamp_limit: Maximum unique searches allowed
        """
        self.cache: dict[str, dict] = {}
        self.unique_count = 0
        self.clamp_limit = clamp_limit
        self.clamp_warning_sent = False

    def get_or_clamp(self, args: dict[str, Any]) -> tuple[dict[str, Any] | None, bool]:
        """Get cached result or check if clamped.

        Args:
            args: Search arguments

        Returns:
            Tuple of (cached result or clamp error, should_send_warning)
        """
        key = create_search_cache_key(args)

        # Check cache first
        if key in self.cache:
            return self.cache[key], False

        # Check clamp limit
        if self.unique_count >= self.clamp_limit:
            should_warn = not self.clamp_warning_sent
            self.clamp_warning_sent = True
            return create_clamp_error(self.clamp_limit), should_warn

        return None, False

    def cache_result(self, args: dict[str, Any], result: dict[str, Any]) -> None:
        """Cache a successful search result.

        Args:
            args: Search arguments
            result: Search result
        """
        if result and result.get("success"):
            key = create_search_cache_key(args)
            self.cache[key] = result
            self.unique_count += 1