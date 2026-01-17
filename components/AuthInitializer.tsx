'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth';

/**
 * AuthInitializer component
 * Handles silent refresh on application mount/reload
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const initialize = useAuthStore((state) => state.initialize);
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            initialize().catch(err => {
                // console.error('Auth initialization failed:', err);
            });
        }
    }, [initialize]);

    return <>{children}</>;
}
