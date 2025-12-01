// Utility for parsing HTTP Range headers and computing byte ranges
// Supports single range (common for video streaming / resumable downloads)

export interface ParsedRange {
  start: number;
  end: number;
  size: number; // length of the part (end-start+1)
  total: number; // total file size
  raw: string; // original header value
}

export function parseRangeHeader(rangeHeader: string | null, fileSize: number, defaultChunkSize = 2 * 1024 * 1024): ParsedRange | null {
  if (!rangeHeader) return null;
  // Example: bytes=0-1023 or bytes=1000-
  if (!rangeHeader.startsWith('bytes=')) return null;

  const range = rangeHeader.replace(/bytes=/, '');
  const [startStr, endStr] = range.split('-');

  // If start isn't provided it's a suffix-byte-range-spec which we don't actively use
  if (startStr === '') {
    // bytes=-500 means last 500 bytes
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength)) return null;
    const start = Math.max(fileSize - suffixLength, 0);
    const end = fileSize - 1;
    return { start, end, size: (end - start) + 1, total: fileSize, raw: rangeHeader };
  }

  const start = parseInt(startStr, 10);
  if (isNaN(start) || start < 0) return null;

  let end: number;
  if (endStr) {
    end = parseInt(endStr, 10);
    if (isNaN(end) || end < start) return null;
  } else {
    // No end specified: clamp by default chunk size for streaming efficiency
    end = Math.min(start + defaultChunkSize - 1, fileSize - 1);
  }

  end = Math.min(end, fileSize - 1);
  const size = (end - start) + 1;
  return { start, end, size, total: fileSize, raw: rangeHeader };
}
