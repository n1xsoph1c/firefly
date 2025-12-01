'use client';

import { useState, useEffect } from 'react';
import { File as FileIcon, Folder, Link, HardDrive, Video, Image, FileText } from 'lucide-react';
import Card from './ui/Card';

interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  totalShares: number;
  totalSize: number;
  filesByType: Record<string, number>;
  recentUploads: Array<{
    id: string;
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
    createdAt: string;
  }>;
}

export default function StorageAnalytics() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats(); 
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIconComponent = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-violet-400" />;
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />;
    return <FileIcon className="w-5 h-5 text-zinc-400" />;
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-300">Loading analytics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-red-400">Failed to load analytics</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="!p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-400">Total Files</h3>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.totalFiles}</p>
            </div>
          </div>
        </Card>

        <Card className="!p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Folder className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-400">Total Folders</h3>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.totalFolders}</p>
            </div>
          </div>
        </Card>

        <Card className="!p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Link className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-400">Active Shares</h3>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.totalShares}</p>
            </div>
          </div>
        </Card>

        <Card className="!p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-400">Storage Used</h3>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{formatFileSize(stats.totalSize)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* File Types Distribution */}
      <Card>
        <h3 className="text-lg font-medium text-zinc-100 mb-4">Files by Type</h3>
        <div className="space-y-3">
          {Object.entries(stats.filesByType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-3">
                {getFileIconComponent(type)}
                <span className="text-sm font-medium text-zinc-200">{type}</span>
              </div>
              <span className="text-sm text-zinc-400">{count} files</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Uploads */}
      <Card>
        <h3 className="text-lg font-medium text-zinc-100 mb-4">Recent Uploads</h3>
        {stats.recentUploads.length > 0 ? (
          <div className="space-y-3">
            {stats.recentUploads.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIconComponent(file.mimeType)}
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{file.originalName}</p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(Number(file.size))} • {formatDate(file.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400 text-center py-4">No recent uploads</p>
        )}
      </Card>
    </div>
  );
}