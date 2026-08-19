import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BENCHMARK_TRACKS } from './tracks.js';
import type { BenchmarkTrack } from './tracks.js';
import { formatMs, formatMemory, calculateMetrics, round } from './metrics.js';
import type { BenchmarkMetrics } from './metrics.js';
import { runApiModelBenchmark } from './model-api.js';
import type { ModelBenchmarkResult } from './model-api.js';
import { runIntegratedModelBenchmark } from './model-integrated.js';
import type { IntegratedModelBenchmarkResult } from './model-integrated.js';

export interface FullBenchmarkReport {
  timestamp: string;
  environment: {
    platform: string;
    arch: string;
    nodeVersion: string;
    osRelease: string;
    cpus: string;
    totalMemory: string;
  };
  tracksCount: number;
  runsPerTrack: number;
  apiModel: ModelBenchmarkResult;
  integratedModel: IntegratedModelBenchmarkResult;
  comparisons: {
    track: BenchmarkTrack;
    apiMeanMs: number;
    integratedMeanMs: number;
    deltaMs: number;
    deltaPercent: number;
  }[];
}

export function generateMarkdownReport(report: FullBenchmarkReport): string {
  const { apiModel, integratedModel, comparisons, timestamp, environment } = report;

  let md = `# Reporte de Benchmark — Fase 3.2 (API Model vs Integrated Plugin Model)\n\n`;
  md += `**Fecha de ejecución**: ${timestamp}\n`;
  md += `**Plataforma**: ${environment.platform} (${environment.arch}) — Node ${environment.nodeVersion} — OS ${environment.osRelease}\n`;
  md += `**Hardware**: ${environment.cpus} | RAM Total: ${environment.totalMemory}\n\n`;

  md += `## 1. Modelo API (Express → resolveStreamInfo)\n\n`;
  md += `| Track | Run 1 (Cold) | Run 2 (Cold) | Run 3 (Cold) | p50 | p95 | p99 | Media | Warm Media | Notas |\n`;
  md += `|-------|--------------|--------------|--------------|-----|-----|-----|-------|------------|-------|\n`;

  for (const res of apiModel.tracksResults) {
    const t = res.track;
    const r1 = res.coldRunsMs[0] !== undefined ? formatMs(res.coldRunsMs[0]) : '—';
    const r2 = res.coldRunsMs[1] !== undefined ? formatMs(res.coldRunsMs[1]) : '—';
    const r3 = res.coldRunsMs[2] !== undefined ? formatMs(res.coldRunsMs[2]) : '—';
    const p50 = formatMs(res.coldMetrics.p50);
    const p95 = formatMs(res.coldMetrics.p95);
    const p99 = formatMs(res.coldMetrics.p99);
    const mean = formatMs(res.coldMetrics.mean);
    const warmMean = formatMs(res.warmMetrics.mean);
    const note = res.error ? `Error: ${res.error}` : `OK [${t.category}]`;

    md += `| ${t.artist} - ${t.title} | ${r1} | ${r2} | ${r3} | ${p50} | ${p95} | ${p99} | ${mean} | ${warmMean} | ${note} |\n`;
  }

  md += `\n**Resumen Global API**:\n`;
  md += `- Cold Cache -> Media: **${formatMs(apiModel.overallColdMetrics.mean)}** | p50: **${formatMs(apiModel.overallColdMetrics.p50)}** | p95: **${formatMs(apiModel.overallColdMetrics.p95)}** | p99: **${formatMs(apiModel.overallColdMetrics.p99)}** | StdDev: ${formatMs(apiModel.overallColdMetrics.stddev)}\n`;
  md += `- Warm Cache -> Media: **${formatMs(apiModel.overallWarmMetrics.mean)}** | p50: **${formatMs(apiModel.overallWarmMetrics.p50)}** | p95: **${formatMs(apiModel.overallWarmMetrics.p95)}** | p99: **${formatMs(apiModel.overallWarmMetrics.p99)}**\n\n`;

  md += `## 2. Modelo Integrado (Plugin JS → Nuclear getStreamUrl)\n\n`;
  md += `| Track | Run 1 (Cold) | Run 2 (Cold) | Run 3 (Cold) | p50 | p95 | p99 | Media | Warm Media | Notas |\n`;
  md += `|-------|--------------|--------------|--------------|-----|-----|-----|-------|------------|-------|\n`;

  for (const res of integratedModel.tracksResults) {
    const t = res.track;
    const r1 = res.coldRunsMs[0] !== undefined ? formatMs(res.coldRunsMs[0]) : '—';
    const r2 = res.coldRunsMs[1] !== undefined ? formatMs(res.coldRunsMs[1]) : '—';
    const r3 = res.coldRunsMs[2] !== undefined ? formatMs(res.coldRunsMs[2]) : '—';
    const p50 = formatMs(res.coldMetrics.p50);
    const p95 = formatMs(res.coldMetrics.p95);
    const p99 = formatMs(res.coldMetrics.p99);
    const mean = formatMs(res.coldMetrics.mean);
    const warmMean = formatMs(res.warmMetrics.mean);
    const note = res.error ? `Error: ${res.error}` : `OK [${t.category}]`;

    md += `| ${t.artist} - ${t.title} | ${r1} | ${r2} | ${r3} | ${p50} | ${p95} | ${p99} | ${mean} | ${warmMean} | ${note} |\n`;
  }

  md += `\n**Resumen Global Integrado**:\n`;
  md += `- Cold Cache -> Media: **${formatMs(integratedModel.overallColdMetrics.mean)}** | p50: **${formatMs(integratedModel.overallColdMetrics.p50)}** | p95: **${formatMs(integratedModel.overallColdMetrics.p95)}** | p99: **${formatMs(integratedModel.overallColdMetrics.p99)}** | StdDev: ${formatMs(integratedModel.overallColdMetrics.stddev)}\n`;
  md += `- Warm Cache -> Media: **${formatMs(integratedModel.overallWarmMetrics.mean)}** | p50: **${formatMs(integratedModel.overallWarmMetrics.p50)}** | p95: **${formatMs(integratedModel.overallWarmMetrics.p95)}** | p99: **${formatMs(integratedModel.overallWarmMetrics.p99)}**\n\n`;

  md += `## 3. Comparativa Delta (Modelo API vs Modelo Integrado)\n\n`;
  md += `| Track | Categoría | API Media (Cold) | Integrado Media (Cold) | Delta (ms) | Delta (%) |\n`;
  md += `|-------|-----------|------------------|------------------------|------------|-----------|\n`;

  for (const c of comparisons) {
    const diffSign = c.deltaMs > 0 ? `+${c.deltaMs.toFixed(2)}` : `${c.deltaMs.toFixed(2)}`;
    const pctSign = c.deltaPercent > 0 ? `+${c.deltaPercent.toFixed(2)}%` : `${c.deltaPercent.toFixed(2)}%`;
    md += `| ${c.track.artist} - ${c.track.title} | ${c.track.category} | ${formatMs(c.apiMeanMs)} | ${formatMs(c.integratedMeanMs)} | ${diffSign} ms | ${pctSign} |\n`;
  }

  return md;
}

