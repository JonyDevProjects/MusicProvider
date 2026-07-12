import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { ensureInstalled } from '../src/ytdlpSetup.js';
import { search, getStreamInfo, getPlaylistInfo, downloadTrack } from '../src/ytdlpWrapper.js';

const TEST_DOWNLOAD_DIR = path.resolve('./tests/downloads');
const CREEP_VIDEO_ID = 'XFkzRNyygfk'; // Radiohead - Creep

describe('ytdlpWrapper Integration Tests', () => {
  // Ensure yt-dlp is installed before running integration tests
  beforeAll(async () => {
    await ensureInstalled();
  }, 60000); // Allow up to 1 minute for initial download if needed

  afterAll(() => {
    if (fs.existsSync(TEST_DOWNLOAD_DIR)) {
      fs.rmSync(TEST_DOWNLOAD_DIR, { recursive: true, force: true });
    }
  });

  it('should search for videos and return formatted results', async () => {
    const results = await search('Radiohead Creep', 3);
    
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    
    const firstResult = results[0];
    expect(firstResult).toHaveProperty('id');
    expect(firstResult).toHaveProperty('title');
    expect(firstResult.title.toLowerCase()).toContain('creep');
    expect(firstResult).toHaveProperty('duration');
    expect(firstResult).toHaveProperty('channel');
  }, 20000);

  it('should fetch direct stream info for a video ID', async () => {
    const info = await getStreamInfo(CREEP_VIDEO_ID);
    
    expect(info).toHaveProperty('streamUrl');
    expect(info.streamUrl).toMatch(/^https:\/\//);
    expect(info).toHaveProperty('duration');
    expect(info).toHaveProperty('title');
    expect(info).toHaveProperty('container');
    expect(info).toHaveProperty('codec');
  }, 20000);

  it('should fetch playlist info for a playlist URL', async () => {
    // A small public youtube playlist
    const playlistUrl = 'ytsearch5:Radiohead';
    const info = await getPlaylistInfo(playlistUrl);
    
    expect(info).toHaveProperty('id');
    expect(info).toHaveProperty('title');
    expect(info).toHaveProperty('entries');
    expect(info.entries.length).toBeGreaterThan(0);
    
    const entry = info.entries[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('title');
  }, 30000);

  it('should download audio track to test directory', async () => {
    const filePath = await downloadTrack(CREEP_VIDEO_ID, TEST_DOWNLOAD_DIR);
    
    expect(filePath).toBeTruthy();
    expect(fs.existsSync(filePath)).toBe(true);
    
    // Check that extension is m4a, webm or similar audio containers
    const ext = path.extname(filePath);
    expect(['.m4a', '.webm', '.opus', '.mp3']).toContain(ext);
  }, 60000); // Downloading may take a bit longer
});
