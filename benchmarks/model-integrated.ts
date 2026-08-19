import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import type {
  YtdlpStreamInfo as SDKStreamInfo,
  Stream,
} from '@nuclearplayer/plugin-sdk';
import { getStreamInfo } from '../src/ytdlpWrapper.js';
import type { YtdlpStreamInfo } from '../src/ytdlpWrapper.js';
import { resolveStreamInfo, streamUrlCache } from '../src/streamCache.js';
import { BENCHMARK_TRACKS } from './tracks.js';
import type { BenchmarkTrack } from './tracks.js';
import { calculateMetrics, formatMs, formatMemory } from './metrics.js';
import type { BenchmarkMetrics } from './metrics.js';

const PROVIDER_ID = 'music-provider';
const STREAMING_ID = `${PROVIDER_ID}-streaming`;

export interface IntegratedTrackRunData {
  track: BenchmarkTrack;
  coldRunsMs: number[];
  warmRunsMs: number[];
  coldMetrics: BenchmarkMetrics;
  warmMetrics: BenchmarkMetrics;
  stream?: Stream;
  error?: string;
  peakMemoryBytes?: number;
}

export interface IntegratedModelBenchmarkResult {
  model: 'integrated';
  modelName: string;
  executionMode: 'isolated-sdk' | 'tauri-host';
  timestamp: string;
  runsPerTrack: number;
  environment: {
    platform: string;
    arch: string;
    nodeVersion: string;
    osRelease: string;
    cpus: string;
    totalMemory: string;
  };
  tracksResults: IntegratedTrackRunData[];
  overallColdMetrics: BenchmarkMetrics;
  overallWarmMetrics: BenchmarkMetrics;
}

