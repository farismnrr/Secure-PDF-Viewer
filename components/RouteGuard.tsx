'use client';

import { useAuthStore } from '@/lib/store/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * RouteGuard component
 * Protects children from unauthorized access by redirecting to login
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isInitializing } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isInitializing && !isAuthenticated) {
            // Store intended destination
            const redirectParams = new URLSearchParams();
            redirectParams.set('redirect', pathname);

            router.push(`/login?${redirectParams.toString()}`);
        }
    }, [isAuthenticated, isInitializing, router, pathname]);

    if (isInitializing) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect in useEffect
    }

    return <>{children}</>;
}
