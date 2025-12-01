import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import rateLimit from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per second
});

export async function GET(request: NextRequest) {
  try {
    // Rate limit based on IP
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    try {
      await limiter.check(100, ip + '-auth-me'); // 100 requests per minute
    } catch {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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

    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}