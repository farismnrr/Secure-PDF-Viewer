'use client';

/**
 * AI-Resistant Watermark Overlay
 * Multi-layer defense against AI watermark removal:
 * - Tiled pattern (forces AI to reconstruct large areas)
 * - Random rotations and positions
 * - Complex textures and gradients
 * - Noise patterns to confuse AI detection
 */

import { useState } from 'react';

interface WatermarkOverlayProps {
    ip?: string;
    timestamp?: string;
    sessionId?: string;
    customText?: string;
}

export default function WatermarkOverlay({ ip, timestamp, sessionId, customText }: WatermarkOverlayProps) {
    // Generate watermark text
    const parts: string[] = [];
    if (ip) parts.push(`IP: ${ip}`);
    if (timestamp) parts.push(new Date(timestamp).toLocaleString());
    if (sessionId) parts.push(`Session: ${sessionId.substring(0, 8)}`);
    if (customText) parts.push(customText);

    const watermarkText = parts.join(' | ') || 'CONFIDENTIAL';

    // Generate tiled watermark grid with random variations
    // Use useState to generate random values once on mount (proper fix for purity)
    const [watermarkTiles] = useState(() => {
        const tiles = [];
        const rows = 8; // Increased density
        const cols = 6;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Random rotation between -35° and -25° for each tile
                const rotation = -30 + (Math.random() * 10 - 5);

                // Random opacity variation (0.04 to 0.09)
                const opacity = 0.065 + (Math.random() * 0.025 - 0.0125);

                // Random position offset within grid cell
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;

                tiles.push({
                    id: `${row}-${col}`,
                    top: `${(row / rows) * 100}%`,
                    left: `${(col / cols) * 100}%`,
                    rotation,
                    opacity,
                    offsetX,
                    offsetY,
                });
            }
        }
        return tiles;
    });

    return (
        <>
            {/* Noise overlay layer */}
            <div className="watermark-noise-layer" aria-hidden="true" />

            {/* Gradient overlay layer */}
            <div className="watermark-gradient-layer" aria-hidden="true" />

            {/* Tiled watermark layer */}
            <div className="watermark-overlay-container" aria-hidden="true">
                {watermarkTiles.map((tile) => (
                    <div
                        key={tile.id}
                        className="watermark-tile"
                        style={{
                            top: tile.top,
                            left: tile.left,
                            transform: `translate(${tile.offsetX}px, ${tile.offsetY}px) rotate(${tile.rotation}deg)`,
                            opacity: tile.opacity,
                        }}
                    >
                        <div className="watermark-text">
                            {watermarkText}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
