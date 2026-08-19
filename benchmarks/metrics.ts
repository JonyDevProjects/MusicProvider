export interface BenchmarkMetrics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p50: number;
  p95: number;
  p99: number;
  stddev: number;
}

/**
 * Rounds a number to a specific number of decimal places.
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculates a percentile from a sorted ascending array of numbers using linear interpolation.
 */
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  if (percentile <= 0) return sortedValues[0];
  if (percentile >= 100) return sortedValues[sortedValues.length - 1];

  const rank = (percentile / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const weight = rank - lowerIndex;

  const interpolated = sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
  return round(interpolated, 2);
}

/**
 * Calculates summary metrics (min, max, mean, median, p50, p95, p99, stddev) for a set of numeric samples.
 */
export function calculateMetrics(values: number[]): BenchmarkMetrics {
  const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  if (validValues.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      stddev: 0,
    };
  }

  const sorted = [...validValues].sort((a, b) => a - b);
  const count = sorted.length;
  const min = round(sorted[0], 2);
  const max = round(sorted[count - 1], 2);

  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = round(sum / count, 2);

  // Population / sample standard deviation
  const squareDiffSum = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const variance = count > 1 ? squareDiffSum / count : 0;
  const stddev = round(Math.sqrt(variance), 2);

  const median = calculatePercentile(sorted, 50);
  const p50 = calculatePercentile(sorted, 50);
  const p95 = calculatePercentile(sorted, 95);
  const p99 = calculatePercentile(sorted, 99);

  return {
    count,
    min,
    max,
    mean,
    median,
    p50,
    p95,
    p99,
    stddev,
  };
}

/**
 * Formats milliseconds into human-readable string (e.g. "124.50 ms" or "2.34 s").
 */
export function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${ms.toFixed(2)} ms`;
}

/**
 * Formats byte values into human-readable string (e.g. "45.20 MB").
 */
export function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}
