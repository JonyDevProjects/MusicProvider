import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { performance } from 'perf_hooks';
import { getStreamInfo } from '../src/ytdlpWrapper.js';
import type { YtdlpStreamInfo } from '../src/ytdlpWrapper.js';
import { resolveStreamInfo, streamUrlCache } from '../src/streamCache.js';
import { BENCHMARK_TRACKS } from './tracks.js';
import type { BenchmarkTrack } from './tracks.js';
import { calculateMetrics, formatMs, formatMemory } from './metrics.js';
import type { BenchmarkMetrics } from './metrics.js';

export interface TrackRunData {
  track: BenchmarkTrack;
  coldRunsMs: number[];
  warmRunsMs: number[];
  coldMetrics: BenchmarkMetrics;
  warmMetrics: BenchmarkMetrics;
  streamUrl?: string;
  error?: string;
  peakMemoryBytes?: number;
}

export interface ModelBenchmarkResult {
  model: 'api';
  modelName: string;
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
  tracksResults: TrackRunData[];
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

/**
 * Executes a single API model resolution flow (simulates Express /api/audio/resolve -> resolveStreamInfo).
 */
export async function resolveApiModel(videoId: string): Promise<{ info: YtdlpStreamInfo; durationMs: number }> {
  const start = performance.now();
  const info = await resolveStreamInfo(videoId, getStreamInfo);
  const durationMs = performance.now() - start;
  return { info, durationMs };
}

/**
 * Runs the API Model Benchmark across the defined tracks.
 */
export async function runApiModelBenchmark(options: BenchmarkOptions = {}): Promise<ModelBenchmarkResult> {
  const tracks = options.tracks || BENCHMARK_TRACKS;
  const runsPerTrack = options.runsPerTrack ?? 3;
  const cooldownMs = options.cooldownMs ?? 500;
  const verbose = options.verbose ?? true;

  if (verbose) {
    console.log('===============================================================');
    console.log('  MusicProvider Benchmark — Modelo API (Express / resolveStreamInfo)');
    console.log('===============================================================');
    console.log(`Tracks: ${tracks.length} | Runs por track: ${runsPerTrack} | Cooldown: ${cooldownMs}ms\n`);
  }

  const tracksResults: TrackRunData[] = [];
  const allColdValues: number[] = [];
  const allWarmValues: number[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (verbose) {
      console.log(`[${i + 1}/${tracks.length}] Testing: "${track.artist} - ${track.title}" (${track.id}) [${track.category}]`);
    }

    const coldRunsMs: number[] = [];
    const warmRunsMs: number[] = [];
    let resolvedStreamUrl: string | undefined;
    let trackError: string | undefined;
    let maxMem = 0;

    // 1. Cold runs: clear cache before each invocation to measure full yt-dlp resolution
    for (let r = 0; r < runsPerTrack; r++) {
      try {
        streamUrlCache.delete(track.id);
        const memBefore = process.memoryUsage().rss;
        const { info, durationMs } = await resolveApiModel(track.id);
        const memAfter = process.memoryUsage().rss;
        maxMem = Math.max(maxMem, memBefore, memAfter);

        coldRunsMs.push(durationMs);
        allColdValues.push(durationMs);
        resolvedStreamUrl = info.streamUrl;

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

    // 2. Warm runs: streamUrlCache already populated
    for (let r = 0; r < runsPerTrack; r++) {
      try {
        const { durationMs } = await resolveApiModel(track.id);
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
      streamUrl: resolvedStreamUrl,
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

  const result: ModelBenchmarkResult = {
    model: 'api',
    modelName: 'Modelo API (Express / getCachedStreamInfo)',
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
    return currentFilePath === executedPath || executedPath.endsWith('model-api.ts');
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  runApiModelBenchmark().then((results) => {
    const resultsDir = path.join(process.cwd(), 'benchmarks', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const outputPath = path.join(resultsDir, 'model-api-latest.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

    console.log('\n===============================================================');
    console.log('  RESUMEN MODELO API');
    console.log('===============================================================');
    console.log(`Total Tracks Evaluados: ${results.tracksResults.length}`);
    console.log(`Cold Cache Latencia -> Media: ${formatMs(results.overallColdMetrics.mean)} | p50: ${formatMs(results.overallColdMetrics.p50)} | p95: ${formatMs(results.overallColdMetrics.p95)} | p99: ${formatMs(results.overallColdMetrics.p99)}`);
    console.log(`Warm Cache Latencia -> Media: ${formatMs(results.overallWarmMetrics.mean)} | p50: ${formatMs(results.overallWarmMetrics.p50)} | p95: ${formatMs(results.overallWarmMetrics.p95)} | p99: ${formatMs(results.overallWarmMetrics.p99)}`);
    console.log(`\nResultados guardados en: ${outputPath}\n`);
  }).catch((err) => {
    console.error('Error fatal ejecutando benchmark modelo API:', err);
    process.exit(1);
  });
}
