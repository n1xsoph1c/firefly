'use client';

import { Folder, Lock, Globe, MoreVertical, Trash2, FileText } from 'lucide-react';
import { Card, Badge } from './ui';
import { useState } from 'react';

interface FolderCardProps {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  isPublic: boolean;
  fileCount: number;
  folderCount: number;
  createdAt: string;
  onClick?: () => void;
  onDelete?: () => void;
  variant?: 'grid' | 'list';
}

export default function FolderCard({
  id,
  name,
  slug,
  description,
  isPublic,
  fileCount,
  folderCount,
  createdAt,
  onClick,
  onDelete,
  variant = 'grid',
}: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = async () => {
    if (fileCount > 0 || folderCount > 0) {
      alert('Cannot delete non-empty folder');
      return;
    }
    if (window.confirm(`Delete "${name}"?`)) {
      setIsDeleting(true);
      await onDelete?.();
      setIsDeleting(false);
    }
    setShowMenu(false);
  };

  if (variant === 'list') {
    return (
      <div 
        onClick={onClick}
        className="group relative flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200 cursor-pointer"
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 relative">
          <Folder size={24} strokeWidth={1.5} className="transition-transform group-hover:scale-110" />
          <div className="absolute -top-1 -right-1">
            {isPublic ? (
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <Globe size={12} className="text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 bg-zinc-600 rounded-full flex items-center justify-center">
                <Lock size={10} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-zinc-100 truncate">{name}</h3>
            <Badge variant={isPublic ? 'success' : 'default'} size="sm">
              {isPublic ? 'Public' : 'Private'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{fileCount} files</span>
            <span>•</span>
            <span>{folderCount} folders</span>
            <span>•</span>
            <span>{formatDate(createdAt)}</span>
          </div>
          {description && (
            <p className="text-xs text-zinc-600 truncate mt-1">{description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 py-2 animate-scale-in">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting || fileCount > 0 || folderCount > 0}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              {(fileCount > 0 || folderCount > 0) && (
                <p className="px-4 py-2 text-xs text-zinc-500">Folder must be empty</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <Card
      variant="elevated"
      padding="md"
      interactive
      className="group cursor-pointer relative"
      onClick={onClick}
    >
      {/* Header with icon and menu */}
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Folder size={32} strokeWidth={1.5} className="transition-transform group-hover:scale-110" />
          </div>
          {/* Status indicator */}
          <div className="absolute -top-1 -right-1">
            {isPublic ? (
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <Globe size={14} className="text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-zinc-600 rounded-full flex items-center justify-center">
                <Lock size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 py-2 animate-scale-in">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting || fileCount > 0 || folderCount > 0}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              {(fileCount > 0 || folderCount > 0) && (
                <p className="px-4 py-2 text-xs text-zinc-500">Folder must be empty</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Folder info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 truncate mb-1 group-hover:text-violet-400 transition-colors">
            {name}
          </h3>
          <Badge variant={isPublic ? 'success' : 'default'} size="sm">
            {isPublic ? 'Public' : 'Private'}
          </Badge>
        </div>

        {description && (
          <p className="text-xs text-zinc-500 line-clamp-2">{description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-zinc-600" />
            <span>{fileCount} files</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Folder size={14} className="text-zinc-600" />
            <span>{folderCount}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-600">{formatDate(createdAt)}</p>

        {isPublic && slug && (
          <div className="pt-3 border-t border-zinc-800">
            <code className="text-xs text-indigo-400 font-mono truncate block">
              /{slug}
            </code>
          </div>
        )}
      </div>
    </Card>
  );
}
