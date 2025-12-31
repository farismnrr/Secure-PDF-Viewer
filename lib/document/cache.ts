
/**
 * In-memory cache for decrypted document buffers
 * Prevents repeated disk read + decryption for every page request
 */

interface CacheEntry {
    buffer: Buffer;
    lastAccessed: number;
}

// Global cache storage
const documentCache = new Map<string, CacheEntry>();

// Configuration
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB soft limit per doc, or total? Let's just limit entry count for now.
const MAX_ENTRIES = 20;

/**
 * Get document buffer from cache or load it
 */
export async function getCachedDocument(
    docId: string,
    loader: () => Promise<Buffer>
): Promise<Buffer> {
    const now = Date.now();
    const entry = documentCache.get(docId);

    // Hit
    if (entry) {
        // Refresh TTL
        entry.lastAccessed = now;
        return entry.buffer;
    }

    // Miss - Load data
    const buffer = await loader();

    // Store in cache
    cleanupCache(); // Make space if needed
    documentCache.set(docId, {
        buffer,
        lastAccessed: now
    });

    return buffer;
}

/**
 * Remove old entries
 */
function cleanupCache() {
    // If we're under limit, do nothing (simple check)
    if (documentCache.size <= MAX_ENTRIES) return;

    // Find oldest
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of documentCache.entries()) {
        if (entry.lastAccessed < oldestTime) {
            oldestTime = entry.lastAccessed;
            oldestId = id;
        }
    }

    if (oldestId) {
        documentCache.delete(oldestId);
    }
}

/**
 * Clear specific document from cache (e.g. on update)
 */
export function invalidateCache(docId: string) {
    documentCache.delete(docId);
}
