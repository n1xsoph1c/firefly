'use client';

import { CloudUpload, FolderPlus, File, Cloud } from 'lucide-react';
import { Button } from './ui';
import { APP_NAME } from '@/lib/constants';

interface EmptyStateProps {
  type: 'files' | 'folders' | 'both';
  title?: string;
  description?: string;
  onUpload?: () => void;
  onCreateFolder?: () => void;
}

export default function EmptyState({
  type,
  title,
  description,
  onUpload,
  onCreateFolder,
}: EmptyStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'files':
        return <File className="w-24 h-24 text-zinc-700" strokeWidth={1} />;
      case 'folders':
        return <FolderPlus className="w-24 h-24 text-zinc-700" strokeWidth={1} />;
      default:
        return <Cloud className="w-24 h-24 text-zinc-700" strokeWidth={1} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'files':
        return 'No files yet';
      case 'folders':
        return 'No folders yet';
      default:
        return 'This folder is empty';
    }
  };

  const getDefaultDescription = () => {
    switch (type) {
      case 'files':
        return 'Upload your first file to get started';
      case 'folders':
        return 'Create a folder to organize your files';
      default:
        return 'Start by uploading files or creating folders';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Icon with gradient background */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 blur-3xl rounded-full"></div>
        <div className="relative w-32 h-32 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      {/* Text */}
      <h3 className="text-2xl font-semibold text-zinc-50 mb-2">
        {title || getDefaultTitle()}
      </h3>
      <p className="text-zinc-300 max-w-md mb-8">
        {description || getDefaultDescription()}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onUpload && (
          <Button
            variant="primary"
            size="lg"
            leftIcon={<CloudUpload size={20} />}
            onClick={onUpload}
          >
            Upload Files
          </Button>
        )}
        {onCreateFolder && (
          <Button
            variant="secondary"
            size="lg"
            leftIcon={<FolderPlus size={20} />}
            onClick={onCreateFolder}
          >
            Create Folder
          </Button>
        )}
      </div>

      {/* Optional decoration */}
      <div className="mt-12 flex items-center gap-2 text-xs text-zinc-600">
        <div className="w-8 h-px bg-zinc-800"></div>
        <span>{APP_NAME}</span>
        <div className="w-8 h-px bg-zinc-800"></div>
      </div>
    </div>
  );
}
