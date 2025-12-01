import path from 'path';

/**
 * MIME type mappings for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
    // Video formats
    '.mp4': 'video/mp4',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v',
    '.3gp': 'video/3gpp',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.ts': 'video/mp2t',

    // Image formats
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',

    // Document formats
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',

    // Archive formats
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.bz2': 'application/x-bzip2',

    // Audio formats
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',

    // Code/Text formats
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.md': 'text/markdown',
};

/**
 * Detect MIME type from file path based on extension
 * @param filePath - Absolute or relative file path
 * @returns MIME type string
 */
export function detectMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Check if a file extension is supported
 * @param filePath - File path to check
 * @returns true if the file type is recognized
 */
export function isSupportedFileType(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext in MIME_TYPES;
}

/**
 * Get file extension from path
 * @param filePath - File path
 * @returns Extension with dot (e.g., '.mp4')
 */
export function getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
}
