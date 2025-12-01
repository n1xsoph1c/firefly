import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

// Force Node.js runtime for middleware (required for file system operations)
export const runtime = 'nodejs';

// LRU cache for rate limiting with automatic cleanup (prevents memory leaks)
const rateLimitCache = new LRUCache<string, { count: number; timestamp: number }>({
  max: 5000, // Maximum number of entries
  ttl: 15 * 60 * 1000, // 15 minutes TTL
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

function getClientIP(req: NextRequest): string {
  // Try multiple headers for better proxy support
  // Note: These can be spoofed, so use with caution
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare

  // Use the first IP from x-forwarded-for if present
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }

  return realIP || cfConnectingIP || 'unknown';
}

export function rateLimit(req: NextRequest, limit: number = 100, windowMs: number = 15 * 60 * 1000) {
  const clientIP = getClientIP(req);
  const key = `${clientIP}-${req.nextUrl.pathname}`;
  const now = Date.now();

  const record = rateLimitCache.get(key);

  if (!record) {
    rateLimitCache.set(key, { count: 1, timestamp: now });
    return false; // Not limited
  }

  // Reset if window has passed
  if (now - record.timestamp > windowMs) {
    rateLimitCache.set(key, { count: 1, timestamp: now });
    return false; // Not limited
  }

  // Increment count
  record.count++;
  rateLimitCache.set(key, record);

  // Check if limit exceeded
  return record.count > limit;
}

export function middleware(request: NextRequest) {
  // File watcher is initialized via instrumentation.ts
  // We do NOT initialize it here to prevent performance issues on every request

  // Add comprehensive security headers
  const response = NextResponse.next();

  // Core security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy (adjust as needed for your app)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust based on your needs
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // HSTS header for production (forces HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Rate limiting for API routes - EXCEPT streaming endpoints
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // NO RATE LIMITING for streaming endpoints - smooth video requires many requests
    if (request.nextUrl.pathname.includes('/stream') ||
      request.nextUrl.pathname.includes('/download') ||
      request.nextUrl.pathname.includes('/preview')) {
      // Apply lighter rate limiting for streaming to prevent abuse
      if (rateLimit(request, 1000, 10 * 60 * 1000)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '600' } }
        );
      }
      return response;
    }

    let limit = 100; // Default limit
    let windowMs = 15 * 60 * 1000; // 15 minutes

    // More restrictive limits for sensitive endpoints
    if (request.nextUrl.pathname.includes('/auth/')) {
      limit = 50; // Moderate for auth endpoints (allows normal usage)
      windowMs = 10 * 60 * 1000; // 10 minutes
    } else if (request.nextUrl.pathname.includes('/upload/chunk')) {
      limit = 500; // High limit for chunk uploads (100MB chunks)
      windowMs = 10 * 60 * 1000; // 10 minutes
    } else if (request.nextUrl.pathname.includes('/upload')) {
      limit = 100; // Reasonable for upload init/finalize
      windowMs = 10 * 60 * 1000; // 10 minutes
    } else if (request.nextUrl.pathname.includes('/files')) {
      limit = 200; // Higher for file operations (not streaming)
      windowMs = 15 * 60 * 1000; // 15 minutes
    }

    if (rateLimit(request, limit, windowMs)) {
      const retryAfter = Math.ceil(windowMs / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};