import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import crypto from 'crypto';

// SECURITY: No fallback to insecure defaults - fail fast if not configured
if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable must be set. Generate a secure secret with: openssl rand -base64 32');
}

const JWT_SECRET = process.env.JWT_SECRET as string;

// In-memory store for failed login attempts (use Redis in production)
const failedAttempts = new Map<string, { count: number; lockoutUntil?: number }>();

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  // Use cost factor 12 for strong password hashing
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // bcrypt.compare is already timing-safe
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  // Sign with 7-day expiration
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });

    const payload = decoded as JWTPayload;

    // Additional expiration validation
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    // Log token verification failures for security monitoring
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid token signature');
    }
    return null;
  }
}

// Brute force protection
export function checkAccountLockout(identifier: string): { locked: boolean; retryAfter?: number } {
  const attempts = failedAttempts.get(identifier);

  if (!attempts) {
    return { locked: false };
  }

  // Check if account is locked
  if (attempts.lockoutUntil && attempts.lockoutUntil > Date.now()) {
    const retryAfter = Math.ceil((attempts.lockoutUntil - Date.now()) / 1000);
    return { locked: true, retryAfter };
  }

  // Reset if lockout expired
  if (attempts.lockoutUntil && attempts.lockoutUntil <= Date.now()) {
    failedAttempts.delete(identifier);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedAttempt(identifier: string): void {
  const attempts = failedAttempts.get(identifier) || { count: 0 };
  attempts.count += 1;

  // Lock account after 5 failed attempts for 15 minutes
  if (attempts.count >= 5) {
    attempts.lockoutUntil = Date.now() + (15 * 60 * 1000);
    console.warn(`Account locked due to failed login attempts: ${identifier}`);
  }

  failedAttempts.set(identifier, attempts);

  // Cleanup old entries (older than 1 hour)
  if (failedAttempts.size > 1000) {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, value] of failedAttempts.entries()) {
      if (!value.lockoutUntil || value.lockoutUntil < oneHourAgo) {
        failedAttempts.delete(key);
      }
    }
  }
}

export function recordSuccessfulLogin(identifier: string): void {
  // Clear failed attempts on successful login
  failedAttempts.delete(identifier);
}

export async function createAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || process.env.ADMIN_USERNAME || 'Administrator';

  if (!adminEmail || !adminPassword) {
    console.log('Admin credentials not provided in environment variables. Skipping admin creation.');
    return;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        username: adminName,
        isAdmin: true,
      }
    });
    console.log(`Admin user created: ${adminEmail} (${adminName})`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }
}

export async function authenticateUser(email: string, password: string) {
  // Timing-safe authentication - always take similar time regardless of outcome
  const startTime = Date.now();

  const user = await prisma.user.findUnique({
    where: { email }
  });

  let isValid = false;

  if (user) {
    isValid = await verifyPassword(password, user.password);
  } else {
    // Perform a dummy hash comparison to prevent timing attacks
    // This ensures similar execution time whether user exists or not
    await bcrypt.compare(password, '$2a$12$' + 'X'.repeat(53));
  }

  // Ensure minimum response time of 200ms to prevent timing attacks
  const elapsedTime = Date.now() - startTime;
  if (elapsedTime < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - elapsedTime));
  }

  if (!user || !isValid) {
    return null;
  }

  // Sanitize user object - never expose password hash or internal fields
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  };
}