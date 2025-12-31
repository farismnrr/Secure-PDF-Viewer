'use client';

import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

interface PasswordPromptProps {
    title?: string;
    onSubmit: (password: string) => Promise<void>;
    error?: string | null;
}

export default function PasswordPrompt({ title, onSubmit, error }: PasswordPromptProps) {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setSubmitting(true);
        try {
            await onSubmit(password);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-lg shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Protected Document</h1>
                    <p className="text-slate-400">
                        {title ? `"${title}"` : 'This document'} requires a password to view.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="doc-password" className="sr-only">Password</label>
                        <input
                            id="doc-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full h-12 px-4 bg-[#0f172a] border border-[#334155] rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !password}
                        className="w-full h-12 bg-white text-black font-medium rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                Access Document
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
