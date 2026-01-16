/**
 * SSO Callback Page
 * Handles token extraction from URL hash after SSO login
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleCallback = useCallback(async () => {
    try {
      // Extract token from hash fragment
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Note: CSRF protection is handled by SSO validating redirect_uri
      // Refresh token cookie is set by SSO service (HttpOnly, Secure, SameSite=None)

      // Store token in sessionStorage for API calls
      sessionStorage.setItem('access_token', accessToken);

      // Clear URL hash for security
      window.history.replaceState(null, '', window.location.pathname);

      // Redirect to original destination or dashboard
      const redirect = sessionStorage.getItem('sso_redirect') || '/dashboard';
      sessionStorage.removeItem('sso_redirect');

      router.push(redirect);
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }, [router]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  if (error) {
    return (
      <div className="callback-container">
        <div className="callback-card error">
          <h1>⚠️ Authentication Failed</h1>
          <p>{error}</p>
          <button onClick={() => router.push('/login')}>
            Try Again
          </button>
        </div>

        <style jsx>{`
          .callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          }

          .callback-card {
            text-align: center;
            padding: 2rem;
            background: rgba(30, 41, 59, 0.8);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .callback-card.error {
            border-color: rgba(239, 68, 68, 0.3);
          }

          .callback-card h1 {
            color: #fca5a5;
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
          }

          .callback-card p {
            color: #94a3b8;
            margin-bottom: 1.5rem;
          }

          button {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          }

          button:hover {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="callback-container">
      <div className="callback-card">
        <div className="spinner"></div>
        <p>Authenticating...</p>
      </div>

      <style jsx>{`
        .callback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .callback-card {
          text-align: center;
          padding: 2rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(148, 163, 184, 0.2);
          border-top-color: #94a3b8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        p {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