/**
 * Updates docs/future-roadmap/phase3/findings.md with the latest benchmark tables.
 */
export function updateFindingsDocument(report: FullBenchmarkReport): void {
  const findingsPath = path.join(process.cwd(), 'docs', 'future-roadmap', 'phase3', 'findings.md');
  if (!fs.existsSync(findingsPath)) {
    console.warn(`[runner] findings.md not found at ${findingsPath}, skipping inline update.`);
    return;
  }

  let content = fs.readFileSync(findingsPath, 'utf-8');

  // Build API table lines
  let apiRows = '';
  for (const res of report.apiModel.tracksResults) {
    const t = res.track;
    const r1 = res.coldRunsMs[0] !== undefined ? `${round(res.coldRunsMs[0])}ms` : '—';
    const r2 = res.coldRunsMs[1] !== undefined ? `${round(res.coldRunsMs[1])}ms` : '—';
    const r3 = res.coldRunsMs[2] !== undefined ? `${round(res.coldRunsMs[2])}ms` : '—';
    const p50 = `${round(res.coldMetrics.p50)}ms`;
    const p95 = `${round(res.coldMetrics.p95)}ms`;
    const p99 = `${round(res.coldMetrics.p99)}ms`;
    const mean = `${round(res.coldMetrics.mean)}ms`;
    const note = res.error ? `Error: ${res.error}` : `Cold cache [${t.category}]`;
    apiRows += `| ${t.artist} - ${t.title} | ${r1} | ${r2} | ${r3} | ${p50} | ${p95} | ${p99} | ${mean} | ${note} |\n`;
  }

  // Build Integrated table lines
  let integratedRows = '';
  for (const res of report.integratedModel.tracksResults) {
    const t = res.track;
    const r1 = res.coldRunsMs[0] !== undefined ? `${round(res.coldRunsMs[0])}ms` : '—';
    const r2 = res.coldRunsMs[1] !== undefined ? `${round(res.coldRunsMs[1])}ms` : '—';
    const r3 = res.coldRunsMs[2] !== undefined ? `${round(res.coldRunsMs[2])}ms` : '—';
    const p50 = `${round(res.coldMetrics.p50)}ms`;
    const p95 = `${round(res.coldMetrics.p95)}ms`;
    const p99 = `${round(res.coldMetrics.p99)}ms`;
    const mean = `${round(res.coldMetrics.mean)}ms`;
    const note = res.error ? `Error: ${res.error}` : `Isolated SDK [${t.category}]`;
    integratedRows += `| ${t.artist} - ${t.title} | ${r1} | ${r2} | ${r3} | ${p50} | ${p95} | ${p99} | ${mean} | ${note} |\n`;
  }

  // Replace placeholder in findings.md if present
  const apiTablePlaceholder = /\| Track \| Run 1 \| Run 2 \| Run 3 \| p50 \| p95 \| p99 \| media \| Notas \|\n\|[-| ]+\|\n\| _\(por medir\)[^|]*\|[^\n]*/g;

  // If match exists in content, update it
  if (content.includes('**Modelo API (Express → Flutter):**') && content.includes('**Modelo Integrado (Plugin JS → host nativo):**')) {
    const apiHeader = '**Modelo API (Express → Flutter):**\n\n| Track | Run 1 | Run 2 | Run 3 | p50 | p95 | p99 | media | Notas |\n|-------|-------|-------|-------|-----|-----|-----|-------|-------|\n' + apiRows;
    const integratedHeader = '**Modelo Integrado (Plugin JS → host nativo):**\n\n| Track | Run 1 | Run 2 | Run 3 | p50 | p95 | p99 | media | Notas |\n|-------|-------|-------|-------|-----|-----|-----|-------|-------|\n' + integratedRows;

    content = content.replace(/\*\*Modelo API \(Express → Flutter\):\*\*[\s\S]*?(?=\*\*Modelo Integrado)/, `${apiHeader}\n`);
    content = content.replace(/\*\*Modelo Integrado \(Plugin JS → host nativo\):\*\*[\s\S]*?(?=\*\*RAM:\*\*)/, `${integratedHeader}\n`);

    fs.writeFileSync(findingsPath, content, 'utf-8');
    console.log(`[runner] ✅ Updated findings.md tables at ${findingsPath}`);
  }
}

