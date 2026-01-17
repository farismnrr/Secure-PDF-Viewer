import path from 'path';

/**
 * Get absolute path to a file in storage
 * This utility anchors paths to the 'storage' directory to fix 
 * Next.js/Turbopack "overly broad patterns" build warnings.
 * 
 * @param encryptedPath Path relative to project root (e.g. 'storage/user/file.enc')
 * @returns Absolute path (e.g. '/app/storage/user/file.enc')
 */
export function getStoragePath(encryptedPath: string): string {
    const storageDir = path.join(process.cwd(), 'storage');

    // Remove 'storage/' prefix if present to avoid double 'storage' segments
    const relativePath = encryptedPath.startsWith('storage/')
        ? encryptedPath.substring(8)
        : encryptedPath;

    return path.join(storageDir, relativePath);
}
