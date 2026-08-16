import { LRUCache } from 'lru-cache';
import type { YtdlpStreamInfo } from './ytdlpWrapper.js';

export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const streamUrlCache = new LRUCache<string, YtdlpStreamInfo>({
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
    return cached;
  }
  console.log(`[cache] Stream URL cache MISS for: ${videoId}, resolving via yt-dlp...`);
  const info = await fetchFn(videoId);
  streamUrlCache.set(videoId, info);
  return info;
}
