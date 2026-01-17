'use client';

/**
 * Fullscreen Guard - enforces fullscreen mode and blurs content when exited
 */

import { useState, useEffect, useCallback, ReactNode } from 'react';

interface FullscreenGuardProps {
    children: ReactNode;
    onFullscreenExit?: () => void;
}

export default function FullscreenGuard({ children, onFullscreenExit }: FullscreenGuardProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
    const [showPrompt, setShowPrompt] = useState(true);

    const enterFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
            setHasEnteredFullscreen(true);
            setShowPrompt(false);
        } catch (err) {
            // console.error('Failed to enter fullscreen:', err);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isNowFullscreen);

            if (!isNowFullscreen && hasEnteredFullscreen) {
                onFullscreenExit?.();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [hasEnteredFullscreen, onFullscreenExit]);

    // Block common shortcuts and screenshots
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Ctrl+S, Ctrl+P, Ctrl+Shift+S, PrintScreen
            // Block Win+Shift+S (Meta+Shift+S) - Snip & Sketch
            const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44;
            const isSnipTool = e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S');
            const isSaveOrPrint = e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P');

            if (isPrintScreen || isSnipTool || isSaveOrPrint) {
                e.preventDefault();
                e.stopPropagation();

                // Attempt to clear clipboard (re-suppress errors)
                navigator.clipboard.writeText('').catch(() => { });

                // VISUAL PENALTY: Synchronously hide everything immediately
                // This attempts to beat the OS screenshot capture by removing content from the render tree instantly
                if (isPrintScreen || isSnipTool) {
                    const appRoot = document.querySelector('.secure-viewer') as HTMLElement;
                    if (appRoot) {
                        appRoot.style.filter = 'blur(50px) grayscale(100%)';
                        appRoot.style.opacity = '0';
                    }
                    // Also hide body as fallback
                    document.body.style.visibility = 'hidden';

                    // Use setTimeout to allow the blur overlay to render before showing body again
                    setTimeout(() => {
                        document.body.style.visibility = 'visible';
                        if (appRoot) {
                            appRoot.style.filter = 'none';
                            appRoot.style.opacity = '1';
                        }
                    }, 500); // Short delay to ensure screenshot captures black/nothing

                    setIsFullscreen(false);
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Also catch PrintScreen on keyup as some systems swallow keydown
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
                navigator.clipboard.writeText('').catch(() => { });
                setIsFullscreen(false);
            }
        }

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // Aggressive: Blur when window loses focus (e.g. Snipping Tool overlay, Alt+Tab, or even clicking browser chrome)
        const handleBlur = () => {
            // Immediately force exit fullscreen to trigger protection overlay
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
                setIsFullscreen(false);
            }
        };

        const handleFocus = () => {
            // Optional: Auto-prompt could go here, but better to let user manually re-enter
        };

        // Visibility change (switching tabs)
        const handleVisibilityChange = () => {
            if (document.hidden && document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
                setIsFullscreen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('keyup', handleKeyUp, true);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    if (showPrompt) {
        return (
            <div className="fullscreen-prompt">
                <div className="prompt-content">
                    <div className="lock-icon">🔒</div>
                    <h2>Secure Document Viewer</h2>
                    <p>This document requires fullscreen mode for security.</p>
                    <button
                        onClick={enterFullscreen}
                        className="mt-6 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-3 mx-auto shadow-sm active:scale-95"
                    >
                        <span className="text-xl">🛡️</span>
                        Enter Secure View
                    </button>
                    <p className="security-note">
                        • Right-click disabled<br />
                        • Print/Save blocked<br />
                        • Content is watermarked
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`fullscreen-container ${!isFullscreen && hasEnteredFullscreen ? 'blurred' : ''}`}>
            {children}
            {!isFullscreen && hasEnteredFullscreen && (
                <div className="blur-overlay">
                    <div className="blur-message">
                        <p>⚠️ Fullscreen mode required</p>
                        <button
                            onClick={enterFullscreen}
                            className="reenter-btn px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2 mx-auto active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                            Re-enter Fullscreen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
