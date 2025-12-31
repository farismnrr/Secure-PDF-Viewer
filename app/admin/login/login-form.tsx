/**
 * Admin Login Form Component
 * Handles the client-side interaction
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";

interface LoginFormProps {
    ssoUrl: string;
    tenantId: string;
}

export function LoginForm({ ssoUrl, tenantId }: LoginFormProps) {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const error = searchParams.get('error');
    const redirect = searchParams.get('redirect') || '/admin';

    const handleLogin = () => {
        setIsLoading(true);

        // Store redirect destination for after login
        sessionStorage.setItem('sso_redirect', redirect);

        // Build callback URL
        const callbackUrl = `${window.location.origin}/admin/callback`;

        const loginUrl = new URL('/login', ssoUrl);
        loginUrl.searchParams.set('tenant_id', tenantId);
        loginUrl.searchParams.set('redirect_uri', callbackUrl);

        window.location.href = loginUrl.toString();
    };

    return (
        <Card
            className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl"
            style={{
                backgroundColor: 'rgba(20, 20, 25, 0.8)',
                backdropFilter: 'blur(20px)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: '1px',
                borderRadius: '0.75rem',
                padding: '0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
        >
            <CardHeader className="space-y-1 text-center" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div className="flex justify-center mb-6" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div
                        className="p-4 rounded-full bg-primary/10 ring-1 ring-primary/20 shadow-[0_0_20px_-5px_var(--color-primary)]"
                        style={{
                            padding: '1rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 0 20px -5px rgba(255, 255, 255, 0.3)'
                        }}
                    >
                        <Lock className="w-8 h-8 text-primary" style={{ width: '2rem', height: '2rem', color: '#ffffff' }} />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight" style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '-0.025em', color: '#fff', margin: 0 }}>Secure PDF Admin</CardTitle>
                <CardDescription className="text-base" style={{ fontSize: '1rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
                    Sign in to manage your secured documents
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                    <div
                        className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
                        style={{
                            padding: '0.75rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span className="text-lg">⚠️</span> {error}
                    </div>
                )}

                <Button
                    className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-primary/25 transition-all duration-300"
                    onClick={handleLogin}
                    disabled={isLoading}
                    size="lg"
                    style={{
                        width: '100%',
                        height: '2.75rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                    }}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" style={{ marginRight: '0.5rem', width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite' }} />
                            Redirecting...
                        </>
                    ) : (
                        "Sign in with SSO"
                    )}
                </Button>
            </CardContent>
            <CardFooter className="justify-center border-t border-border/50 pt-6 mt-2" style={{ justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem', paddingBottom: '1.5rem' }}>
                <p className="text-xs text-muted-foreground text-center" style={{ fontSize: '0.75rem', color: '#71717a', textAlign: 'center', margin: 0 }}>
                    Restricted access. Requires <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#fff', fontFamily: 'monospace', fontWeight: 500 }}>admin</code> role.
                </p>
            </CardFooter>
        </Card>
    );
}
