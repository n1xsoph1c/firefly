'use client';

import { useState, useRef } from 'react';
import {
  MoreVertical,
  Trash2,
  Globe,
  Link as LinkIcon,
  Lock
} from 'lucide-react';
import ColorfulFolderIcon from './ColorfulFolderIcon';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface Folder {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  isPublic: boolean;
  _count: {
    files: number;
    children: number;
  };
  createdAt: string;
}

interface FolderListProps {
  folders: Folder[];
  onFolderClick: (folderId: string) => void;
  onFolderDeleted?: () => void;
  viewMode?: 'list' | 'grid';
}

export default function FolderList({ folders, onFolderClick, onFolderDeleted, viewMode = 'grid' }: FolderListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [touchingId, setTouchingId] = useState<string | null>(null);
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? It must be empty.')) return;

    setDeletingId(folderId);
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onFolderDeleted?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete folder');
    } finally {
      setDeletingId(null);
      setOpenMenuId(null);
      setShowMobileActions(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, folderId: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setTouchingId(folderId);

    touchTimer.current = setTimeout(() => {
      setShowMobileActions(folderId);
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

  const FolderMenu = ({ folder }: { folder: Folder }) => (
    <div className="absolute right-0 top-8 w-48 bg-zinc-900 rounded-xl shadow-lg border border-zinc-700 py-2 z-10">
      {folder._count.files === 0 && folder._count.children === 0 && (
        <button
          onClick={() => handleDelete(folder.id)}
          disabled={deletingId === folder.id}
          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors rounded-lg disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>{deletingId === folder.id ? 'Deleting...' : 'Delete'}</span>
        </button>
      )}
      {(folder._count.files > 0 || folder._count.children > 0) && (
        <div className="px-4 py-2 text-sm text-zinc-400">
          Cannot delete non-empty folder
        </div>
      )}
    </div>
  );

  if (folders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mb-4 flex justify-center">
          <ColorfulFolderIcon folderName="empty" size="xl" />
        </div>
        <h3 className="text-lg font-medium text-zinc-100 mb-2">No folders yet</h3>
        <p className="text-zinc-400 mb-6">
          Create your first folder to organize your files
        </p>
        <Button variant="primary">
          Create Folder
        </Button>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {folders.map((folder) => (
          <div key={folder.id} className="group relative">
            <div
              onClick={() => onFolderClick(folder.id)}
              onTouchStart={(e) => handleTouchStart(e, folder.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/20 hover:border-violet-500/30 cursor-pointer transition-all duration-300 backdrop-blur-sm ${touchingId === folder.id ? 'scale-95 shadow-xl shadow-violet-500/30' : ''
                } ${showMobileActions === folder.id ? 'ring-2 ring-violet-500 scale-[1.02]' : ''
                }`}
            >
              {/* Folder Icon with background */}
              <div className="flex justify-center mb-5">
                <div className="relative transform transition-transform duration-300 group-hover:scale-110">
                  <ColorfulFolderIcon
                    folderName={folder.name}
                    size="lg"
                  />
                  {/* Public/Private indicator */}
                  <div className="absolute -top-1 -right-1">
                    {folder.isPublic ? (
                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                        <Globe className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center shadow-lg">
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Folder Info */}
              <div className="text-center space-y-2">
                <h4 className="font-bold text-zinc-100 truncate text-base">
                  {folder.name}
                </h4>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-300 font-medium">
                    {folder._count.files} files • {folder._count.children} folders
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(folder.createdAt)}
                  </p>
                </div>
                {folder.description && (
                  <p className="text-xs text-zinc-400 truncate mt-2">
                    {folder.description}
                  </p>
                )}
              </div>

              {/* Actions menu */}
              <div className={`absolute top-4 right-4 transition-opacity ${showMobileActions === folder.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100'
                }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isOpen = openMenuId === folder.id || showMobileActions === folder.id;
                    setOpenMenuId(isOpen ? null : folder.id);
                    setShowMobileActions(isOpen ? null : folder.id);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors bg-zinc-900/80 shadow-sm border border-zinc-700"
                >
                  <MoreVertical className="h-5 w-5 text-zinc-300" />
                </button>
                {(openMenuId === folder.id || showMobileActions === folder.id) && <FolderMenu folder={folder} />}
              </div>

              {/* Public folder URL preview */}
              {folder.isPublic && folder.slug && (
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="primary" size="sm" className="!text-xs font-mono">
                    <LinkIcon className="h-3 w-3" />
                    <span className="truncate">/{folder.slug}</span>
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
      <div className="divide-y divide-zinc-800/50">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`flex items-center justify-between p-4 hover:bg-zinc-800/50 hover:scale-[1.01] transition-all duration-200 group ${touchingId === folder.id ? 'bg-zinc-800/50' : ''
              } ${showMobileActions === folder.id ? 'bg-violet-500/10 scale-[1.01]' : ''
              }`}
          >
            <div
              className="flex items-center gap-4 flex-1 cursor-pointer"
              onClick={() => onFolderClick(folder.id)}
              onTouchStart={(e) => handleTouchStart(e, folder.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex-shrink-0 relative transform transition-transform duration-200 hover:scale-110">
                <ColorfulFolderIcon
                  folderName={folder.name}
                  size="md"
                />
                {/* Status indicator */}
                <div className="absolute -top-1 -right-1">
                  {folder.isPublic ? (
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                      <Globe className="h-2.5 w-2.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center shadow-md">
                      <Lock className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {folder.name}
                  </p>
                  {folder.isPublic ? (
                    <Badge variant="success" size="sm">
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Private
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-zinc-400">
                    {folder._count.files} files
                  </span>
                  <span className="text-xs text-zinc-400">
                    {folder._count.children} folders
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDate(folder.createdAt)}
                  </span>
                </div>
                {folder.description && (
                  <p className="text-xs text-zinc-300 truncate mt-1">{folder.description}</p>
                )}
                {folder.isPublic && folder.slug && (
                  <div className="flex items-center gap-1 mt-1">
                    <LinkIcon className="h-3 w-3 text-violet-400" />
                    <span className="text-xs text-violet-400 font-mono truncate">
                      /shared/username/{folder.slug}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isOpen = openMenuId === folder.id || showMobileActions === folder.id;
                  setOpenMenuId(isOpen ? null : folder.id);
                  setShowMobileActions(isOpen ? null : folder.id);
                }}
                className={`p-2 hover:bg-zinc-700 rounded-lg transition-colors ${showMobileActions === folder.id ? 'opacity-100 bg-zinc-700' : 'opacity-0 group-hover:opacity-100'
                  }`}
              >
                <MoreVertical className="h-4 w-4 text-zinc-300" />
              </button>
              {(openMenuId === folder.id || showMobileActions === folder.id) && <FolderMenu folder={folder} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}