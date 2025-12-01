import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { streamRateLimiter } from '@/lib/stream-rate-limiter';
import { streamConnectionPool } from '@/lib/stream-connection-pool';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get streaming statistics
    const connectionStats = streamConnectionPool.getStats();
    const currentTime = new Date().toISOString();

    const stats = {
      timestamp: currentTime,
      connections: connectionStats,
      rateLimiting: {
        // Rate limiter doesn't expose internal stats, but we can add a test
        status: 'active',
      },
      streaming: {
        chunkSizes: {
          preview: '5MB',
          stream: '2MB',
          storage: '256KB',
        },
        caching: {
          preview: '1 day + 1 week stale',
          stream: '1 hour + 1 day stale',
        },
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get streaming stats' },
      { status: 500 }
    );
  }
}