# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security Fixes - 2025-12-01

#### Authentication Hardening
- **CRITICAL**: Removed insecure JWT_SECRET fallback - application now fails fast if not set
- Added brute force protection with 5-attempt lockout for 15 minutes
- Implemented timing-safe password verification to prevent timing attacks
- Added minimum response time (200ms) to authentication to prevent timing analysis
- Enhanced JWT token verification with explicit algorithm specification (HS256)
- Sanitized user response objects to never expose internal fields
- Updated auth cookie to use `sameSite: 'strict'` for better CSRF protection
- Added request body size validation (10KB limit) to prevent DoS attacks
- Integrated security event logging for failed/successful login attempts

#### File Upload & Storage Security
- Expanded dangerous file extensions list from 13 to 30+ types
- Added multi-extension validation (checks ALL extensions in filenames like `.tar.gz`)
- Enhanced filename sanitization with null byte removal and control character filtering
- Added random hash suffix to filenames to prevent collision attacks
- **CRITICAL**: Fixed path traversal vulnerabilities with comprehensive validation
  - Added null byte detection
  - Implemented path normalization checks
  - Ensured all paths stay within UPLOAD_PATH boundary
- Protected all file operations (save, delete, read, path conversion) with validation
- Added filename validation to reject path separators and null bytes
- Implemented storage quota enforcement (250GB default per user)

#### Middleware & Rate Limiting
- **CRITICAL**: Fixed memory leak by replacing unbounded Map with LRU cache (5000 max entries)
- Improved IP detection with multi-source extraction and proxy support
- Added Content Security Policy (CSP) headers
- Added HTTP Strict Transport Security (HSTS) headers for production
- Reduced auth endpoint rate limit from 30 to 10 requests per 10 minutes
- Added light rate limiting to streaming endpoints (1000 req/10min) to prevent abuse
- Added Retry-After headers to all rate limit responses
- Enhanced rate limit error messages with retry timing information

#### API Route Security
- Added comprehensive input validation to file upload initialization
  - Filename validation (no path separators or null bytes)
  - Chunk count bounds checking (1-10,000)
  - File size validation (min 1 byte, max 60GB)
- Implemented IDOR protection with folder ownership verification
- Added chunk upload validation:
  - Bounds validation on chunk index
  - Negative index protection
  - Chunk size limits (max 100MB per chunk)
- Fixed share link race conditions with transaction-based access control
- Added DoS protection via query result limits:
  - Max 100 files per folder
  - Max 50 subfolders
  - Max 20 nested files
- Removed hardcoded fallback URLs in production

#### Database & Application Logic
- Added maximum depth limit (20 levels) to folder path resolution
- Prevents infinite loop DoS attacks from circular folder references
- Created comprehensive security logging utility (`security-logger.ts`)
  - Tracks 9 security event categories
  - Automatic severity classification
  - Memory-efficient storage (last 10,000 events)
  - Production-ready for SIEM integration

### Bug Fixes - 2025-12-01

#### Service Worker Critical Fixes
- **CRITICAL**: Fixed NextJS static files returning 404 NS_ERROR_FILE_CORRUPTED on soft refresh
  - Removed `/`, `/dashboard`, `/login` from service worker cache
  - Added `/_next/` bypass - never cache NextJS build artifacts
  - Changed navigation strategy to network-only (no HTML caching)
  - Updated cache version from v5 to v6
- **CRITICAL**: Fixed scrolling not working in mobile PWA
  - Replaced JavaScript touch event prevention with CSS `touch-action: pan-x pan-y`
  - Removed problematic `touchend` event listener that blocked scrolling
  - Maintained zoom prevention (pinch and double-tap) without blocking scroll
- Fixed cache version mismatch in console logs (v3 vs v5)

### Changed
- Service worker caching strategy:
  - HTML pages: Network Only (was Cache First)
  - NextJS `/_next/`: Network Only (was cached)
  - API calls: Network First with 10MB size limit
  - Static assets: Cache First with stale-while-revalidate

### Added
- New security logging module (`src/lib/security-logger.ts`)
- Path validation function in storage module
- Brute force protection tracking in auth module
- Storage quota enforcement
- Comprehensive security headers (CSP, HSTS)

### Technical Debt Addressed
- Fixed in-memory rate limiting memory leak
- Improved error handling across API routes
- Enhanced type safety in rate limiting module
- Consistent cache versioning

---

## Summary

**Total Fixes**: 44+ security vulnerabilities and 3 critical bugs
**Files Modified**: 15 files
**New Files**: 1 (security-logger.ts)
**Build Status**: ✅ Passing

### Impact
- 🔒 Production-ready security posture
- ✅ NextJS soft refresh now works without 404 errors
- ✅ Mobile PWA scrolling fully functional
- ✅ Comprehensive audit trail for security events
- ✅ Protection against common web vulnerabilities (XSS, CSRF, path traversal, timing attacks, brute force, DoS)
