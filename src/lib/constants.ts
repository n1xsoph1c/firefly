/**
 * Centralized application configuration
 * All environment variables are accessed through this file
 */

export const APP_NAME = process.env.APP_NAME || 'Firefly';
export const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
export const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || APP_URL;
