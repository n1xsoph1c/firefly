'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import VideoStreamPlayer from '@/components/VideoStreamPlayer';
import {
  Folder as FolderIcon,
  File as DocumentIcon,
  Image as PhotoIcon,
  Video as VideoCameraIcon,
  Music as MusicalNoteIcon,
  Archive as ArchiveBoxIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Eye as EyeIcon,
  Download as ArrowDownTrayIcon,
  Cloud,
  ChevronRight
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { EmptyState } from '@/components';

interface SharedData {
  type: 'file' | 'folder';
  user: {
    name?: string;
    email: string;
    username: string;
  };
  folder: {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    files?: Array<{
      id: string;
      name: string;
      originalName: string;
      mimeType: string;
      size: number;
      createdAt: string;
      updatedAt: string;
    }>;
    subfolders?: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      _count: { files: number };
    }>;
    totalFiles?: number;
    totalSubfolders?: number;
  };
  file?: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
  };
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return PhotoIcon;
  if (mimeType.startsWith('video/')) return VideoCameraIcon;
  if (mimeType.startsWith('audio/')) return MusicalNoteIcon;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return ArchiveBoxIcon;
  return DocumentIcon;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('zip')) return 'Archive';
  if (mimeType.includes('text')) return 'Text';
  return 'File';
}

export default function SharedPage() {
  const params = useParams();
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);

  useEffect(() => {
    loadSharedData();
  }, [params]);

  const loadSharedData = async () => {
    try {
      setLoading(true);

      // Build URL based on params
      let url = `/api/shared/${params.username}/${params.slug}`;
      if (params.filename && Array.isArray(params.filename)) {
        url += `/${params.filename.join('/')}`;
      } else if (params.filename) {
        url += `/${params.filename}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Shared content not found');
        } else {
          setError('Failed to load shared content');
        }
        return;
      }

      const data = await response.json();
      setSharedData(data);
    } catch (error) {
      console.error('Error loading shared content:', error);
      setError('Failed to load shared content');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const downloadUrl = `/api/shared/${params.username}/${params.slug}/download/${fileId}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  if (!sharedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img src="/logo-no-circle.png" alt="Firefly " className="h-8 w-8" />
                <span className="text-xl font-bold text-gray-900">Firefly </span>
              </div>
              <div className="hidden sm:block text-gray-400">/</div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span className="font-medium">{sharedData.user.username}</span>
              </div>
              <div className="hidden sm:block text-gray-400">/</div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FolderIcon className="h-4 w-4" />
                <span className="font-medium">{sharedData.folder.name}</span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Shared by {sharedData.user.name || sharedData.user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Single File View */}
        {sharedData.type === 'file' && sharedData.file && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    {(() => {
                      const Icon = getFileIcon(sharedData.file!.mimeType);
                      return <Icon className="h-8 w-8 text-blue-600" />;
                    })()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{sharedData.file.originalName}</h1>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>{getFileTypeLabel(sharedData.file.mimeType)}</span>
                      </span>
                      <span>{formatFileSize(Number(sharedData.file.size))}</span>
                      <span className="flex items-center space-x-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(sharedData.file.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(sharedData.file!.id, sharedData.file!.originalName)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Download
                </button>
              </div>
            </div>

            {/* File Preview */}
            <div className="p-6">
              {sharedData.file.mimeType.startsWith('image/') && (
                <div className="flex justify-center">
                  <img
                    src={`/api/shared/${params.username}/${params.slug}/stream/${sharedData.file.id}`}
                    alt={sharedData.file.originalName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {sharedData.file.mimeType.startsWith('video/') && (
                <div className="flex justify-center">
                  <VideoStreamPlayer
                    fileId={sharedData.file.id}
                    fileName={sharedData.file.originalName}
                    mimeType={sharedData.file.mimeType}
                    className="max-w-full max-h-[70vh] mx-auto"
                    isShare={true}
                    shareToken={`${params.username}/${params.slug}`}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Folder View */}
        {sharedData.type === 'folder' && sharedData.folder && (
          <div className="space-y-6">
            {/* Folder Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <FolderIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{sharedData.folder.name}</h1>
                    {sharedData.folder.description && (
                      <p className="text-gray-600 mt-1">{sharedData.folder.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{sharedData.folder.totalFiles || 0}</div>
                  <div className="text-sm text-gray-600">Files</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">{sharedData.folder.totalSubfolders || 0}</div>
                  <div className="text-sm text-gray-600">Folders</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{sharedData.user.username}</div>
                  <div className="text-sm text-gray-600">Owner</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">Public</div>
                  <div className="text-sm text-gray-600">Access</div>
                </div>
              </div>
            </div>

            {/* Files Grid */}
            {sharedData.folder.files && sharedData.folder.files.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Files</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedData.folder.files.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    return (
                      <div key={file.id} className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{file.originalName}</h3>
                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                              <span>{getFileTypeLabel(file.mimeType)}</span>
                              <span>•</span>
                              <span>{formatFileSize(Number(file.size))}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              {(file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) && (
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                >
                                  <EyeIcon className="h-3 w-3 mr-1" />
                                  Preview
                                </button>
                              )}
                              <button
                                onClick={() => handleDownload(file.id, file.originalName)}
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subfolders */}
            {sharedData.folder.subfolders && sharedData.folder.subfolders.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Subfolders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedData.folder.subfolders.map((subfolder) => (
                    <a
                      key={subfolder.id}
                      href={`/shared/${params.username}/${subfolder.slug}`}
                      className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-yellow-300 block"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                          <FolderIcon className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{subfolder.name}</h3>
                          {subfolder.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{subfolder.description}</p>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {subfolder._count.files} files
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl max-h-[90vh] w-full overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{previewFile.originalName}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              {previewFile.mimeType.startsWith('image/') && (
                <img
                  src={`/api/shared/${params.username}/${params.slug}/stream/${previewFile.id}`}
                  alt={previewFile.originalName}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              )}

              {previewFile.mimeType.startsWith('video/') && (
                <VideoStreamPlayer
                  fileId={previewFile.id}
                  fileName={previewFile.originalName}
                  mimeType={previewFile.mimeType}
                  className="max-w-full max-h-[70vh] mx-auto"
                  isShare={true}
                  shareToken={`${params.username}/${params.slug}`}
                />
              )}
            </div>

            <div className="border-t border-gray-200 p-4 flex justify-end space-x-2">
              <button
                onClick={() => handleDownload(previewFile.id, previewFile.originalName)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}