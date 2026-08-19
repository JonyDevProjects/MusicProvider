import { execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getBinaryPath } from './ytdlpSetup.js';
import {
  search as coreSearch,
  getStreamInfo as coreGetStreamInfo,
  getPlaylistInfo as coreGetPlaylistInfo,
  normalizeUrl,
  type SearchResult,
  type StreamData,
  type PlaylistData,
  type PlaylistEntry
} from './core/index.js';

// Backward-compatible type aliases
export type YtdlpSearchResult = SearchResult;
export type YtdlpStreamInfo = StreamData;
export type YtdlpPlaylistEntry = PlaylistEntry;
export type YtdlpPlaylistInfo = PlaylistData;

export function runYtdlp(args: string[]): Promise<string> {
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
  return coreSearch(query, limit);
}

export async function getStreamInfo(videoIdOrUrl: string): Promise<YtdlpStreamInfo> {
  return coreGetStreamInfo(videoIdOrUrl, runYtdlp);
}

export async function getPlaylistInfo(playlistUrl: string): Promise<YtdlpPlaylistInfo> {
  return coreGetPlaylistInfo(playlistUrl, runYtdlp);
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
