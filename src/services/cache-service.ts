import Redis from 'ioredis';
import { config } from '../config';

class CacheService {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    if (config.redisUrl) {
      try {
        this.redis = new Redis(config.redisUrl);
        this.enabled = true;
        console.log('✅ Redis connected');
      } catch (error) {
        console.warn('⚠️ Redis not available, caching disabled:', error);
      }
    } else {
      console.warn('⚠️ REDIS_URL not set, caching disabled');
    }
  }

  // Кэширование поиска (10 минут)
  async getOrSearchMods(
    query: string,
    type: string,
    searchFn: () => Promise<any[]>
  ): Promise<any[]> {
    if (!this.enabled || !this.redis) {
      return searchFn();
    }

    const key = `search:${query}:${type}`;
    
    try {
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📦 Cache hit: ${key}`);
        return JSON.parse(cached);
      }
      
      const results = await searchFn();
      await this.redis.setex(key, 600, JSON.stringify(results));
      console.log(`💾 Cache set: ${key}`);
      
      return results;
    } catch (error) {
      console.error('Cache error:', error);
      return searchFn();
    }
  }

  // Кэширование версий (1 час)
  async getOrFetchVersions(
    projectId: string,
    fetchFn: () => Promise<any[]>
  ): Promise<any[]> {
    if (!this.enabled || !this.redis) {
      return fetchFn();
    }

    const key = `versions:${projectId}`;
    
    try {
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📦 Cache hit: ${key}`);
        return JSON.parse(cached);
      }
      
      const versions = await fetchFn();
      await this.redis.setex(key, 3600, JSON.stringify(versions));
      console.log(`💾 Cache set: ${key}`);
      
      return versions;
    } catch (error) {
      console.error('Cache error:', error);
      return fetchFn();
    }
  }

  // Инвалидация кэша
  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ Cache invalidated: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Закрытие соединения
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

export const cacheService = new CacheService();
