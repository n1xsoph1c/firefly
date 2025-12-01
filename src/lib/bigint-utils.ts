/**
 * Utility functions for handling BigInt serialization in Next.js API responses
 */

/**
 * Safely converts BigInt values to numbers for JSON serialization
 * @param obj - Object that may contain BigInt values
 * @returns Object with BigInt values converted to numbers
 */
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result = {} as any;
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (typeof value === 'bigint') {
        result[key] = Number(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = serializeBigInt(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Converts file objects with BigInt size fields to serializable format
 * @param file - File object from Prisma
 * @returns File object with size as number
 */
export function serializeFileData(file: any) {
  if (!file) return file;
  
  return {
    ...file,
    size: Number(file.size),
    downloadCount: file.downloadCount ? Number(file.downloadCount) : file.downloadCount,
  };
}

/**
 * Converts array of files with BigInt fields to serializable format
 * @param files - Array of file objects from Prisma
 * @returns Array of files with BigInt fields converted to numbers
 */
export function serializeFilesData(files: any[]) {
  return files.map(serializeFileData);
}

/**
 * Custom JSON.stringify replacer function that handles BigInt values
 * @param key - Property key
 * @param value - Property value
 * @returns Converted value for JSON serialization
 */
export function bigIntReplacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
}

/**
 * Safe JSON.stringify that handles BigInt values
 * @param obj - Object to stringify
 * @param space - Optional formatting space
 * @returns JSON string with BigInt values converted to numbers
 */
export function stringifyWithBigInt(obj: any, space?: string | number) {
  return JSON.stringify(obj, bigIntReplacer, space);
}