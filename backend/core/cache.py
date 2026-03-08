import redis
from core.config import settings
import json
from typing import Optional, Any

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

class CacheService:
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    @staticmethod
    async def set(key: str, value: Any, ttl: int = settings.CACHE_TTL):
        """Set value in cache with TTL"""
        try:
            redis_client.setex(
                key,
                ttl,
                json.dumps(value)
            )
        except Exception as e:
            print(f"Cache set error: {e}")
    
    @staticmethod
    async def delete(key: str):
        """Delete key from cache"""
        try:
            redis_client.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")
    
    @staticmethod
    async def flush():
        """Flush all cache"""
        try:
            redis_client.flushdb()
        except Exception as e:
            print(f"Cache flush error: {e}")
