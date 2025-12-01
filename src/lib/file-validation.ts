import { storageConfig } from './storage';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > storageConfig.maxFileSize) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${formatFileSize(storageConfig.maxFileSize)}`,
    };
  }

  // Check file type
  if (!storageConfig.allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${storageConfig.allowedMimeTypes.join(', ')}`,
    };
  }

  // Comprehensive list of dangerous executable and script extensions
  const dangerousExtensions = [
    // Windows executables
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.msi', '.msp', '.cpl',
    '.dll', '.ocx', '.sys', '.drv', '.vxd',
    // Scripts
    '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.ps1', '.psm1',
    // Server-side scripts
    '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx', '.jsp',
    '.cgi', '.pl', '.py', '.rb', '.sh', '.bash',
    // Other dangerous formats
    '.jar', '.app', '.deb', '.rpm', '.dmg', '.pkg',
    '.hta', '.reg', '.lnk', '.url',
  ];

  // Handle multi-extension files (e.g., .tar.gz, .backup.exe)
  const nameParts = file.name.toLowerCase().split('.');
  if (nameParts.length > 1) {
    // Check all extensions, not just the last one
    for (let i = 1; i < nameParts.length; i++) {
      const ext = '.' + nameParts[i];
      if (dangerousExtensions.includes(ext)) {
        return {
          isValid: false,
          error: `File extension "${ext}" is not allowed for security reasons`,
        };
      }
    }
  }

  // Check filename for suspicious patterns
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar)$/i,
    /[<>:"|?*]/,
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      return {
        isValid: false,
        error: 'Filename contains invalid or suspicious characters',
      };
    }
  }

  return { isValid: true };
}

export function sanitizeFilename(filename: string): string {
  // Validate filename length before processing
  if (filename.length > 255) {
    filename = filename.slice(0, 255);
  }

  // Remove null bytes and other control characters
  let sanitized = filename
    .replace(/\0/g, '') // Null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .replace(/\.\./g, '_') // Prevent path traversal
    .replace(/[\/\\]/g, '_') // Remove path separators
    .replace(/[<>:"|?*]/g, '_') // Remove invalid filename chars
    .replace(/\s+/g, '_') // Replace spaces and multiple whitespace with underscores
    .replace(/[^\w\-_.]/g, '_') // Replace any non-alphanumeric chars except dash, underscore, dot
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i, '_reserved_') // Reserved names
    .replace(/^[._]/, '') // Remove leading dots/underscores
    .trim();

  // Add hash suffix to prevent collision attacks
  // Extract extension if present
  const lastDotIndex = sanitized.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const name = sanitized.substring(0, lastDotIndex);
    const ext = sanitized.substring(lastDotIndex);
    // Add 6-char hash to prevent collisions from over-sanitization
    const hash = Math.random().toString(36).substring(2, 8);
    sanitized = `${name}_${hash}${ext}`;
  }

  return sanitized.slice(0, 255); // Final length limit
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.startsWith('text/')) return 'text';
  return 'other';
}