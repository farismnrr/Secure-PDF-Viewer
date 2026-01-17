/**
 * Dashboard Page
 * Lists all documents with management options
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    FileText,
    Eye,
    Edit,
    Trash2,
    Plus,
    ShieldAlert
} from "lucide-react";

interface Document {
    id: number;
    docId: string;
    title: string;
    contentType: string;
    pageCount: number | null;
    isEncrypted: boolean;
    hasPassword: boolean;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const accessToken = useAuthStore(state => state.accessToken);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('active');

    const fetchDocuments = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/documents?status=${statusFilter}&page=${page}&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken || ''}`
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch documents');
            }

            const data = await response.json();
            setDocuments(data.data.documents);
            setPagination(data.data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleDelete = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const response = await fetch(`/api/documents/${docId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken || ''}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            fetchDocuments();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground">Manage your secure files and documents</p>
                </div>
                <Button asChild className="gap-2 shadow-lg hover:shadow-primary/20">
                    <Link href="/dashboard/documents/new">
                        <Plus className="h-4 w-4" /> Upload File
                    </Link>
                </Button>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>All Documents</CardTitle>
                            <CardDescription>
                                A list of all documents in the system
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="active" className="bg-popover text-popover-foreground">Active</option>
                                    <option value="inactive" className="bg-popover text-popover-foreground">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                            <p>Loading documents...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-destructive">
                            <ShieldAlert className="h-12 w-12 mb-4 opacity-50" />
                            <p className="mb-4 text-lg font-medium">{error}</p>
                            <Button variant="outline" onClick={() => fetchDocuments()}>
                                Retry
                            </Button>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-muted rounded-lg bg-muted/5">
                            <FileText className="h-16 w-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium mb-1">No documents found</h3>
                            <p className="mb-6 max-w-sm text-center">
                                You haven&apos;t uploaded any documents yet. Start by uploading a new file.
                            </p>
                            <Button asChild>
                                <Link href="/dashboard/documents/new">
                                    <Plus className="h-4 w-4 mr-2" /> Upload Document
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Title</TableHead>
                                        <TableHead>Security</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((doc) => (
                                        <TableRow key={doc.docId}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-foreground">{doc.title}</span>
                                                    <code className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                                                        {doc.docId}
                                                    </code>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {doc.isEncrypted && (
                                                        <Badge variant="info">Encrypted</Badge>
                                                    )}
                                                    {doc.hasPassword && (
                                                        <Badge variant="warning">Password</Badge>
                                                    )}
                                                    {!doc.isEncrypted && !doc.hasPassword && (
                                                        <Badge variant="secondary">None</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={doc.status === 'active' ? 'success' : 'secondary'}>
                                                    {doc.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                {formatDate(doc.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View">
                                                        <Link href={`/v/${doc.docId}`} target="_blank">
                                                            <Eye className="h-4 w-4" />
                                                            <span className="sr-only">View</span>
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                                                        <Link href={`/dashboard/documents/${doc.docId}/edit`}>
                                                            <Edit className="h-4 w-4" />
                                                            <span className="sr-only">Edit</span>
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        title="Delete"
                                                        onClick={() => handleDelete(doc.docId)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                        <Button
                            key={page}
                            variant={page === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchDocuments(page)}
                            className="w-8 h-8 p-0"
                        >
                            {page}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
