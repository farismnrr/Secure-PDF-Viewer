/**
 * Edit Document Page
 * Form for editing document metadata
 */

'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Save,
    Eye,
    Loader2,
    ShieldCheck,
    Stamp
} from 'lucide-react';

interface Document {
    id: number;
    docId: string;
    title: string;
    contentType: string;
    pageCount: number | null;
    isEncrypted: boolean;
    hasPassword: boolean;
    watermarkPolicy: WatermarkPolicy | null;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    viewUrl: string;
}

interface WatermarkPolicy {
    showIp: boolean;
    showTimestamp: boolean;
    showSessionId: boolean;
    customText?: string;
}

interface EditDocumentPageProps {
    params: Promise<{ id: string }>;
}

export default function EditDocumentPage({ params }: EditDocumentPageProps) {
    const { id: docId } = use(params);
    const router = useRouter();

    const [document, setDocument] = useState<Document | null>(null);
    const [title, setTitle] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('active');
    const [watermarkPolicy, setWatermarkPolicy] = useState<WatermarkPolicy>({
        showIp: true,
        showTimestamp: true,
        showSessionId: true,
        customText: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDocument = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = sessionStorage.getItem('access_token');
            const response = await fetch(`/api/admin/documents/${docId}`, {
                headers: {
                    'Authorization': `Bearer ${token || ''}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Document not found');
                }
                throw new Error('Failed to fetch document');
            }

            const data = await response.json();
            const doc = data.data;

            setDocument(doc);
            setTitle(doc.title);
            setStatus(doc.status);

            if (doc.watermarkPolicy) {
                setWatermarkPolicy(doc.watermarkPolicy);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [docId]);

    useEffect(() => {
        fetchDocument();
    }, [fetchDocument]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        try {
            setSaving(true);

            const token = sessionStorage.getItem('access_token');
            const response = await fetch(`/api/admin/documents/${docId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title.trim(),
                    status,
                    watermarkPolicy,
                    password: password === 'remove' ? '' : (password.trim() || undefined)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Update failed');
            }

            router.push('/admin?updated=true');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                <p>Loading document details...</p>
            </div>
        );
    }

    if (error && !document) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
                <div className="p-3 bg-destructive/10 rounded-full text-destructive mb-4">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Error Loading Document</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit Document</h1>
                    <p className="text-muted-foreground">Update metadata and security settings</p>
                </div>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <CardTitle>Document Configuration</CardTitle>
                                <CardDescription>
                                    Manage title, status, and watermark preferences
                                </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <code className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                    {docId}
                                </code>
                                <div className="flex gap-1.5 mt-1">
                                    {document?.isEncrypted && <Badge variant="info">Encrypted</Badge>}
                                    {document?.hasPassword && <Badge variant="warning">Password</Badge>}
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {error && (
                            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Document Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter document title"
                                className="font-medium"
                            />
                        </div>

                        {/* Password Protection */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Document Password (Optional)</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={document?.hasPassword ? "Enter new password to change, or leave blank" : "Set a password to protect this document"}
                                autoComplete="new-password"
                            />
                            <p className="text-xs text-muted-foreground">
                                {document?.hasPassword
                                    ? "Document is currently password protected. Leave blank to keep current password. Enter 'remove' to remove protection."
                                    : "Leave blank for no password."}
                            </p>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <div className="relative">
                                <select
                                    id="status"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="active">Active (Visible)</option>
                                    <option value="inactive">Inactive (Hidden)</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-border/50" />

                        {/* Watermark Policy */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Stamp className="w-4 h-4 text-primary" />
                                <Label className="text-base">Watermark Settings</Label>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4">
                                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={watermarkPolicy.showIp}
                                        onChange={(e) => setWatermarkPolicy({ ...watermarkPolicy, showIp: e.target.checked })}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <span className="text-sm font-medium">Show IP</span>
                                </label>

                                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={watermarkPolicy.showTimestamp}
                                        onChange={(e) => setWatermarkPolicy({ ...watermarkPolicy, showTimestamp: e.target.checked })}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <span className="text-sm font-medium">Show Time</span>
                                </label>

                                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={watermarkPolicy.showSessionId}
                                        onChange={(e) => setWatermarkPolicy({ ...watermarkPolicy, showSessionId: e.target.checked })}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <span className="text-sm font-medium">Show ID</span>
                                </label>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label htmlFor="customText">Custom Watermark Text (Optional)</Label>
                                <Input
                                    id="customText"
                                    value={watermarkPolicy.customText || ''}
                                    onChange={(e) => setWatermarkPolicy({ ...watermarkPolicy, customText: e.target.value })}
                                    placeholder="e.g. CONFIDENTIAL DO NOT SHARE"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This text will appear repeatedly across the document pages.
                                </p>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                        <Button
                            type="button"
                            variant="secondary"
                            asChild
                        >
                            <Link href={`/v/${docId}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </Link>
                        </Button>

                        <Button
                            type="submit"
                            disabled={saving}
                            className="min-w-[140px]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
