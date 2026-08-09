import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { app, streamUrlCache, CACHE_TTL } from '../../src/server.js';
import * as ytdlpWrapper from '../../src/ytdlpWrapper.js';
import http from 'http';
import { AddressInfo } from 'net';

// Mock ytdlpWrapper
vi.mock('../../src/ytdlpWrapper.js', () => {
  return {
    search: vi.fn(),
    getStreamInfo: vi.fn(),
    getPlaylistInfo: vi.fn(),
    downloadTrack: vi.fn(),
  };
});

describe('API Endpoints', () => {
  let mockCdnServer: http.Server;
  let mockCdnUrl: string;

  beforeAll(async () => {
    // Setup a mock CDN server for streaming tests
    mockCdnServer = http.createServer((req, res) => {
      const mockData = 'mock-audio-data';
      // Echo back the range header to verify it was passed
      res.setHeader('X-Received-Range', req.headers.range || 'none');
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Content-Length', Buffer.byteLength(mockData).toString());
      if (req.headers.range) {
        res.setHeader('Content-Range', `bytes 0-${Buffer.byteLength(mockData)-1}/${Buffer.byteLength(mockData)}`);
        res.statusCode = 206;
      } else {
        res.statusCode = 200;
      }
      res.end(mockData);
    });

    await new Promise<void>((resolve) => {
      mockCdnServer.listen(0, () => {
        const address = mockCdnServer.address() as AddressInfo;
        mockCdnUrl = `http://127.0.0.1:${address.port}/stream`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      mockCdnServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    streamUrlCache.clear();
  });

  describe('GET /api/search', () => {
    it('should return 400 if q is missing', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 200 and search results', async () => {
      const mockResults = [{ id: '123', title: 'Test Track' }];
      vi.mocked(ytdlpWrapper.search).mockResolvedValue(mockResults as any);
      
      const res = await request(app).get('/api/search?q=test');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResults);
      expect(ytdlpWrapper.search).toHaveBeenCalledWith('test', 10);
    });

    it('should return 500 on yt-dlp failure', async () => {
      vi.mocked(ytdlpWrapper.search).mockRejectedValue(new Error('yt-dlp error'));
      
      const res = await request(app).get('/api/search?q=test');
      
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('yt-dlp error');
    });
  });

  describe('GET /api/info', () => {
    it('should return 400 if url is missing', async () => {
      const res = await request(app).get('/api/info');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 200 and info', async () => {
      const mockInfo = { streamUrl: 'http://test', title: 'Test' };
      vi.mocked(ytdlpWrapper.getStreamInfo).mockResolvedValue(mockInfo as any);
      
      const res = await request(app).get('/api/info?url=http://youtube.com/test');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockInfo);
    });
  });

  describe('GET /api/audio/resolve and Cache', () => {
    it('should return 400 if videoId is missing', async () => {
      const res = await request(app).get('/api/audio/resolve');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 200 and resolve info on cache miss, then hit cache', async () => {
      const mockInfo = { streamUrl: 'http://test-url', duration: 120, title: 'Title', container: 'mp4', codec: 'aac' };
      vi.mocked(ytdlpWrapper.getStreamInfo).mockResolvedValue(mockInfo as any);
      
      // First request (MISS)
      const res1 = await request(app).get('/api/audio/resolve?videoId=vid1');
      expect(res1.status).toBe(200);
      expect(res1.body.streamUrl).toBe('http://test-url');
      expect(ytdlpWrapper.getStreamInfo).toHaveBeenCalledTimes(1);
      
      // Check cache
      expect(streamUrlCache.has('vid1')).toBe(true);

      // Second request (HIT)
      const res2 = await request(app).get('/api/audio/resolve?videoId=vid1');
      expect(res2.status).toBe(200);
      expect(res2.body.streamUrl).toBe('http://test-url');
      // Should not call getStreamInfo again
      expect(ytdlpWrapper.getStreamInfo).toHaveBeenCalledTimes(1);
    });

    it('should evict cache entries based on max size (100)', async () => {
      // We'll mock the cache max temporarily or just insert 101 items directly to streamUrlCache
      const mockInfo = { streamUrl: 'http://test-url', duration: 120, title: 'Title', container: 'mp4', codec: 'aac' };
      for (let i = 0; i < 101; i++) {
        streamUrlCache.set(`v${i}`, mockInfo as any);
      }
      // v0 should be evicted because max is 100
      expect(streamUrlCache.has('v0')).toBe(false);
      expect(streamUrlCache.has('v100')).toBe(true);
    });

    it('should not cache failed yt-dlp calls', async () => {
      vi.mocked(ytdlpWrapper.getStreamInfo).mockRejectedValueOnce(new Error('fail'));
      await request(app).get('/api/audio/resolve?videoId=failVid');
      
      expect(streamUrlCache.has('failVid')).toBe(false);
    });
  });

  describe('GET /api/audio/stream', () => {
    it('should return 400 if videoId is missing', async () => {
      const res = await request(app).get('/api/audio/stream');
      expect(res.status).toBe(400);
    });

    it('should proxy the stream and forward Range headers', async () => {
      streamUrlCache.set('vidStream', { streamUrl: mockCdnUrl } as any);
      
      const res = await request(app)
        .get('/api/audio/stream?videoId=vidStream')
        .set('Range', 'bytes=10-20');
        
      expect(res.status).toBe(206);
      expect(res.headers['content-type']).toBe('audio/mp4');
      expect(res.headers['x-received-range']).toBe('bytes=10-20');
      expect(res.headers['content-range']).toBe('bytes 0-14/15');
      // res.text is undefined because supertest doesn't parse 'audio/mp4' as text
    });

    it('should default to bytes=0- if no Range header is provided', async () => {
      streamUrlCache.set('vidStream2', { streamUrl: mockCdnUrl } as any);
      
      const res = await request(app)
        .get('/api/audio/stream?videoId=vidStream2');
        
      expect(res.status).toBe(206);
      expect(res.headers['x-received-range']).toBe('bytes=0-');
    });
  });

  describe('GET /api/playlist', () => {
    it('should return 400 if url is missing', async () => {
      const res = await request(app).get('/api/playlist');
      expect(res.status).toBe(400);
    });

    it('should return 200 and playlist info', async () => {
      const mockPlaylist = { id: 'p1', title: 'My Playlist', tracks: [] };
      vi.mocked(ytdlpWrapper.getPlaylistInfo).mockResolvedValue(mockPlaylist as any);
      
      const res = await request(app).get('/api/playlist?url=test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockPlaylist);
    });
  });

  describe('POST /api/download', () => {
    it('should return 400 if url is missing', async () => {
      const res = await request(app).post('/api/download').send({});
      expect(res.status).toBe(400);
    });

    it('should return 200 and file path', async () => {
      vi.mocked(ytdlpWrapper.downloadTrack).mockResolvedValue('/path/to/file.mp3');
      
      const res = await request(app).post('/api/download').send({ url: 'test' });
      expect(res.status).toBe(200);
      expect(res.body.filePath).toBe('/path/to/file.mp3');
    });
  });

  describe('Static Serving', () => {
    it('should respond to / with static content (if dir exists) or 404', async () => {
      // Just check that we don't get a 500, since the dir might not exist in the test env
      const res = await request(app).get('/');
      expect([200, 404]).toContain(res.status);
    });
  });
});
