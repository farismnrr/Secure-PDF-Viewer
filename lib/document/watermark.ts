/**
 * Watermark utilities for applying text watermarks to images
 */

import sharp from 'sharp';
import { escapeXml } from '../utils';

// =============================================================================
// Types
// =============================================================================

export interface WatermarkInfo {
    ip?: string;
    timestamp?: string;
    sessionId?: string;
    requestId?: string;
    customText?: string;
}

// =============================================================================
// Watermark Functions
// =============================================================================

/**
 * Apply watermark to an image buffer
 */
export async function applyWatermark(
    imageBuffer: Buffer,
    info: WatermarkInfo,
    options: {
        opacity?: number;
        fontSize?: number;
        color?: string;
    } = {}
): Promise<Buffer> {
    const { opacity = 0.15, fontSize = 14, color = '#888888' } = options;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    const watermarkText = generateWatermarkText(info);

    if (!watermarkText) {
        return imageBuffer;
    }

    const svgWatermark = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark {
          font-family: monospace;
          font-size: ${fontSize}px;
          fill: ${color};
          opacity: ${opacity};
        }
      </style>
      <defs>
        <pattern id="watermarkPattern" x="0" y="0" width="400" height="100" patternUnits="userSpaceOnUse">
          <text x="0" y="50" class="watermark" transform="rotate(-30, 200, 50)">${escapeXml(watermarkText)}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermarkPattern)"/>
    </svg>
  `;

    return image
        .composite([{ input: Buffer.from(svgWatermark), gravity: 'center' }])
        .png()
        .toBuffer();
}

/**
 * Generate watermark text from info
 */
export function generateWatermarkText(info: WatermarkInfo): string {
    const parts: string[] = [];
    if (info.ip) parts.push(`IP: ${info.ip}`);
    if (info.timestamp) parts.push(`Time: ${info.timestamp}`);
    if (info.sessionId) parts.push(`Session: ${info.sessionId.substring(0, 8)}`);
    if (info.requestId) parts.push(`Req: ${info.requestId.substring(0, 8)}`);
    if (info.customText) parts.push(info.customText);
    return parts.join(' | ');
}
