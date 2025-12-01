'use client';

import { useFileTransfer } from '@/hooks/useFileTransfer';
import { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import Progress from './ui/Progress';

interface InstantDownloadButtonProps {
  fileId: string;
  fileName: string;
  className?: string;
  children?: React.ReactNode;
  onDownloadStart?: () => void;
}

export default function InstantDownloadButton({
  fileId,
  fileName,
  className = '',
  children,
  onDownloadStart
}: InstantDownloadButtonProps) {
  const { downloadFile, downloading, lastError } = useFileTransfer();
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setShowProgress(true);
    onDownloadStart?.();
    await downloadFile(fileId, { fileName, onProgress: p => setProgress(p.percent) });
    setTimeout(() => setShowProgress(false), 1500);
  };

  const getButtonText = () => {
    if (downloading) return 'Downloading...';
    if (lastError) return 'Download Failed';
    return children || 'Download';
  };

  const getButtonVariant = (): 'primary' | 'danger' => {
    if (lastError) return 'danger';
    return 'primary';
  };

  const getButtonIcon = () => {
    if (downloading) return <Loader2 className="animate-spin" />;
    if (lastError) return <AlertTriangle />;
    return <Download />;
  };

  return (
    <div className="relative">
      <Button
        onClick={handleDownload}
        disabled={downloading}
        variant={getButtonVariant()}
        size="md"
        className={className}
      >
        <span className="flex items-center gap-2">
          {getButtonIcon()}
          {getButtonText()}
        </span>
      </Button>

      {/* Progress bar */}
      {showProgress && downloading && (
        <div className="absolute top-full left-0 right-0 mt-2 min-w-[200px]">
          <Progress value={progress} label={`${progress.toFixed(0)}%`} size="sm" />
          <div className="text-xs text-zinc-400 mt-1 text-center">
            {downloading ? 'Downloading...' : 'Preparing...'}
          </div>
        </div>
      )}

      {/* Error message */}
      {lastError && (
        <div className="absolute top-full left-0 right-0 mt-2 text-xs text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          {lastError}
        </div>
      )}
    </div>
  );
} 