"""Search deduplication and caching logic."""

import json
from typing import Any


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


class SearchCache:
    """Track search deduplication via caching."""

    def __init__(self):
        """Initialize search cache."""
        self.cache: dict[str, dict] = {}

    def get_cached(self, args: dict[str, Any]) -> dict[str, Any] | None:
        """Get cached result if available.

        Args:
            args: Search arguments

        Returns:
            Cached result or None
        """
        key = create_search_cache_key(args)
        return self.cache.get(key)

    def cache_result(self, args: dict[str, Any], result: dict[str, Any]) -> None:
        """Cache a successful search result.

        Args:
            args: Search arguments
            result: Search result
        """
        if result and result.get("success"):
            key = create_search_cache_key(args)
            self.cache[key] = result
