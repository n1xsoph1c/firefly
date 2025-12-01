'use client';

import { useRef, useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from './ui/Button';

interface VideoStreamPlayerProps {
  fileId: string;
  fileName: string;
  mimeType: string;
  className?: string;
  isShare?: boolean;
  shareToken?: string;
}

export default function VideoStreamPlayer({
  fileId,
  fileName,
  mimeType,
  className = '',
  isShare = false,
  shareToken
}: VideoStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    // Build direct streaming URL - let video element handle HTTP range requests
    const baseUrl = isShare && shareToken
      ? `/api/shared/${shareToken}/stream/${fileId}`
      : `/api/files/${fileId}/stream`;

    // Add cache-busting parameter to ensure service worker doesn't interfere
    const streamUrl = `${baseUrl}?stream=true&t=${Date.now()}`;
    setStreamUrl(streamUrl);
    setIsLoading(false);
  }, [fileId, isShare, shareToken]);

  const handleVideoLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video streaming error:', e);
    setError('Failed to load video stream');
    setIsLoading(false);
  };

  const handleProgress = () => {
    const video = videoRef.current;
    if (!video) return;

    // Calculate buffered percentage
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) {
        setBuffered((bufferedEnd / duration) * 100);
      }
    }
  };

  const handleSeekTo = (percent: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const targetTime = video.duration * percent;
    video.currentTime = targetTime;
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 rounded-xl ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-400 mb-3">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-zinc-300 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              // Reload the video
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 rounded-xl z-10">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-100">Loading video...</p>
            {buffered > 0 && (
              <div className="mt-3">
                <div className="w-32 bg-zinc-700 rounded-full h-1.5 mx-auto overflow-hidden">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${buffered}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-2">{buffered.toFixed(0)}% buffered</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full h-full">
        {streamUrl && (
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            className="w-full h-full object-contain bg-black"
            preload="metadata"
            crossOrigin="anonymous"
            playsInline
            controlsList="nodownload"
            style={{ backgroundColor: '#000' }}
            onLoadStart={handleVideoLoad}
            onError={handleVideoError}
            onProgress={handleProgress}
            onCanPlay={() => setIsLoading(false)}
          />
        )}


        {/* Control overlay - moved to top right to avoid native controls */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => handleSeekTo(0.25)}
            className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-all"
          >
            25%
          </button>
          <button
            onClick={() => handleSeekTo(0.5)}
            className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-all"
          >
            50%
          </button>
          <button
            onClick={() => handleSeekTo(0.75)}
            className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-all"
          >
            75%
          </button>
        </div>

        {/* Buffer indicator - moved to top left */}
        {buffered > 0 && (
          <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white border border-white/20">
            {buffered.toFixed(1)}% buffered
          </div>
        )}
      </div>
    </div>
  );
} 