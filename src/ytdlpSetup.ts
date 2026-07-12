import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const BIN_DIR = path.join(PROJECT_ROOT, 'bin');

const RELEASE_BASE_URL = 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download';
const UPDATE_CHECK_INTERVAL_MS = 3600 * 1000; // 1 hour

export interface UpdateCheckInfo {
  tag: string;
  checkedAt: number;
}

export function getPlatformInfo() {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin') {
    return {
      zipName: 'yt-dlp_macos.zip',
      binaryName: 'yt-dlp_macos'
    };
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      return {
        zipName: 'yt-dlp_linux_aarch64.zip',
        binaryName: 'yt-dlp_linux_aarch64'
      };
    } else {
      return {
        zipName: 'yt-dlp_linux.zip',
        binaryName: 'yt-dlp_linux'
      };
    }
  } else if (platform === 'win32') {
    if (arch === 'arm64') {
      return {
        zipName: 'yt-dlp_win_arm64.zip',
        binaryName: 'yt-dlp_win_arm64.exe'
      };
    } else {
      return {
        zipName: 'yt-dlp_win.zip',
        binaryName: 'yt-dlp.exe'
      };
    }
  }
  throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

export function getBinaryPath(): string {
  const { binaryName } = getPlatformInfo();
  return path.join(BIN_DIR, binaryName);
}

async function downloadAndExtract(zipName: string, binaryPath: string): Promise<void> {
  const url = `${RELEASE_BASE_URL}/${zipName}`;
  const zipPath = path.join(BIN_DIR, '.download.zip');

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  console.log(`[yt-dlp] Downloading from ${url}...`);
  const response = await axios({
    method: 'get',
    url,
    responseType: 'arraybuffer',
    timeout: 300000 // 5 minutes
  });

  fs.writeFileSync(zipPath, response.data);

  console.log(`[yt-dlp] Extracting archive to ${BIN_DIR}...`);
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(BIN_DIR, true);

  fs.unlinkSync(zipPath);

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Binary not found after extraction: ${binaryPath}`);
  }

  // Set executable permissions on Unix platforms
  if (os.platform() !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  console.log(`[yt-dlp] Installed successfully at ${binaryPath}`);
}

async function fetchLatestReleaseTag(): Promise<string> {
  const response = await axios.get('https://api.github.com/repos/yt-dlp/yt-dlp-nightly-builds/releases/latest', {
    headers: {
      'User-Agent': 'music-provider-agent'
    },
    timeout: 10000
  });
  return response.data.tag_name;
}

function readUpdateCheck(): UpdateCheckInfo | null {
  const checkPath = path.join(BIN_DIR, '.update_check');
  if (!fs.existsSync(checkPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(checkPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeUpdateCheck(info: UpdateCheckInfo): void {
  const checkPath = path.join(BIN_DIR, '.update_check');
  fs.writeFileSync(checkPath, JSON.stringify(info), 'utf8');
}

export async function checkForUpdate(binaryPath: string): Promise<void> {
  const { zipName } = getPlatformInfo();
  const existing = readUpdateCheck();

  if (existing) {
    const elapsed = Date.now() - existing.checkedAt;
    if (elapsed < UPDATE_CHECK_INTERVAL_MS) {
      console.log(`[yt-dlp] Last update check was ${Math.round(elapsed / 1000)}s ago, skipping`);
      return;
    }
  }

  console.log('[yt-dlp] Checking for updates...');
  try {
    const latestTag = await fetchLatestReleaseTag();
    const needsUpdate = !existing || existing.tag !== latestTag;

    if (!needsUpdate) {
      console.log(`[yt-dlp] Already on latest version: ${latestTag}`);
      writeUpdateCheck({ tag: latestTag, checkedAt: Date.now() });
      return;
    }

    console.log(`[yt-dlp] New version available: ${latestTag}. Updating...`);
    await downloadAndExtract(zipName, binaryPath);
    writeUpdateCheck({ tag: latestTag, checkedAt: Date.now() });
  } catch (error: any) {
    console.error(`[yt-dlp] Update check/download failed: ${error.message}`);
    // If we failed but already have a binary, write a temporary update check to avoid retrying immediately
    if (existing && fs.existsSync(binaryPath)) {
      writeUpdateCheck({ tag: existing.tag, checkedAt: Date.now() });
    }
  }
}

export async function ensureInstalled(): Promise<boolean> {
  const { zipName } = getPlatformInfo();
  const binaryPath = getBinaryPath();
  const alreadyInstalled = fs.existsSync(binaryPath);

  if (!alreadyInstalled) {
    console.log('[yt-dlp] Binary not found. Starting download...');
    await downloadAndExtract(zipName, binaryPath);
    try {
      const tag = await fetchLatestReleaseTag();
      writeUpdateCheck({ tag, checkedAt: Date.now() });
    } catch {
      writeUpdateCheck({ tag: 'unknown', checkedAt: Date.now() });
    }
    return false;
  }

  console.log(`[yt-dlp] Found existing binary at ${binaryPath}`);
  await checkForUpdate(binaryPath);
  return true;
}