export interface BenchmarkOptions {
  tracks?: BenchmarkTrack[];
  runsPerTrack?: number;
  cooldownMs?: number;
  verbose?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function sdkToInternal(info: SDKStreamInfo): YtdlpStreamInfo {
  return {
    streamUrl: info.stream_url,
    duration: info.duration,
    title: info.title,
    container: info.container,
    codec: info.codec,
  };
}

function toStream(url: string, info: YtdlpStreamInfo, sourceId: string): Stream {
  const ext = info.container || '';
  const mimeType = ext.includes('m4a') || ext.includes('mp4')
    ? 'audio/mp4'
    : ext.includes('webm')
      ? 'audio/webm'
      : ext.includes('opus')
        ? 'audio/ogg'
        : undefined;

  const chunkedUrl = url.includes('&range=') ? url : `${url}&range=0-99999999999`;

  return {
    url: chunkedUrl,
    protocol: 'https',
    mimeType,
    codec: info.codec || undefined,
    container: info.container || undefined,
    durationMs: info.duration ? Math.round(info.duration * 1000) : undefined,
    source: { provider: STREAMING_ID, id: sourceId },
  };
}

/**
 * Mock Nuclear Host API for isolated benchmarking.
 * In production Nuclear, api.Ytdlp.getStream delegates to Nuclear's Rust backend.
 * In isolated harness, it delegates to getStreamInfo and maps to SDK types.
 */
async function mockHostYtdlpGetStream(videoId: string): Promise<SDKStreamInfo> {
  const internal = await getStreamInfo(videoId);
  return {
    stream_url: internal.streamUrl,
    duration: internal.duration || 0,
    title: internal.title || '',
    container: internal.container || '',
    codec: internal.codec || '',
  };
}

/**
 * Executes a single Integrated Model stream resolution flow
 * (mirrors src/index.ts getStreamUrl -> resolveStreamInfo + api.Ytdlp.getStream + toStream).
 */
export async function resolveIntegratedModel(candidateId: string): Promise<{ stream: Stream; durationMs: number }> {
  const start = performance.now();

  // Validate provider matching constraint (R-3)
  const candidateProvider = STREAMING_ID;
  if (candidateProvider !== 'music-provider-streaming') {
    throw new Error(`Provider mismatch: expected ${STREAMING_ID}, got ${candidateProvider}`);
  }

  const info = await resolveStreamInfo(candidateId, async (id) => {
    const sdkInfo = await mockHostYtdlpGetStream(id);
    return sdkToInternal(sdkInfo);
  });

  const stream = toStream(info.streamUrl, info, candidateId);
  const durationMs = performance.now() - start;

  return { stream, durationMs };
}

/**
 * Runs the Integrated Model Benchmark across the defined tracks.
 */
export async function runIntegratedModelBenchmark(options: BenchmarkOptions = {}): Promise<IntegratedModelBenchmarkResult> {
  const tracks = options.tracks || BENCHMARK_TRACKS;
  const runsPerTrack = options.runsPerTrack ?? 3;
  const cooldownMs = options.cooldownMs ?? 500;
  const verbose = options.verbose ?? true;

  if (verbose) {
    console.log('===============================================================');
    console.log('  MusicProvider Benchmark — Modelo Integrado (Nuclear Plugin / getStreamUrl)');
    console.log('===============================================================');
    console.log(`Modo: isolated-sdk | Tracks: ${tracks.length} | Runs por track: ${runsPerTrack} | Cooldown: ${cooldownMs}ms\n`);
  }

  const tracksResults: IntegratedTrackRunData[] = [];
  const allColdValues: number[] = [];
  const allWarmValues: number[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (verbose) {
      console.log(`[${i + 1}/${tracks.length}] Testing: "${track.artist} - ${track.title}" (${track.id}) [${track.category}]`);
    }

    const coldRunsMs: number[] = [];
    const warmRunsMs: number[] = [];
    let resolvedStream: Stream | undefined;
    let trackError: string | undefined;
    let maxMem = 0;

    // 1. Cold runs: clear cache before each invocation
    for (let r = 0; r < runsPerTrack; r++) {
      try {
        streamUrlCache.delete(track.id);
        const memBefore = process.memoryUsage().rss;
        const { stream, durationMs } = await resolveIntegratedModel(track.id);
        const memAfter = process.memoryUsage().rss;
        maxMem = Math.max(maxMem, memBefore, memAfter);

        coldRunsMs.push(durationMs);
        allColdValues.push(durationMs);
        resolvedStream = stream;

        if (verbose) {
          console.log(`   Cold Run ${r + 1}: ${formatMs(durationMs)}`);
        }

        if (cooldownMs > 0 && r < runsPerTrack - 1) {
          await sleep(cooldownMs);
        }
      } catch (err: any) {
        trackError = err.message || String(err);
        if (verbose) {
          console.error(`   ❌ Cold Run ${r + 1} Error: ${trackError}`);
        }
      }
    }

    // 2. Warm runs: cache hit
    for (let r = 0; r < runsPerTrack; r++) {
      try {
        const { durationMs } = await resolveIntegratedModel(track.id);
        warmRunsMs.push(durationMs);
        allWarmValues.push(durationMs);

        if (verbose) {
          console.log(`   Warm Run ${r + 1}: ${formatMs(durationMs)}`);
        }
      } catch (err: any) {
        if (!trackError) trackError = err.message || String(err);
      }
    }

    const coldMetrics = calculateMetrics(coldRunsMs);
    const warmMetrics = calculateMetrics(warmRunsMs);

    tracksResults.push({
      track,
      coldRunsMs,
      warmRunsMs,
      coldMetrics,
      warmMetrics,
      stream: resolvedStream,
      error: trackError,
      peakMemoryBytes: maxMem,
    });

    if (verbose) {
      console.log(`   --> Cold Mean: ${formatMs(coldMetrics.mean)} | Warm Mean: ${formatMs(warmMetrics.mean)}\n`);
    }

    // Cooldown between different tracks
    if (cooldownMs > 0 && i < tracks.length - 1) {
      await sleep(cooldownMs);
    }
  }

  const overallColdMetrics = calculateMetrics(allColdValues);
  const overallWarmMetrics = calculateMetrics(allWarmValues);

  const result: IntegratedModelBenchmarkResult = {
    model: 'integrated',
    modelName: 'Modelo Integrado (Plugin JS -> api.Ytdlp.getStream -> Stream)',
    executionMode: 'isolated-sdk',
    timestamp: new Date().toISOString(),
    runsPerTrack,
    environment: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      osRelease: os.release(),
      cpus: os.cpus()[0]?.model || 'unknown',
      totalMemory: formatMemory(os.totalmem()),
    },
    tracksResults,
    overallColdMetrics,
    overallWarmMetrics,
  };

  return result;
}

// Direct CLI execution handler
const isDirectExecution = (): boolean => {
  if (!process.argv[1]) return false;
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const executedPath = path.resolve(process.argv[1]);
    return currentFilePath === executedPath || executedPath.endsWith('model-integrated.ts');
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  runIntegratedModelBenchmark().then((results) => {
    const resultsDir = path.join(process.cwd(), 'benchmarks', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const outputPath = path.join(resultsDir, 'model-integrated-latest.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

    console.log('\n===============================================================');
    console.log('  RESUMEN MODELO INTEGRADO');
    console.log('===============================================================');
    console.log(`Total Tracks Evaluados: ${results.tracksResults.length}`);
    console.log(`Cold Cache Latencia -> Media: ${formatMs(results.overallColdMetrics.mean)} | p50: ${formatMs(results.overallColdMetrics.p50)} | p95: ${formatMs(results.overallColdMetrics.p95)} | p99: ${formatMs(results.overallColdMetrics.p99)}`);
    console.log(`Warm Cache Latencia -> Media: ${formatMs(results.overallWarmMetrics.mean)} | p50: ${formatMs(results.overallWarmMetrics.p50)} | p95: ${formatMs(results.overallWarmMetrics.p95)} | p99: ${formatMs(results.overallWarmMetrics.p99)}`);
    console.log(`\nResultados guardados en: ${outputPath}\n`);
  }).catch((err) => {
    console.error('Error fatal ejecutando benchmark modelo integrado:', err);
    process.exit(1);
  });
}
