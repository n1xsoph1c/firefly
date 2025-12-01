'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import VideoStreamPlayer from '@/components/VideoStreamPlayer';
import FilePreview from '@/components/FilePreview';
import { useShareDownload } from '@/hooks/useShareDownload';
import { Video, Image, FileText, Download, Eye, ExternalLink, Clock, HardDrive, User, Cloud } from 'lucide-react';
import { Button, Badge, Card, Modal } from '@/components/ui';
import { EmptyState } from '@/components';

interface ShareData {
  type: 'file' | 'folder';
  share: {
    id: string;
    accessCount: number;
    maxAccess?: number;
    expiresAt?: string;
    createdAt: string;
  };
  user: {
    name?: string;
    email: string;
  };
  file?: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  folder?: {
    id: string;
    name: string;
    description?: string;
    files: Array<{
      id: string;
      name: string;
      originalName: string;
      mimeType: string;
      size: number;
    }>;
    subfolders: Array<{
      id: string;
      name: string;
      description?: string;
      fileCount: number;
    }>;
  };
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Clean up file names - remove underscores and format nicely
function formatFileName(name: string): string {
  return name.replace(/_/g, ' ');
}

// Get file extension
function getFileExtension(name: string): string {
  const ext = name.split('.').pop();
  return ext ? ext.toUpperCase() : '';
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const { downloadState, downloadFile, resetDownload } = useShareDownload();

  useEffect(() => {
    loadShareData();
  }, [token]);

  const loadShareData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/share/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Share not found or has expired');
        } else {
          setError('Failed to load shared content');
        }
        return;
      }

      const data = await response.json();
      setShareData(data);
    } catch (error) {
      console.error('Error loading share:', error);
      setError('Failed to load shared content');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    await downloadFile(fileId, filename, token);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card variant="elevated" className="p-12 text-center max-w-md mx-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Share Not Found</h1>
          <p className="text-zinc-400">{error}</p>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">Firefly </h1>
                <p className="text-xs text-zinc-500">Shared Content</p>
              </div>
            </div>
            <Badge variant="info" className="gap-1">
              <Eye size={14} />
              {shareData.share.accessCount} views
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Share */}
        {shareData.type === 'file' && shareData.file && (
          <div className="space-y-6 animate-fade-in">
            {/* File Info Card */}
            <Card variant="elevated" className="p-8">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-5 min-w-0 flex-1">
                  {/* File Icon with Extension Badge */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
                      {shareData.file.mimeType.startsWith('video/') && (
                        <Video className="w-7 h-7 text-violet-400" />
                      )}
                      {shareData.file.mimeType.startsWith('image/') && (
                        <Image className="w-7 h-7 text-indigo-400" />
                      )}
                      {!shareData.file.mimeType.startsWith('video/') && !shareData.file.mimeType.startsWith('image/') && (
                        <FileText className="w-7 h-7 text-zinc-400" />
                      )}
                    </div>
                    {getFileExtension(shareData.file.originalName) && (
                      <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-md shadow-lg">
                        {getFileExtension(shareData.file.originalName)}
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-zinc-100 mb-3 leading-tight">
                      {formatFileName(shareData.file.originalName)}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <Badge variant="default" className="gap-1.5 px-3 py-1.5">
                        <HardDrive size={14} />
                        <span className="font-semibold">{formatFileSize(shareData.file.size)}</span>
                      </Badge>
                      <Badge variant="default" className="gap-1.5 px-3 py-1.5">
                        <User size={14} />
                        <span>{shareData.user.name || shareData.user.email}</span>
                      </Badge>
                      {shareData.share.expiresAt && (
                        <Badge variant="warning" className="gap-1.5 px-3 py-1.5">
                          <Clock size={14} />
                          <span>Expires {new Date(shareData.share.expiresAt).toLocaleDateString()}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleDownload(shareData.file!.id, shareData.file!.originalName)}
                  isLoading={downloadState.isLoading}
                  leftIcon={<Download size={20} />}
                  className="flex-shrink-0 px-6 shadow-lg shadow-violet-500/20"
                >
                  Download
                </Button>
              </div>
            </Card>

            {/* Video Preview */}
            {shareData.file.mimeType.startsWith('video/') && (
              <Card variant="default" className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <VideoStreamPlayer
                    fileId={shareData.file.id}
                    fileName={shareData.file.originalName}
                    mimeType={shareData.file.mimeType}
                    className="w-full h-full"
                    isShare={true}
                    shareToken={token}
                  />
                </div>
              </Card>
            )}

            {/* Image Preview */}
            {shareData.file.mimeType.startsWith('image/') && (
              <Card variant="default" className="overflow-hidden cursor-pointer hover-lift" onClick={() => setPreviewFile(shareData.file)}>
                <img
                  src={`/api/share/${token}/thumbnail/${shareData.file.id}`}
                  alt={shareData.file.originalName}
                  className="w-full h-auto"
                />
                <div className="p-4 bg-zinc-900/50 backdrop-blur-sm border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400 flex items-center gap-2">
                      <Eye size={14} />
                      Click to view full size
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ExternalLink size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(shareData.file);
                      }}
                    >
                      Enlarge
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Other File Types - Preview handled by FilePreview component */}
            {!shareData.file.mimeType.startsWith('video/') && !shareData.file.mimeType.startsWith('image/') && (
              <Card variant="default" className="p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-zinc-400" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">Click to preview</h3>
                <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                  Click the preview button above to view this file in the preview window.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setPreviewFile(shareData.file)}
                  leftIcon={<Eye size={20} />}
                >
                  Preview File
                </Button>
              </Card>
            )}
          </div>
        )}

        {shareData.type === 'folder' && shareData.folder && (
          <div className="space-y-6 animate-fade-in">
            {/* Folder info */}
            <Card variant="elevated" className="p-8">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/10">
                  <Cloud className="w-8 h-8 text-violet-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-zinc-100 mb-3">{shareData.folder.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge variant="default" className="gap-1.5 px-3 py-1.5">
                      <FileText size={14} />
                      <span className="font-semibold">{shareData.folder.files.length} files</span>
                    </Badge>
                    <Badge variant="default" className="gap-1.5 px-3 py-1.5">
                      <Cloud size={14} />
                      <span className="font-semibold">{shareData.folder.subfolders.length} folders</span>
                    </Badge>
                    <Badge variant="default" className="gap-1.5 px-3 py-1.5">
                      <User size={14} />
                      <span>{shareData.user.name || shareData.user.email}</span>
                    </Badge>
                  </div>
                  {shareData.folder.description && (
                    <p className="text-zinc-400 leading-relaxed">{shareData.folder.description}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Files */}
            {shareData.folder.files.length > 0 && (
              <Card variant="default" className="p-6">
                <h4 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-violet-400" />
                  Files ({shareData.folder.files.length})
                </h4>
                <div className="space-y-2">
                  {shareData.folder.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl transition-all group border border-transparent hover:border-zinc-700/50">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-800/50 border border-zinc-700 flex items-center justify-center">
                            {file.mimeType.startsWith('image/') && <Image size={20} className="text-indigo-400" />}
                            {file.mimeType.startsWith('video/') && <Video size={20} className="text-violet-400" />}
                            {!file.mimeType.startsWith('image/') && !file.mimeType.startsWith('video/') && <FileText size={20} className="text-zinc-400" />}
                          </div>
                          {getFileExtension(file.originalName) && (
                            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded shadow-lg">
                              {getFileExtension(file.originalName)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-100 truncate text-base">{formatFileName(file.originalName)}</p>
                          <p className="text-sm text-zinc-500 font-medium">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Eye size={16} />}
                            onClick={() => setPreviewFile(file)}
                          >
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Download size={16} />}
                          onClick={() => handleDownload(file.id, file.originalName)}
                          isLoading={downloadState.isLoading}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Subfolders */}
            {shareData.folder.subfolders.length > 0 && (
              <Card variant="default" className="p-6">
                <h4 className="text-lg font-semibold text-zinc-100 mb-4">Folders</h4>
                <div className="space-y-2">
                  {shareData.folder.subfolders.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-3 p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                        <Cloud size={18} className="text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-zinc-100">{folder.name}</p>
                        <p className="text-sm text-zinc-500">{folder.fileCount} files</p>
                        {folder.description && (
                          <p className="text-sm text-zinc-400 mt-1">{folder.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          isShare={true}
          shareToken={token}
        />
      )}
    </div>
  );
}