/**
 * Runs the full benchmark suite across both models.
 */
export async function runFullBenchmark(): Promise<FullBenchmarkReport> {
  console.log('###############################################################');
  console.log('  INICIANDO BENCHMARK HARNESS COMPLETO (FASE 3.2)');
  console.log('###############################################################\n');

  // Step 1: Execute Model API
  console.log('>>> [1/2] Ejecutando Modelo API (Express / resolveStreamInfo)...');
  const apiModelResult = await runApiModelBenchmark({
    tracks: BENCHMARK_TRACKS,
    runsPerTrack: 3,
    cooldownMs: 500,
    verbose: true,
  });

  console.log('\n---------------------------------------------------------------');
  console.log('>>> Pausa de enfriamiento entre modelos (1.5s)...');
  await new Promise(r => setTimeout(r, 1500));
  console.log('---------------------------------------------------------------\n');

  // Step 2: Execute Model Integrated
  console.log('>>> [2/2] Ejecutando Modelo Integrado (Nuclear Plugin / getStreamUrl)...');
  const integratedModelResult = await runIntegratedModelBenchmark({
    tracks: BENCHMARK_TRACKS,
    runsPerTrack: 3,
    cooldownMs: 500,
    verbose: true,
  });

  // Step 3: Compute comparisons
  const comparisons = BENCHMARK_TRACKS.map((track, i) => {
    const apiTrack = apiModelResult.tracksResults[i];
    const intTrack = integratedModelResult.tracksResults[i];
    const apiMean = apiTrack ? apiTrack.coldMetrics.mean : 0;
    const intMean = intTrack ? intTrack.coldMetrics.mean : 0;
    const deltaMs = round(intMean - apiMean, 2);
    const deltaPercent = apiMean > 0 ? round(((intMean - apiMean) / apiMean) * 100, 2) : 0;

    return {
      track,
      apiMeanMs: apiMean,
      integratedMeanMs: intMean,
      deltaMs,
      deltaPercent,
    };
  });

  const fullReport: FullBenchmarkReport = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      osRelease: os.release(),
      cpus: os.cpus()[0]?.model || 'unknown',
      totalMemory: formatMemory(os.totalmem()),
    },
    tracksCount: BENCHMARK_TRACKS.length,
    runsPerTrack: 3,
    apiModel: apiModelResult,
    integratedModel: integratedModelResult,
    comparisons,
  };

  // Step 4: Write raw JSON results
  const resultsDir = path.join(process.cwd(), 'benchmarks', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const rawFile = path.join(resultsDir, `benchmark-${timestampStr}.json`);
  const latestFile = path.join(resultsDir, 'latest.json');
  const reportMdFile = path.join(resultsDir, 'report-latest.md');

  fs.writeFileSync(rawFile, JSON.stringify(fullReport, null, 2), 'utf-8');
  fs.writeFileSync(latestFile, JSON.stringify(fullReport, null, 2), 'utf-8');

  const markdownReport = generateMarkdownReport(fullReport);
  fs.writeFileSync(reportMdFile, markdownReport, 'utf-8');

  console.log('\n===============================================================');
  console.log('  REPORTE CONSOLIDADO DEL BENCHMARK');
  console.log('===============================================================');
  console.log(markdownReport);

  // Step 5: Update findings.md
  updateFindingsDocument(fullReport);

  console.log('\n===============================================================');
  console.log(`✅ Datos crudos guardados en: ${rawFile}`);
  console.log(`✅ Último resultado: ${latestFile}`);
  console.log(`✅ Reporte Markdown: ${reportMdFile}`);
  console.log('===============================================================\n');

  return fullReport;
}

// Direct CLI execution handler
const isDirectExecution = (): boolean => {
  if (!process.argv[1]) return false;
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const executedPath = path.resolve(process.argv[1]);
    return currentFilePath === executedPath || executedPath.endsWith('runner.ts');
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  runFullBenchmark().catch((err) => {
    console.error('Error fatal ejecutando benchmark runner:', err);
    process.exit(1);
  });
}
