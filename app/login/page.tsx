/**
 * Admin Login Page (Server Component)
 * Fetches runtime environment variables and renders the client form.
 */

import { Suspense } from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

function LoginFormFallback() {
  return (
    <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-muted animate-pulse w-16 h-16" />
        </div>
        <div className="h-8 bg-muted rounded w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/2 mx-auto animate-pulse mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-11 bg-muted rounded w-full animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function AdminLoginPage() {
  // Read from runtime environment (server-side)
  const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  if (!ssoUrl) {
    throw new Error('NEXT_PUBLIC_SSO_URL must be configured');
  }
  if (!tenantId) {
    throw new Error('NEXT_PUBLIC_TENANT_ID must be configured');
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 text-foreground"
      style={{
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        backgroundImage: 'radial-gradient(ellipse at top, #1e293b, #0a0a0a, #000000)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%'
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #4f4f4f2e 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f2e 1px, transparent 1px)',
          backgroundSize: '14px 24px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}
      />

      <div className="relative z-10 w-full max-w-md" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem' }}>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm ssoUrl={ssoUrl} tenantId={tenantId} />
        </Suspense>
      </div>
    </div>
  );
}
