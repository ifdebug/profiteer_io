"""Redis caching wrapper for scraper results."""

import logging

from redis.asyncio import Redis

from app.config import settings
from app.schemas.scraper import ScrapeResult

logger = logging.getLogger(__name__)

# Default TTLs in seconds, keyed by marketplace.
DEFAULT_TTL = 1800  # 30 minutes
MARKETPLACE_TTLS: dict[str, int] = {
    "ebay": 1800,
    "tcgplayer": 3600,  # TCGPlayer prices are more stable
    "mercari": 1800,
}


def _cache_key(marketplace: str, query: str, condition: str) -> str:
    """Build a normalized Redis key."""
    normalized = query.lower().strip().replace(" ", "+")
    return f"scraper:{marketplace}:{normalized}:{condition}"


class CacheService:
    """Async Redis cache for scraper results."""

    def __init__(self) -> None:
        self._redis: Redis | None = None

    async def _get_redis(self) -> Redis:
        if self._redis is None:
            self._redis = Redis.from_url(
                settings.redis_url,
                decode_responses=True,
            )
        return self._redis

    async def get(
        self, marketplace: str, query: str, condition: str
    ) -> ScrapeResult | None:
        """Retrieve cached scrape result, or None if not cached / expired."""
        try:
            r = await self._get_redis()
            key = _cache_key(marketplace, query, condition)
            data = await r.get(key)
            if data:
                logger.debug("Cache HIT: %s", key)
                return ScrapeResult.model_validate_json(data)
            logger.debug("Cache MISS: %s", key)
            return None
        except Exception as exc:
            logger.warning("Redis GET error: %s", exc)
            return None

    async def set(
        self, marketplace: str, query: str, condition: str, result: ScrapeResult
    ) -> None:
        """Cache a scrape result with marketplace-specific TTL."""
        try:
            r = await self._get_redis()
            key = _cache_key(marketplace, query, condition)
            ttl = MARKETPLACE_TTLS.get(marketplace, DEFAULT_TTL)
            await r.setex(key, ttl, result.model_dump_json())
            logger.debug("Cache SET: %s (TTL=%ds)", key, ttl)
        except Exception as exc:
            logger.warning("Redis SET error: %s", exc)

    async def invalidate(
        self, marketplace: str, query: str, condition: str
    ) -> None:
        """Manually invalidate a cache entry."""
        try:
            r = await self._get_redis()
            key = _cache_key(marketplace, query, condition)
            await r.delete(key)
        except Exception as exc:
            logger.warning("Redis DELETE error: %s", exc)

    async def close(self) -> None:
        """Close the Redis connection pool."""
        if self._redis:
            await self._redis.close()
            self._redis = None


# Module-level singleton.
cache_service = CacheService()
