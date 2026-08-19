import { describe, it, expect, vi } from 'vitest';
import { StreamCache, resolveStreamInfo } from '../../src/core/cache.js';
import type { StreamData } from '../../src/core/types.js';

describe('Core StreamCache', () => {
  it('should resolve and cache stream info on MISS', async () => {
    const cache = new StreamCache({ ttl: 1000 });
    const mockFetch = vi.fn().mockResolvedValue({
      streamUrl: 'https://cdn.example.com/audio.m4a',
      duration: 180,
      title: 'Song Title',
      container: 'm4a',
      codec: 'mp4a'
    } as StreamData);

    const result1 = await resolveStreamInfo('vid1', mockFetch, cache);
    expect(result1.streamUrl).toBe('https://cdn.example.com/audio.m4a');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should HIT cache and not call mockFetch again
    const result2 = await resolveStreamInfo('vid1', mockFetch, cache);
    expect(result2.streamUrl).toBe('https://cdn.example.com/audio.m4a');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should not cache rejected promises and allow retry', async () => {
    const cache = new StreamCache();
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary yt-dlp error'))
      .mockResolvedValueOnce({
        streamUrl: 'https://cdn.example.com/audio-retry.m4a',
        duration: 200,
        title: 'Retry Song',
        container: 'webm',
        codec: 'opus'
      } as StreamData);

    await expect(resolveStreamInfo('failVid', mockFetch, cache)).rejects.toThrow('Temporary yt-dlp error');
    expect(cache.size).toBe(0);

    const result = await resolveStreamInfo('failVid', mockFetch, cache);
    expect(result.streamUrl).toBe('https://cdn.example.com/audio-retry.m4a');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should delete entry when delete() is called', async () => {
    const cache = new StreamCache();
    const mockFetch = vi.fn().mockResolvedValue({
      streamUrl: 'https://cdn.example.com/audio.m4a',
      duration: 180,
      title: 'Song',
      container: 'm4a',
      codec: 'opus'
    } as StreamData);

    await resolveStreamInfo('vid2', mockFetch, cache);
    expect(cache.size).toBe(1);

    cache.delete('vid2');
    expect(cache.size).toBe(0);

    await resolveStreamInfo('vid2', mockFetch, cache);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
