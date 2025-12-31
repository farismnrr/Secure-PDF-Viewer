/**
 * Unit tests for rate limiting
 */

import { checkRateLimit, resetRateLimit, getRateLimitInfo, clearAllRateLimits } from '../services/rate-limiter';
// Removed db imports as we are no longer using SQLite for rate limiting

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Reset rate limits for clean test state
        clearAllRateLimits();
    });

    const testConfig = { maxRequests: 5, windowMs: 60000 };

    describe('checkRateLimit', () => {
        it('should allow requests within limit', () => {
            const result = checkRateLimit('192.168.1.1', '/api/test', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('should track remaining requests correctly', () => {
            const ip = '192.168.1.2';

            checkRateLimit(ip, '/api/test', testConfig); // Remaining: 4
            checkRateLimit(ip, '/api/test', testConfig); // Remaining: 3
            const result = checkRateLimit(ip, '/api/test', testConfig); // Remaining: 2

            expect(result.remaining).toBe(2);
        });

        it('should block requests after limit is reached', () => {
            const ip = '192.168.1.3';

            // Use all 5 requests
            for (let i = 0; i < 5; i++) {
                checkRateLimit(ip, '/api/test', testConfig);
            }

            // 6th request should be blocked
            const result = checkRateLimit(ip, '/api/test', testConfig);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should track different endpoints separately', () => {
            const ip = '192.168.1.4';

            // Use all 5 requests on endpoint 1
            for (let i = 0; i < 5; i++) {
                checkRateLimit(ip, '/api/endpoint1', testConfig);
            }

            // Endpoint 2 should still have full quota
            const result = checkRateLimit(ip, '/api/endpoint2', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('should track different IPs separately', () => {
            // Use all 5 requests for IP 1
            for (let i = 0; i < 5; i++) {
                checkRateLimit('192.168.1.5', '/api/test', testConfig);
            }

            // IP 2 should still have full quota
            const result = checkRateLimit('192.168.1.6', '/api/test', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });
    });

    describe('resetRateLimit', () => {
        it('should reset rate limit for specific endpoint', () => {
            const ip = '192.168.1.7';

            // Use all requests
            for (let i = 0; i < 5; i++) {
                checkRateLimit(ip, '/api/test', testConfig);
            }

            // Should be blocked
            expect(checkRateLimit(ip, '/api/test', testConfig).allowed).toBe(false);

            // Reset
            resetRateLimit(ip, '/api/test');

            // Should be allowed again
            const result = checkRateLimit(ip, '/api/test', testConfig);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('should reset all endpoints for an IP', () => {
            const ip = '192.168.1.8';

            // Use requests on multiple endpoints
            for (let i = 0; i < 5; i++) {
                checkRateLimit(ip, '/api/test1', testConfig);
                checkRateLimit(ip, '/api/test2', testConfig);
            }

            // Reset all
            resetRateLimit(ip);

            // Both should be allowed
            expect(checkRateLimit(ip, '/api/test1', testConfig).allowed).toBe(true);
            expect(checkRateLimit(ip, '/api/test2', testConfig).allowed).toBe(true);
        });
    });

    describe('getRateLimitInfo', () => {
        it('should return null for non-existent entry', () => {
            const result = getRateLimitInfo('192.168.1.99', '/api/none');
            expect(result).toBeNull();
        });

        it('should return info for existing entry', () => {
            const ip = '192.168.1.9';
            const endpoint = '/api/test-info';

            // Make exactly 2 requests
            checkRateLimit(ip, endpoint, testConfig);
            checkRateLimit(ip, endpoint, testConfig);

            const info = getRateLimitInfo(ip, endpoint, testConfig);

            expect(info).not.toBeNull();
            expect(info?.remaining).toBe(3); // 5 - 2 = 3
            expect(info?.allowed).toBe(true);
        });
    });
});
