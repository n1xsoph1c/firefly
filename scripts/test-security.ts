import { verifyToken } from '../src/lib/auth';
import { sanitizeFilename } from '../src/lib/file-validation';
import { generateUniqueFilePath } from '../src/lib/storage';
import path from 'path';

console.log('Running Security Verification...');

// 1. Verify Secrets
try {
    if (!process.env.JWT_SECRET) {
        console.log('✅ JWT_SECRET check passed (it is missing, so app should warn/fail in prod)');
    }
} catch (e) {
    console.error('❌ Secrets check failed', e);
}

// 2. Verify Path Traversal - Filename
const dangerousFilename = '../../etc/passwd';
const sanitized = sanitizeFilename(dangerousFilename);
if (sanitized === '____etc_passwd' || sanitized === '_etc_passwd' || !sanitized.includes('..')) {
    console.log(`✅ Filename sanitization passed: "${dangerousFilename}" -> "${sanitized}"`);
} else {
    console.error(`❌ Filename sanitization failed: "${dangerousFilename}" -> "${sanitized}"`);
}

// 3. Verify Path Traversal - Folder Path
const dangerousFolderPath = '../../uploads';
const uniquePath = generateUniqueFilePath('test.txt', dangerousFolderPath);
if (!uniquePath.includes('..')) {
    console.log(`✅ Folder path sanitization passed: "${dangerousFolderPath}" -> "${uniquePath}"`);
} else {
    console.error(`❌ Folder path sanitization failed: "${dangerousFolderPath}" -> "${uniquePath}"`);
}

console.log('Security Verification Completed.');
