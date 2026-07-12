import { describe, it, expect } from 'vitest';
import { getPlatformInfo, getBinaryPath } from '../src/ytdlpSetup.js';
import os from 'os';

describe('ytdlpSetup', () => {
  it('should return platform info matching the OS', () => {
    const info = getPlatformInfo();
    expect(info).toHaveProperty('zipName');
    expect(info).toHaveProperty('binaryName');
    
    if (os.platform() === 'darwin') {
      expect(info.zipName).toBe('yt-dlp_macos.zip');
      expect(info.binaryName).toBe('yt-dlp_macos');
    } else if (os.platform() === 'win32') {
      expect(info.zipName).toBe('yt-dlp_win.zip');
      expect(info.binaryName).toBe('yt-dlp.exe');
    } else if (os.platform() === 'linux') {
      expect(info.zipName).toBe('yt-dlp_linux.zip');
      expect(info.binaryName).toBe('yt-dlp_linux');
    }
  });

  it('should return a valid binary path', () => {
    const binaryPath = getBinaryPath();
    expect(binaryPath).toContain('yt-dlp');
  });
});
