import { execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getBinaryPath } from './ytdlpSetup.js';

export interface YtdlpSearchResult {
  id: string;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  channel: string | null;
}

export interface YtdlpStreamInfo {
  streamUrl: string;
  duration: number | null;
  title: string | null;
  container: string | null;
  codec: string | null;
}

export interface YtdlpPlaylistEntry {
  id: string;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  channel: string | null;
}

export interface YtdlpPlaylistInfo {
  id: string;
  title: string;
  entries: YtdlpPlaylistEntry[];
}

function normalizeUrl(videoIdOrUrl: string): string {
  if (videoIdOrUrl.startsWith('http://') || videoIdOrUrl.startsWith('https://')) {
    return videoIdOrUrl;
  }
  return `https://www.youtube.com/watch?v=${videoIdOrUrl}`;
}

function parseNdjson(stdout: string): any[] {
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(item => item !== null);
}

function runYtdlp(args: string[]): Promise<string> {
  const binaryPath = getBinaryPath();
  if (!fs.existsSync(binaryPath)) {
    return Promise.reject(new Error('yt-dlp is not installed. Please run setup first.'));
  }

  return new Promise((resolve, reject) => {
    execFile(binaryPath, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function search(query: string, limit: number = 10): Promise<YtdlpSearchResult[]> {
  const searchUrl = `ytsearch${limit}:${query}`;
  console.log(`[yt-dlp] Searching: "${query}" (limit: ${limit})`);
  
  const stdout = await runYtdlp([
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
    searchUrl
  ]);

  const rawEntries = parseNdjson(stdout);
  return rawEntries
    .filter(entry => entry && entry.id)
    .map(entry => ({
      id: entry.id,
      title: entry.title || 'Unknown',
      duration: entry.duration || null,
      thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails.length > 0 ? entry.thumbnails[entry.thumbnails.length - 1].url : null),
      channel: entry.channel || null
    }));
}

export async function getStreamInfo(videoIdOrUrl: string): Promise<YtdlpStreamInfo> {
  const url = normalizeUrl(videoIdOrUrl);
  console.log(`[yt-dlp] Fetching stream info for: ${url}`);

  const stdout = await runYtdlp([
    '-f',
    'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    url
  ]);

  const info = JSON.parse(stdout);
  if (!info.url) {
    throw new Error('No stream URL returned by yt-dlp');
  }

  return {
    streamUrl: info.url,
    duration: info.duration || null,
    title: info.title || null,
    container: info.ext || null,
    codec: info.acodec || null
  };
}

export async function getPlaylistInfo(playlistUrl: string): Promise<YtdlpPlaylistInfo> {
  console.log(`[yt-dlp] Fetching playlist metadata: ${playlistUrl}`);
  
  const stdout = await runYtdlp([
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
    playlistUrl
  ]);

  const rawEntries = parseNdjson(stdout);
  if (rawEntries.length === 0) {
    throw new Error('No entries found in playlist');
  }

  const playlistTitle = rawEntries.find(entry => entry.playlist_title)?.playlist_title || 'Unknown Playlist';
  const playlistId = rawEntries.find(entry => entry.playlist_id)?.playlist_id || '';

  const entries: YtdlpPlaylistEntry[] = rawEntries
    .filter(entry => entry && entry.id)
    .map(entry => ({
      id: entry.id,
      title: entry.title || 'Unknown',
      duration: entry.duration || null,
      thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails.length > 0 ? entry.thumbnails[entry.thumbnails.length - 1].url : null),
      channel: entry.channel || null
    }));

  return {
    id: playlistId,
    title: playlistTitle,
    entries
  };
}

export function downloadTrack(
  videoIdOrUrl: string,
  outputDir: string,
  onProgress?: (progressStr: string) => void
): Promise<string> {
  const binaryPath = getBinaryPath();
  if (!fs.existsSync(binaryPath)) {
    return Promise.reject(new Error('yt-dlp is not installed. Please run setup first.'));
  }

  const url = normalizeUrl(videoIdOrUrl);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Format templates to output file name based on title
  const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');

  console.log(`[yt-dlp] Starting download for: ${url}`);
  
  return new Promise((resolve, reject) => {
    const process = spawn(binaryPath, [
      '-f',
      'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
      '--no-playlist',
      '--no-warnings',
      '-o',
      outputTemplate,
      url
    ]);

    let outputFilePath = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      const line = data.toString();
      
      // Parse file destination from yt-dlp output
      // yt-dlp output format example: [download] Destination: /path/to/file.m4a
      const destMatch = line.match(/Destination:\s+(.+)/);
      if (destMatch) {
        outputFilePath = destMatch[1].trim();
      }

      // Also support matching already downloaded files
      // yt-dlp output format example: [download] /path/to/file.m4a has already been downloaded
      const existMatch = line.match(/\[download\]\s+(.+?)\s+has already been downloaded/);
      if (existMatch) {
        outputFilePath = existMatch[1].trim();
      }

      if (onProgress) {
        onProgress(line);
      }
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed with exit code ${code}. Error: ${errorOutput}`));
        return;
      }

      // Fallback in case we couldn't parse the destination path from stdout logs
      if (!outputFilePath) {
        // Find most recently created file in output directory
        const files = fs.readdirSync(outputDir).map(file => {
          const filePath = path.join(outputDir, file);
          return {
            path: filePath,
            mtime: fs.statSync(filePath).mtime.getTime()
          };
        }).sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          outputFilePath = files[0].path;
        }
      }

      resolve(outputFilePath);
    });
  });
}
