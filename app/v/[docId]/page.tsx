'use client';

/**
 * Viewer Page - /v/[docId]
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import FullscreenGuard from '@/components/FullscreenGuard';
import SecureViewer from '@/components/SecureViewer';
import PasswordPrompt from '@/components/PasswordPrompt';

interface DocInfo {
    docId: string;
    title: string;
    pageCount: number;
    sessionId: string;
}

export default function ViewerPage() {
    const params = useParams();
    const docId = params.docId as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [docInfo, setDocInfo] = useState<DocInfo | null>(null);
    const [clientIp, setClientIp] = useState<string | undefined>();
    const [requiresPassword, setRequiresPassword] = useState(false);
    // Track if we already minted to prevent loop
    const [isMinted, setIsMinted] = useState(false);

    const initViewer = useCallback(async (password?: string) => {
        // Prevent re-init if already successful
        if (isMinted && !password) return;

        try {
            setLoading(true);
            setError(null);

            // Step 1: Mint nonce (with optional password)
            const mintResponse = await fetch('/api/nonces/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId, password })
            });

            if (!mintResponse.ok) {
                const errorData = await mintResponse.json();

                // Check if password required
                if (mintResponse.status === 401 && errorData.requiresPassword) {
                    setRequiresPassword(true);
                    setLoading(false);
                    return;
                }

                throw new Error(errorData.error || 'Failed to initialize viewer');
            }

            // Success - we have nonce
            const mintData = await mintResponse.json();
            setNonce(mintData.nonce);
            setSessionId(mintData.sessionId);
            setRequiresPassword(false);
            setIsMinted(true);

            // Step 2: Get document info
            // Pass nonce for validation
            const infoResponse = await fetch(`/api/docs/${docId}/info`, {
                headers: { 'X-Nonce': mintData.nonce }
            });

            if (!infoResponse.ok) {
                const errorData = await infoResponse.json();
                throw new Error(errorData.error || 'Failed to load document info');
            }

            const info = await infoResponse.json();
            setDocInfo(info);

            // Step 3: Get IP (optional)
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                setClientIp(ipData.ip);
            } catch {
                // Ignore IP error
            }

        } catch (err) {
            console.error('Viewer init error:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize viewer');
        } finally {
            // Only stop loading if we are NOT waiting for password
            // If we are waiting for password, loading is false anyway (set above)
            // If success, loading is false
            setLoading(false);
        }
    }, [docId, isMinted]);

    useEffect(() => {
        if (docId && !isMinted) {
            initViewer();
        }
    }, [docId, isMinted, initViewer]);

    const handlePasswordSubmit = async (password: string) => {
        await initViewer(password);
    };

    const handleFullscreenExit = () => {
        // No-op
    };

    if (loading) {
        return (
            <div className="viewer-loading">
                <div className="loading-content">
                    <div className="spinner large" />
                    <p>Loading secure viewer...</p>
                </div>
            </div>
        );
    }

    // Password Prompt Screen
    if (requiresPassword) {
        return (
            <PasswordPrompt
                title={docInfo?.title} // Might not have title yet if we hit 401 first, that's fine
                onSubmit={handlePasswordSubmit}
                error={error}
            />
        );
    }


    if (error) {
        return (
            <div className="viewer-error-page">
                <div className="error-content">
                    <h1>⚠️ Error</h1>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!nonce || !sessionId || !docInfo) {
        return null; // Should not happen if loading/error handled
    }

    return (
        <FullscreenGuard onFullscreenExit={handleFullscreenExit}>
            <SecureViewer
                docId={docId}
                nonce={nonce}
                sessionId={sessionId}
                title={docInfo.title}
                totalPages={docInfo.pageCount}
                clientIp={clientIp}
            />
        </FullscreenGuard>
    );
}
