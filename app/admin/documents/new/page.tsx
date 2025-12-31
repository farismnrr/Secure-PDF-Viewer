/**
 * Upload PDF Page
 * Form for uploading new PDF documents
 */

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Upload,
    FileText,
    ShieldCheck,
    Key,
    Loader2,
    FolderOpen,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function UploadDocumentPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [encrypt, setEncrypt] = useState(true);
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];

        if (!selectedFile) {
            setFile(null);
            return;
        }

        if (selectedFile.type !== 'application/pdf') {
            setError('Only PDF files are allowed');
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setError(null);

        // Auto-fill title from filename if empty
        if (!title) {
            const baseName = selectedFile.name.replace(/\.pdf$/i, '');
            setTitle(baseName);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const selectedFile = e.dataTransfer.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            setError('Only PDF files are allowed');
            return;
        }

        setFile(selectedFile);
        setError(null);

        if (!title) {
            const baseName = selectedFile.name.replace(/\.pdf$/i, '');
            setTitle(baseName);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!file) {
            setError('Please select a PDF file');
            return;
        }

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (usePassword) {
            if (!password) {
                setError('Password is required');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 4) {
                setError('Password must be at least 4 characters');
                return;
            }
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title.trim());
            formData.append('encrypt', encrypt.toString());

            if (usePassword && password) {
                formData.append('password', password);
            }

            const token = sessionStorage.getItem('access_token');
            const response = await fetch('/api/admin/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token || ''}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            // Success - redirect to dashboard
            router.push('/admin?uploaded=true');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Upload Document</h1>
                    <p className="text-muted-foreground">Add a new PDF to your secure library</p>
                </div>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Document Details</CardTitle>
                        <CardDescription>
                            Configure basic information and security settings
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {error && (
                            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        {/* File Upload Area */}
                        <div className="space-y-2">
                            <Label>PDF File *</Label>
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center cursor-pointer relative overflow-hidden group",
                                    file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {file ? (
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-foreground">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="ml-4 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="p-3 bg-muted rounded-full w-fit mx-auto group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <FolderOpen className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Click to upload or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PDF (up to 50MB)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Document Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Q4 Financial Report"
                                className="text-lg"
                            />
                        </div>

                        <div className="border-t border-border/50 my-6" />

                        {/* Security Options */}
                        <div className="space-y-4">
                            <Label>Security Options</Label>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div
                                    className={cn(
                                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                                        encrypt ? "border-primary bg-primary/5" : "border-border"
                                    )}
                                    onClick={() => setEncrypt(!encrypt)}
                                >
                                    <div className={cn("shrink-0 mt-0.5", encrypt ? "text-primary" : "text-muted-foreground")}>
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">Encryption</span>
                                            <input
                                                type="checkbox"
                                                checked={encrypt}
                                                onChange={() => { }}
                                                className="accent-primary h-4 w-4"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Encrypt the file on server storage. Recommended for sensitive documents.
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                                        usePassword ? "border-amber-500/50 bg-amber-500/5" : "border-border"
                                    )}
                                    onClick={() => setUsePassword(!usePassword)}
                                >
                                    <div className={cn("shrink-0 mt-0.5", usePassword ? "text-amber-500" : "text-muted-foreground")}>
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">Password Protection</span>
                                            <input
                                                type="checkbox"
                                                checked={usePassword}
                                                onChange={() => { }}
                                                className="accent-amber-500 h-4 w-4"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Require a password to view this document.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Password Inputs */}
                            {usePassword && (
                                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Document Password *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter password"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password *</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter password"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={loading}
                            className="w-full md:w-auto min-w-[150px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Document
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
