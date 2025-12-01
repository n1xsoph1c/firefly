// High-performance transfer utilities
// Provides adaptive chunk sizing and stream helpers for maximizing bandwidth.

export interface AdaptiveChunkOptions {
  fileSize: number;
  requestedStart?: number;
  requestedEnd?: number;
  minChunk?: number; // lower bound (default 1MB)
  maxChunk?: number; // upper bound (default 4MB)
}

// Simple heuristic: larger files + early sequential ranges => larger chunks.
export function chooseAdaptiveChunkSize(opts: AdaptiveChunkOptions): number {
  const { fileSize } = opts;
  const min = opts.minChunk ?? (1 * 1024 * 1024); // 1MB
  const max = opts.maxChunk ?? (4 * 1024 * 1024); // 4MB

  if (fileSize >= 20 * 1024 * 1024 * 1024) { // >= 20GB
    return max;
  }
  if (fileSize >= 5 * 1024 * 1024 * 1024) { // >= 5GB
    return Math.min(max, 3 * 1024 * 1024);
  }
  if (fileSize >= 512 * 1024 * 1024) { // >= 512MB
    return Math.min(max, 3 * 1024 * 1024);
  }
  if (fileSize >= 128 * 1024 * 1024) { // >= 128MB
    return Math.min(max, 2 * 1024 * 1024);
  }
  return Math.min(max, 1 * 1024 * 1024);
}

// Compute effective range end if client omitted it (half-open range) using adaptive size.
export function resolveOpenEndedRange(start: number, fileSize: number, adaptiveChunk: number): { start: number; end: number } {
  let end = Math.min(start + adaptiveChunk - 1, fileSize - 1);
  if (end < start) end = start; // safety
  return { start, end };
}

// Future extension: dynamic speed probing (measure first N ms throughput and adjust). Placeholder for now.
export function canRefineChunkDuringSession(): boolean { return false; }
