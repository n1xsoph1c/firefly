'use client';

import { useState, useEffect } from 'react';
import { Copy, Eye, ExternalLink, Clock, Ban } from 'lucide-react';
import { Button, Badge, Card, Alert } from './ui';

interface Share {
  id: string;
  token: string;
  shareUrl: string;
  accessCount: number;
  maxAccess?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  file?: {
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  folder?: {
    name: string;
    description?: string;
  };
}

export default function SharesManagement() {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const response = await fetch('/api/shares');
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could use a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading shares...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {shares.length === 0 ? (
        <Card variant="default" className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">No shared links yet</h3>
          <p className="text-zinc-400">Create a share link to start sharing files and folders</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shares.map((share) => (
            <Card key={share.id} variant="elevated" className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Share Title */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-zinc-100 truncate">
                      {share.file?.originalName || share.folder?.name || 'Untitled'}
                    </h3>
                    <Badge variant={share.isActive ? 'success' : 'danger'}>
                      {share.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Share Details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {share.accessCount} views
                    </span>
                    {share.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Expires {formatDate(share.expiresAt)}
                      </span>
                    )}
                    {share.maxAccess && (
                      <span className="flex items-center gap-1">
                        <Ban size={14} />
                        Max {share.maxAccess} access
                      </span>
                    )}
                  </div>

                  {/* Share URL */}
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 truncate">
                      {share.shareUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Copy size={16} />}
                      onClick={() => copyToClipboard(share.shareUrl)}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ExternalLink size={16} />}
                      onClick={() => window.open(share.shareUrl, '_blank')}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}