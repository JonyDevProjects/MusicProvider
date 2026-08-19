import { LRUCache } from 'lru-cache';
import type { StreamData } from './types.js';

export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class StreamCache {
  public cache: LRUCache<string, Promise<StreamData>>;

  constructor(options: { max?: number; ttl?: number } = {}) {
    this.cache = new LRUCache<string, Promise<StreamData>>({
      max: options.max ?? 100,
      ttl: options.ttl ?? DEFAULT_CACHE_TTL,
    });
  }

  async resolveStreamInfo(
    videoId: string,
    fetchFn: (videoId: string) => Promise<StreamData>
  ): Promise<StreamData> {
    const cached = this.cache.get(videoId);
    if (cached) {
      console.log(`[cache] Stream URL cache HIT for: ${videoId}`);
      return cached; // Returns the pending or resolved promise
    }

    console.log(`[cache] Stream URL cache MISS for: ${videoId}, resolving...`);

    // Cache the promise itself to prevent race conditions
    const promise = Promise.resolve(fetchFn(videoId)).catch((err) => {
      // If it fails, remove it from cache so subsequent requests retry
      this.cache.delete(videoId);
      throw err;
    });

    this.cache.set(videoId, promise);
    return promise;
  }

  get(key: string): Promise<StreamData> | undefined {
    return this.cache.get(key);
  }

  set(key: string, val: Promise<StreamData>): void {
    this.cache.set(key, val);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(videoId: string): boolean {
    return this.cache.delete(videoId);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance with default configuration for shared usage
export const defaultStreamCache = new StreamCache();

// Export helper function compatible with previous streamCache API
export async function resolveStreamInfo(
  videoId: string,
  fetchFn: (videoId: string) => Promise<StreamData>,
  cacheInstance: StreamCache = defaultStreamCache
): Promise<StreamData> {
  return cacheInstance.resolveStreamInfo(videoId, fetchFn);
}
