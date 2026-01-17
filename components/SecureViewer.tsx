'use client';

/**
 * Secure Viewer - displays document pages with watermark and security features
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import WatermarkOverlay from './WatermarkOverlay';

interface SecureViewerProps {
    docId: string;
    nonce: string;
    sessionId: string;
    title: string;
    totalPages: number;
    clientIp?: string;
}

export default function SecureViewer({
    docId,
    nonce,
    sessionId,
    title,
    totalPages,
    clientIp
}: SecureViewerProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [loadedPages, setLoadedPages] = useState<Map<number, string>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const fetchingRef = useRef<Set<number>>(new Set());

    // Hydration fix: only set timestamp on client
    const [timestamp, setTimestamp] = useState<string>('');

    useEffect(() => {
        setTimestamp(new Date().toISOString());
    }, []);

    const loadPage = useCallback(async (pageNum: number) => {
        // Prevent double fetch using ref (synchronous check) implies strict mode safety
        if (loadedPages.has(pageNum) || fetchingRef.current.has(pageNum)) {
            return;
        }

        fetchingRef.current.add(pageNum);

        try {
            const response = await fetch(`/api/docs/${docId}/pages/${pageNum}?nonce=${nonce}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load page');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            setLoadedPages(prev => new Map(prev).set(pageNum, url));
        } catch (err) {
            // console.error(`Error loading page ${pageNum}:`, err);
            // Only set error if it's the first page (critical)
            if (pageNum === 1) {
                setError(err instanceof Error ? err.message : 'Failed to load page');
            }
        } finally {
            fetchingRef.current.delete(pageNum);
        }
    }, [docId, nonce, loadedPages]);

    // Load current page and prefetch adjacent pages
    useEffect(() => {
        loadPage(currentPage);

        // Prefetch next page ONLY after page 1 (session creator) is loaded
        if (currentPage < totalPages && loadedPages.has(1)) {
            loadPage(currentPage + 1);
        }
    }, [currentPage, totalPages, loadPage, loadedPages]);

    // Load first page on mount
    useEffect(() => {
        loadPage(1);
    }, [loadPage]);

    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, [totalPages]);

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
    const handleZoomReset = () => setZoom(1);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                goToPage(currentPage + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                goToPage(currentPage - 1);
            } else if (e.key === 'Home') {
                goToPage(1);
            } else if (e.key === 'End') {
                goToPage(totalPages);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, totalPages, goToPage]);

    if (error) {
        return (
            <div className="viewer-error">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => { setError(null); loadPage(currentPage); }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="secure-viewer" ref={containerRef}>
            {/* Header */}
            <header className="viewer-header">
                <h1 className="doc-title">{title}</h1>
                <div className="viewer-controls">
                    <div className="zoom-controls">
                        <button onClick={handleZoomOut} title="Zoom Out">−</button>
                        <span>{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} title="Zoom In">+</button>
                        <button onClick={handleZoomReset} title="Reset Zoom">Reset</button>
                    </div>
                </div>
            </header>

            {/* Page display */}
            <main className="viewer-content">
                <div className="zoom-wrapper">
                    <div
                        className="page-container"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                    >
                        {loadedPages.has(currentPage) ? (
                            <Image
                                src={loadedPages.get(currentPage) || ''}
                                alt={`Page ${currentPage}`}
                                className="page-image"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                width={800}
                                height={1100}
                                unoptimized
                                style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
                            />
                        ) : (
                            <div className="page-skeleton">
                                <div className="skeleton-content">
                                    <div className="spinner" />
                                    <p>Loading page {currentPage}...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Client-side watermark overlay */}
                <WatermarkOverlay
                    ip={clientIp}
                    timestamp={timestamp}
                    sessionId={sessionId}
                />
            </main>

            {/* Footer navigation */}
            <footer className="viewer-footer">
                <div className="page-nav">
                    <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        title="First Page"
                    >
                        ⏮
                    </button>
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        title="Previous Page"
                    >
                        ◀
                    </button>
                    <span className="page-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        title="Next Page"
                    >
                        ▶
                    </button>
                    <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last Page"
                    >
                        ⏭
                    </button>
                </div>
                <div className="session-info">
                    Session: {sessionId.substring(0, 8)}
                </div>
            </footer>
        </div>
    );
}
