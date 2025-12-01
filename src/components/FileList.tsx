'use client';

import { useState, useRef } from 'react';
import {
  MoreVertical,
  Share,
  Trash2,
  Eye,
  Folder,
  MoveRight,
  FileIcon,
  Play
} from 'lucide-react';
import InstantDownloadButton from './InstantDownloadButton';
import VideoStreamPlayer from './VideoStreamPlayer';
import FilePreview from './FilePreview';
import ColorfulFileIcon from './ColorfulFileIcon';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface File {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FileListProps {
  files: File[];
  onFileDeleted: () => void;
  viewMode?: 'list' | 'grid';
  folders?: { id: string; name: string; }[];
  currentFolderId?: string | null;
}

export default function FileList({ files, onFileDeleted, viewMode = 'list', folders = [], currentFolderId }: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [moveDialogFile, setMoveDialogFile] = useState<File | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [touchingId, setTouchingId] = useState<string | null>(null);
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Removed old getFileIcon - now using ColorfulFileIcon component



  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    setDeletingId(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onFileDeleted();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateShare = async (fileId: string) => {
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (response.ok) {
        const data = await response.json();
        navigator.clipboard.writeText(data.share.shareUrl);
        alert(`Share link copied to clipboard: ${data.share.shareUrl}`);
      }
    } catch (error) {
      console.error('Create share failed:', error);
    }
  };

  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {
    setMovingId(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId: targetFolderId }),
      });

      if (response.ok) {
        onFileDeleted(); // Refresh the file list
        setMoveDialogFile(null);
      } else {
        alert('Failed to move file');
      }
    } catch (error) {
      console.error('Move file failed:', error);
      alert('Failed to move file');
    } finally {
      setMovingId(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, fileId: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setTouchingId(fileId);

    touchTimer.current = setTimeout(() => {
      setShowMobileActions(fileId);
      // Haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !touchTimer.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    // Cancel long press if finger moves too much
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
      setTouchingId(null);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
    setTouchingId(null);
    touchStartPos.current = null;
  };

  const FileMenu = ({ file }: { file: File }) => (
    <div className="absolute right-0 top-8 w-48 glass-effect rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10 bg-white dark:bg-gray-800">
      <button
        onClick={() => {
          setPreviewFile(file);
          setOpenMenuId(null);
          setShowMobileActions(null);
        }}
        className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 rounded-lg transition-colors"
      >
        <Eye className="h-4 w-4" />
        <span>Preview</span>
      </button>
      <InstantDownloadButton
        fileId={file.id}
        fileName={file.originalName}
        className="w-full !px-4 !py-2 text-left text-sm !bg-transparent !text-zinc-200 hover:!bg-zinc-800 !shadow-none !rounded-lg !justify-start"
        onDownloadStart={() => {
          setOpenMenuId(null);
          setShowMobileActions(null);
        }}
      >
        Download
      </InstantDownloadButton>
      <button
        onClick={() => {
          handleCreateShare(file.id);
          setOpenMenuId(null);
          setShowMobileActions(null);
        }}
        className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 rounded-lg transition-colors"
      >
        <Share className="h-4 w-4" />
        <span>Share</span>
      </button>
      <button
        onClick={() => {
          setMoveDialogFile(file);
          setOpenMenuId(null);
          setShowMobileActions(null);
        }}
        className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 rounded-lg transition-colors"
      >
        <MoveRight className="h-4 w-4" />
        <span>Move</span>
      </button>
      <hr className="my-1 border-zinc-800" />
      <button
        onClick={() => {
          handleDelete(file.id);
          setOpenMenuId(null);
          setShowMobileActions(null);
        }}
        disabled={deletingId === file.id}
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        <span>{deletingId === file.id ? 'Deleting...' : 'Delete'}</span>
      </button>
    </div>
  );

  const renderMoveDialog = () => {
    if (!moveDialogFile) return null;

    const availableFolders = folders.filter(folder => folder.id !== currentFolderId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full border border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Move File</h3>
            <button
              onClick={() => setMoveDialogFile(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-zinc-300 mb-4">
              Move "{moveDialogFile.originalName}" to:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Root folder option */}
              {currentFolderId && (
                <button
                  onClick={() => handleMoveFile(moveDialogFile.id, null)}
                  disabled={movingId === moveDialogFile.id}
                  className="w-full p-3 text-left border border-zinc-700 rounded-xl hover:bg-zinc-800 flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  <Folder className="h-5 w-5 text-violet-400" />
                  <span className="text-zinc-100">Root Folder</span>
                </button>
              )}

              {/* Available folders */}
              {availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveFile(moveDialogFile.id, folder.id)}
                  disabled={movingId === moveDialogFile.id}
                  className="w-full p-3 text-left border border-zinc-700 rounded-xl hover:bg-zinc-800 flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  <Folder className="h-5 w-5 text-violet-400" />
                  <span className="text-zinc-100">{folder.name}</span>
                </button>
              ))}

              {availableFolders.length === 0 && !currentFolderId && (
                <p className="text-sm text-zinc-400 text-center py-4">
                  No folders available to move to
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 p-4 flex justify-end gap-3">
            <Button
              onClick={() => setMoveDialogFile(null)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewModal = () => {
    if (!previewFile) return null;

    return (
      <FilePreview
        file={previewFile}
        files={files}
        onNavigate={(fileId) => {
          const newFile = files.find(f => f.id === fileId);
          if (newFile) {
            setPreviewFile(newFile);
          }
        }}
        onClose={() => setPreviewFile(null)}
      />
    );
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileIcon className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400 text-lg">No files in this location</p>
        <p className="text-zinc-500 text-sm">Upload files to get started</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file) => (
            <div key={file.id} className="group relative">
              <div
                className={`bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/20 hover:border-violet-500/30 transition-all duration-300 cursor-pointer backdrop-blur-sm ${touchingId === file.id ? 'scale-95 shadow-xl shadow-violet-500/30' : ''
                  } ${showMobileActions === file.id ? 'ring-2 ring-violet-500 scale-[1.02]' : ''
                  }`}
                onClick={() => setPreviewFile(file)}
                onTouchStart={(e) => handleTouchStart(e, file.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 transform transition-transform duration-300 group-hover:scale-110 relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
                    <ThumbnailPreview file={file} />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-100 truncate w-full mb-1.5">
                    {file.originalName}
                  </h4>
                  <p className="text-xs text-zinc-400 font-medium">
                    {formatFileSize(file.size)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatDate(file.createdAt)}
                  </p>
                </div>

                {/* Actions menu */}
                <div className={`absolute top-2 right-2 transition-opacity ${showMobileActions === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100'
                  }`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const isOpen = openMenuId === file.id || showMobileActions === file.id;
                      setOpenMenuId(isOpen ? null : file.id);
                      setShowMobileActions(isOpen ? null : file.id);
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg bg-zinc-900/80 shadow-sm border border-zinc-700"
                  >
                    <MoreVertical className="h-4 w-4 text-zinc-300" />
                  </button>
                  {(openMenuId === file.id || showMobileActions === file.id) && <FileMenu file={file} />}
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderPreviewModal()}
        {renderMoveDialog()}
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="divide-y divide-zinc-800/50">
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-4 hover:bg-zinc-800/50 hover:scale-[1.01] transition-all duration-200 group ${touchingId === file.id ? 'bg-zinc-800/50' : ''
                } ${showMobileActions === file.id ? 'bg-violet-500/10 scale-[1.01]' : ''
                }`}
            >
              <div
                className="flex items-center gap-4 flex-1 cursor-pointer"
                onClick={() => setPreviewFile(file)}
                onTouchStart={(e) => handleTouchStart(e, file.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="transform transition-transform duration-200 hover:scale-110 w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                  <ThumbnailPreview file={file} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-zinc-400 font-medium">
                    {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 hidden sm:block">
                  Downloaded {file.downloadCount} times
                </span>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const isOpen = openMenuId === file.id || showMobileActions === file.id;
                      setOpenMenuId(isOpen ? null : file.id);
                      setShowMobileActions(isOpen ? null : file.id);
                    }}
                    className={`p-2 hover:bg-zinc-700 rounded-lg transition-colors ${showMobileActions === file.id ? 'opacity-100 bg-zinc-700' : 'opacity-0 group-hover:opacity-100'
                      }`}
                  >
                    <MoreVertical className="h-4 w-4 text-zinc-300" />
                  </button>
                  {(openMenuId === file.id || showMobileActions === file.id) && <FileMenu file={file} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {renderPreviewModal()}
      {renderMoveDialog()}
    </>
  );
}

// Thumbnail Preview Component for Grid View
function ThumbnailPreview({ file }: { file: File }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (file.mimeType.startsWith('image/') && !error) {
    return (
      <>
        <img
          src={`/api/files/${file.id}/preview`}
          alt={file.originalName}
          className="w-full h-full object-cover"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  if (file.mimeType.startsWith('video/') && !error) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 bg-violet-600/20 border-2 border-violet-500/50 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Play size={20} className="text-violet-300 ml-1" fill="currentColor" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <ColorfulFileIcon
        mimeType={file.mimeType}
        fileName={file.originalName}
        size="lg"
      />
    </div>
  );
}