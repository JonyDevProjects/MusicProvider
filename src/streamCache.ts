import { LRUCache } from 'lru-cache';
import type { YtdlpStreamInfo } from './ytdlpWrapper.js';

export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache the promise itself to prevent race conditions (multiple yt-dlp calls for same ID)
export const streamUrlCache = new LRUCache<string, Promise<YtdlpStreamInfo>>({
  max: 100,
  ttl: CACHE_TTL,
});

export async function resolveStreamInfo(
  videoId: string,
  fetchFn: (videoId: string) => Promise<YtdlpStreamInfo>
): Promise<YtdlpStreamInfo> {
  const cached = streamUrlCache.get(videoId);
  if (cached) {
    console.log(`[cache] Stream URL cache HIT for: ${videoId}`);
    return cached; // Returns the pending or resolved promise
  }
  
  console.log(`[cache] Stream URL cache MISS for: ${videoId}, resolving via yt-dlp...`);
  
  // Create the promise and cache it immediately
  const promise = Promise.resolve(fetchFn(videoId)).catch((err) => {
    // If it fails, remove it from cache so subsequent requests retry
    streamUrlCache.delete(videoId);
    throw err;
  });
  
  streamUrlCache.set(videoId, promise);
  return promise;
}
