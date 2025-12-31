/**
 * Rate limiting service (In-Memory)
 */

import { getRateLimitConfig, type RateLimitConfig } from '../config';

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

// =============================================================================
// In-Memory Store
// =============================================================================

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.windowStart + 60000) {
            rateLimitStore.delete(key);
        }
    }
}, CLEANUP_INTERVAL).unref();

// =============================================================================
// Rate Limit Functions
// =============================================================================

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(
    ip: string,
    endpoint: string,
    config?: RateLimitConfig
): RateLimitResult {
    const cfg = config || getRateLimitConfig();
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - cfg.windowMs;

    let entry = rateLimitStore.get(key);

    if (!entry || entry.windowStart < windowStart) {
        entry = { count: 1, windowStart: now };
        rateLimitStore.set(key, entry);
        return {
            allowed: true,
            remaining: cfg.maxRequests - 1,
            resetAt: new Date(now + cfg.windowMs)
        };
    }

    if (entry.count >= cfg.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(entry.windowStart + cfg.windowMs)
        };
    }

    entry.count++;
    return {
        allowed: true,
        remaining: cfg.maxRequests - entry.count,
        resetAt: new Date(entry.windowStart + cfg.windowMs)
    };
}

/**
 * Reset rate limit for an IP
 */
export function resetRateLimit(ip: string, endpoint?: string): void {
    if (endpoint) {
        rateLimitStore.delete(`${ip}:${endpoint}`);
    } else {
        for (const key of rateLimitStore.keys()) {
            if (key.startsWith(`${ip}:`)) {
                rateLimitStore.delete(key);
            }
        }
    }
}

/**
 * Clear all rate limits
 */
export function clearAllRateLimits(): void {
    rateLimitStore.clear();
}

/**
 * Get rate limit info for an IP
 */
export function getRateLimitInfo(
    ip: string,
    endpoint: string,
    config?: RateLimitConfig
): RateLimitResult | null {
    const cfg = config || getRateLimitConfig();
    const key = `${ip}:${endpoint}`;
    const entry = rateLimitStore.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (entry.windowStart + cfg.windowMs < now) {
        return null;
    }

    return {
        allowed: entry.count < cfg.maxRequests,
        remaining: Math.max(0, cfg.maxRequests - entry.count),
        resetAt: new Date(entry.windowStart + cfg.windowMs)
    };
}
