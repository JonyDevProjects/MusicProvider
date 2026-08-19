import { defaultStreamCache, resolveStreamInfo as coreResolveStreamInfo, DEFAULT_CACHE_TTL, StreamCache } from './core/index.js';
import type { StreamData } from './core/index.js';
import type { YtdlpStreamInfo } from './ytdlpWrapper.js';

export const CACHE_TTL = DEFAULT_CACHE_TTL;

// Backward-compatible streamUrlCache instance
export const streamUrlCache = defaultStreamCache;

export async function resolveStreamInfo(
  videoId: string,
  fetchFn: (videoId: string) => Promise<YtdlpStreamInfo>
): Promise<YtdlpStreamInfo> {
  return coreResolveStreamInfo(videoId, fetchFn, defaultStreamCache);
}
