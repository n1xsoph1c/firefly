'use client';

import { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  MoreVertical,
  Download,
  Share2,
  Eye,
  Trash2,
  Move,
  Play
} from 'lucide-react';
import { Card, Badge } from './ui';

interface FileCardProps {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  downloadCount: number;
  createdAt: string;
  onPreview?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  variant?: 'grid' | 'list';
}

export default function FileCard({
  id,
  name,
  mimeType,
  size,
  downloadCount,
  createdAt,
  onPreview,
  onDownload,
  onShare,
  onMove,
  onDelete,
  variant = 'grid',
}: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = () => {
    const iconClass = 'transition-transform group-hover:scale-110';

    if (mimeType.startsWith('video/')) {
      return <Video className={iconClass} size={variant === 'grid' ? 48 : 24} strokeWidth={1.5} />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className={iconClass} size={variant === 'grid' ? 48 : 24} strokeWidth={1.5} />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className={iconClass} size={variant === 'grid' ? 48 : 24} strokeWidth={1.5} />;
    }
    return <File className={iconClass} size={variant === 'grid' ? 48 : 24} strokeWidth={1.5} />;
  };

  const getFileTypeColor = () => {
    if (mimeType.startsWith('video/')) return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
    if (mimeType.startsWith('image/')) return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    if (mimeType === 'application/pdf') return 'from-red-500/20 to-orange-500/20 border-red-500/30';
    return 'from-zinc-700/50 to-zinc-800/50 border-zinc-700';
  };

  const getFileTypeBadgeVariant = (): 'primary' | 'info' | 'warning' | 'default' => {
    if (mimeType.startsWith('video/')) return 'primary';
    if (mimeType.startsWith('image/')) return 'info';
    if (mimeType === 'application/pdf') return 'warning';
    return 'default';
  };

  const getFileTypeName = () => {
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('text/')) return 'Text';
    return 'File';
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete "${name}"?`)) {
      setIsDeleting(true);
      await onDelete?.();
      setIsDeleting(false);
    }
    setShowMenu(false);
  };

  if (variant === 'list') {
    return (
      <div className="group relative flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${getFileTypeColor()} flex items-center justify-center text-zinc-300`}>
          {getFileIcon()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onPreview}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-zinc-100 truncate">{name}</h3>
            <Badge variant={getFileTypeBadgeVariant()} size="sm">
              {getFileTypeName()}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{formatFileSize(size)}</span>
            <span>•</span>
            <span>{formatDate(createdAt)}</span>
            <span>•</span>
            <span>{downloadCount} downloads</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPreview}
            className="p-2 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Preview"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={onDownload}
            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Download"
          >
            <Download size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 py-2 animate-scale-in">
                <button
                  onClick={() => { onShare?.(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                >
                  <Share2 size={16} />
                  Share
                </button>
                <button
                  onClick={() => { onMove?.(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                >
                  <Move size={16} />
                  Move
                </button>
                <hr className="my-2 border-zinc-800" />
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <Card
      variant="elevated"
      padding="none"
      interactive
      className="group overflow-hidden cursor-pointer"
      onClick={onPreview}
    >
      {/* Thumbnail/Icon Area */}
      <div className={`aspect-square bg-gradient-to-br ${getFileTypeColor()} flex items-center justify-center text-zinc-300 relative overflow-hidden`}>
        {/* Show thumbnail for images and videos, fallback to icon */}
        {mimeType.startsWith('image/') && !thumbnailError ? (
          <>
            <img
              src={`/api/files/${id}/preview`}
              alt={name}
              className="w-full h-full object-cover"
              onLoad={() => setThumbnailLoading(false)}
              onError={() => {
                setThumbnailError(true);
                setThumbnailLoading(false);
              }}
            />
            {thumbnailLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : mimeType.startsWith('video/') && !thumbnailError ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <div className="w-16 h-16 bg-violet-600/20 border-2 border-violet-500/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play size={28} className="text-violet-300 ml-1" fill="currentColor" />
            </div>
            <Video className="absolute top-4 right-4 text-zinc-400" size={24} strokeWidth={1.5} />
          </div>
        ) : (
          getFileIcon()
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview?.(); }}
            className="p-3 bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
            title="Preview"
          >
            <Eye size={20} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
            className="p-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
            title="Download"
          >
            <Download size={20} className="text-white" />
          </button>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <Badge variant={getFileTypeBadgeVariant()} size="sm">
            {getFileTypeName()}
          </Badge>
        </div>

        {/* Menu button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-sm rounded-lg text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 py-2 animate-scale-in">
              <button
                onClick={(e) => { e.stopPropagation(); onShare?.(); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
              >
                <Share2 size={16} />
                Share
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMove?.(); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
              >
                <Move size={16} />
                Move
              </button>
              <hr className="my-2 border-zinc-800" />
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-zinc-100 truncate mb-2 group-hover:text-violet-400 transition-colors">
          {name}
        </h3>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{formatFileSize(size)}</span>
          <span>{formatDate(createdAt)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Download size={12} className="text-zinc-600" />
          <span className="text-zinc-500">{downloadCount}</span>
        </div>
      </div>
    </Card>
  );
}
