// Simple in-memory rate limiter for streaming endpoints
// In production, use Redis or a proper rate limiting service
// NOTE: Streaming should have minimal rate limiting for smooth video playback

interface RateLimit {
  count: number;
  resetTime: number;
}

class StreamRateLimiter {
  private limits = new Map<string, RateLimit>();
  private readonly maxRequests = 10000; // Very high limit for streaming (effectively unlimited)
  private readonly windowMs = 60 * 1000; // 1 minute window

  private getKey(userId: string, fileId: string): string {
    return `${userId}:${fileId}`;
  }

  isAllowed(userId: string, fileId: string): boolean {
    // For video streaming, we want minimal restrictions
    // Only block if there are excessive requests (potential abuse)
    const key = this.getKey(userId, fileId);
    const now = Date.now();
    
    const limit = this.limits.get(key);
    
    if (!limit || now > limit.resetTime) {
      // Create new or reset expired limit
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }
    
    if (limit.count >= this.maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  getRemainingRequests(userId: string, fileId: string): number {
    const key = this.getKey(userId, fileId);
    const limit = this.limits.get(key);
    
    if (!limit || Date.now() > limit.resetTime) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - limit.count);
  }
}

// Export singleton instance
export const streamRateLimiter = new StreamRateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  streamRateLimiter.cleanup();
}, 5 * 60 * 1000);