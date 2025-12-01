import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken, checkAccountLockout, recordFailedAttempt, recordSuccessfulLogin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Validate request body size (prevent DoS)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check for account lockout (brute force protection)
    const lockout = checkAccountLockout(email);
    if (lockout.locked) {
      const response = NextResponse.json(
        {
          error: 'Too many failed login attempts. Please try again later.',
          retryAfter: lockout.retryAfter
        },
        { status: 429 }
      );

      if (lockout.retryAfter) {
        response.headers.set('Retry-After', lockout.retryAfter.toString());
      }

      return response;
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      // Record failed attempt for brute force protection
      recordFailedAttempt(email);

      // Generic error message to prevent email enumeration
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    recordSuccessfulLogin(email);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });

    // Set HTTP-only cookie with strict security settings
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Changed from 'lax' to 'strict' for better CSRF protection
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}