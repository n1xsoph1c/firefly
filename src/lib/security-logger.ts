// Security event logging utility
// In production, this should send logs to a SIEM or monitoring service

export enum SecurityEventType {
    FAILED_LOGIN = 'failed_login',
    ACCOUNT_LOCKOUT = 'account_lockout',
    SUCCESSFUL_LOGIN = 'successful_login',
    PATH_TRAVERSAL_ATTEMPT = 'path_traversal_attempt',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    INVALID_TOKEN = 'invalid_token',
    UNAUTHORIZED_ACCESS = 'unauthorized_access',
    SUSPICIOUS_UPLOAD = 'suspicious_upload',
    IDOR_ATTEMPT = 'idor_attempt',
}

export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: Date;
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: Record<string, any>;
}

class SecurityLogger {
    private events: SecurityEvent[] = [];
    private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

    log(event: Omit<SecurityEvent, 'timestamp'>): void {
        const fullEvent: SecurityEvent = {
            ...event,
            timestamp: new Date(),
        };

        this.events.push(fullEvent);

        // Keep only recent events in memory
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS);
        }

        // Log to console (in production, send to SIEM/monitoring service)
        const logLevel = this.getLogLevel(event.type);
        const message = this.formatLogMessage(fullEvent);

        switch (logLevel) {
            case 'error':
                console.error(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            default:
                console.log(message);
        }

        // In production, you would also:
        // - Send to external logging service (e.g., Datadog, Splunk, ELK)
        // - Store in database for audit trail
        // - Trigger alerts for critical events
    }

    private getLogLevel(type: SecurityEventType): 'error' | 'warn' | 'info' {
        const criticalEvents = [
            SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
            SecurityEventType.IDOR_ATTEMPT,
            SecurityEventType.ACCOUNT_LOCKOUT,
        ];

        const warningEvents = [
            SecurityEventType.FAILED_LOGIN,
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            SecurityEventType.UNAUTHORIZED_ACCESS,
        ];

        if (criticalEvents.includes(type)) {
            return 'error';
        }
        if (warningEvents.includes(type)) {
            return 'warn';
        }
        return 'info';
    }

    private formatLogMessage(event: SecurityEvent): string {
        const parts = [
            `[SECURITY]`,
            `[${event.type}]`,
            event.userId ? `User: ${event.userId}` : null,
            event.ip ? `IP: ${event.ip}` : null,
            event.details ? `Details: ${JSON.stringify(event.details)}` : null,
        ].filter(Boolean);

        return parts.join(' ');
    }

    getRecentEvents(limit: number = 100): SecurityEvent[] {
        return this.events.slice(-limit);
    }

    getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
        return this.events
            .filter((e) => e.type === type)
            .slice(-limit);
    }

    getEventsByUser(userId: string, limit: number = 100): SecurityEvent[] {
        return this.events
            .filter((e) => e.userId === userId)
            .slice(-limit);
    }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

// Helper functions for common security events
export function logFailedLogin(email: string, ip?: string, userAgent?: string) {
    securityLogger.log({
        type: SecurityEventType.FAILED_LOGIN,
        ip,
        userAgent,
        details: { email },
    });
}

export function logSuccessfulLogin(userId: string, email: string, ip?: string, userAgent?: string) {
    securityLogger.log({
        type: SecurityEventType.SUCCESSFUL_LOGIN,
        userId,
        ip,
        userAgent,
        details: { email },
    });
}

export function logAccountLockout(email: string, ip?: string) {
    securityLogger.log({
        type: SecurityEventType.ACCOUNT_LOCKOUT,
        ip,
        details: { email },
    });
}

export function logPathTraversal(path: string, userId?: string, ip?: string) {
    securityLogger.log({
        type: SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
        userId,
        ip,
        details: { attemptedPath: path },
    });
}

export function logRateLimitExceeded(endpoint: string, ip?: string) {
    securityLogger.log({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        ip,
        details: { endpoint },
    });
}

export function logUnauthorizedAccess(resourceId: string, userId?: string, ip?: string) {
    securityLogger.log({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        userId,
        ip,
        details: { resourceId },
    });
}

export function logIDORAttempt(resourceType: string, resourceId: string, userId: string, ip?: string) {
    securityLogger.log({
        type: SecurityEventType.IDOR_ATTEMPT,
        userId,
        ip,
        details: { resourceType, resourceId },
    });
}
