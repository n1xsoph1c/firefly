'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, FileText, Image as ImageIcon, Video, Music, Archive, File, ChevronLeft, ChevronRight } from 'lucide-react';
import CodeViewer from './CodeViewer';
import TextViewer from './TextViewer';
import ArchiveViewer from './ArchiveViewer';
import VideoStreamPlayer from './VideoStreamPlayer';
import InstantDownloadButton from './InstantDownloadButton';

interface FilePreviewProps {
    file: {
        id: string;
        name: string;
        originalName: string;
        mimeType: string;
        size: number;
    };
    files?: Array<{
        id: string;
        name: string;
        originalName: string;
        mimeType: string;
        size: number;
    }>;
    onClose: () => void;
    onNavigate?: (fileId: string) => void;
    isShare?: boolean;
    shareToken?: string;
}

const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const isCodeFile = (fileName: string): boolean => {
    const codeExtensions = [
        'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'cpp', 'c', 'cs', 'php',
        'go', 'rs', 'swift', 'kt', 'scala', 'html', 'css', 'scss', 'sass', 'less',
        'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'bash', 'zsh', 'ps1', 'r',
        'dart', 'lua', 'vim', 'dockerfile', 'makefile', 'gradle', 'cmake'
    ];
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return codeExtensions.includes(ext);
};

const isTextFile = (fileName: string, mimeType: string): boolean => {
    const textExtensions = ['txt', 'log', 'csv', 'tsv', 'conf', 'ini', 'env', 'properties'];
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return textExtensions.includes(ext) || mimeType.startsWith('text/');
};

const isMarkdownFile = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ext === 'md' || ext === 'markdown';
};

const isArchiveFile = (fileName: string): boolean => {
    const archiveExtensions = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz', 'tgz'];
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return archiveExtensions.includes(ext);
};

const isAudioFile = (mimeType: string): boolean => {
    return mimeType.startsWith('audio/');
};

const isPDFFile = (mimeType: string): boolean => {
    return mimeType === 'application/pdf';
};

export default function FilePreview({ file, files = [], onNavigate, onClose, isShare = false, shareToken }: FilePreviewProps) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const currentIndex = files.findIndex(f => f.id === file.id);
    const hasNext = currentIndex < files.length - 1 && currentIndex !== -1;
    const hasPrev = currentIndex > 0 && currentIndex !== -1;
    const showNavigation = files.length > 1 && currentIndex !== -1;

    const isImage = file.mimeType.startsWith('image/');
    const isVideo = file.mimeType.startsWith('video/');
    const isAudio = isAudioFile(file.mimeType);
    const isPDF = isPDFFile(file.mimeType);
    const isCode = isCodeFile(file.originalName);
    const isMarkdown = isMarkdownFile(file.originalName);
    const isText = isTextFile(file.originalName, file.mimeType);
    const isArchive = isArchiveFile(file.originalName);

    const needsContentFetch = isCode || isText || isMarkdown;

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev) {
                e.preventDefault();
                handlePrevious();
            } else if (e.key === 'ArrowRight' && hasNext) {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasNext, hasPrev, currentIndex]);

    const handleNext = () => {
        if (hasNext && onNavigate) {
            const nextFile = files[currentIndex + 1];
            onNavigate(nextFile.id);
        }
    };

    const handlePrevious = () => {
        if (hasPrev && onNavigate) {
            const prevFile = files[currentIndex - 1];
            onNavigate(prevFile.id);
        }
    };

    //Touch gesture support for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;

        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;
        const threshold = 50; // minimum swipe distance

        if (Math.abs(diff) > threshold) {
            if (diff > 0 && hasNext) {
                // Swiped left, show next
                handleNext();
            } else if (diff < 0 && hasPrev) {
                // Swiped right, show previous
                handlePrevious();
            }
        }

        setTouchStart(null);
    };

    useEffect(() => {
        if (needsContentFetch) {
            fetchContent();
        } else {
            setLoading(false);
        }
    }, [file.id]);

    const fetchContent = async () => {
        try {
            setLoading(true);
            setError(null);

            const url = isShare && shareToken
                ? `/api/share/${shareToken}/content/${file.id}`
                : `/api/files/${file.id}/content`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to load file content');
            }

            const text = await response.text();
            setContent(text);
        } catch (err) {
            console.error('Error fetching content:', err);
            setError('Failed to load file content');
        } finally {
            setLoading(false);
        }
    };

    const renderPreview = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 text-violet-400 animate-spin mx-auto mb-4" />
                        <p className="text-zinc-400">Loading preview...</p>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-10 w-10 text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Preview Error</h3>
                        <p className="text-zinc-400">{error}</p>
                    </div>
                </div>
            );
        }

        // Image Preview
        if (isImage) {
            const imageUrl = isShare && shareToken
                ? `/api/share/${shareToken}/preview/${file.id}`
                : `/api/files/${file.id}/preview`;

            return (
                <div className="flex items-center justify-center h-full p-6 bg-black/50">
                    <img
                        src={imageUrl}
                        alt={file.originalName}
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                </div>
            );
        }

        // Video Preview
        if (isVideo) {
            return (
                <div className="flex items-center justify-center w-full h-full bg-black">
                    <VideoStreamPlayer
                        fileId={file.id}
                        fileName={file.originalName}
                        mimeType={file.mimeType}
                        className="w-full h-full"
                        isShare={isShare}
                        shareToken={shareToken}
                    />
                </div>
            );
        }

        // Audio Preview
        if (isAudio) {
            const audioUrl = isShare && shareToken
                ? `/api/share/${shareToken}/stream/${file.id}`
                : `/api/files/${file.id}/stream`;

            return (
                <div className="flex items-center justify-center h-full">
                    <div className="w-full max-w-2xl px-6">
                        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 rounded-xl flex items-center justify-center">
                                    <Music className="h-8 w-8 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">{file.originalName}</h3>
                                    <p className="text-sm text-zinc-400">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            <audio controls className="w-full" src={audioUrl}>
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                </div>
            );
        }

        // PDF Preview
        if (isPDF) {
            const pdfUrl = isShare && shareToken
                ? `/api/share/${shareToken}/preview/${file.id}`
                : `/api/files/${file.id}/preview`;

            return (
                <div className="h-full w-full">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-0"
                        title={file.originalName}
                    />
                </div>
            );
        }

        // Code Preview
        if (isCode) {
            return <CodeViewer code={content} language="" fileName={file.originalName} />;
        }

        // Markdown Preview
        if (isMarkdown) {
            return <TextViewer content={content} fileName={file.originalName} isMarkdown />;
        }

        // Text Preview
        if (isText) {
            return <TextViewer content={content} fileName={file.originalName} />;
        }

        // Archive Preview
        if (isArchive) {
            return <ArchiveViewer fileName={file.originalName} fileSize={file.size} />;
        }

        // Fallback for unsupported types
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <File className="h-10 w-10 text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-100 mb-2">Preview not available</h3>
                    <p className="text-zinc-400 mb-6">
                        This file type cannot be previewed in the browser. Download it to view the content.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span>{file.mimeType}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.size)}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md"
                onClick={onClose}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                ref={modalRef}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="h-full w-full flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 safe-area-top">
                        <div className="flex-1 min-w-0 mr-4">
                            <h2 className="text-base sm:text-lg font-semibold text-zinc-50 truncate">{file.originalName}</h2>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                                <span>{formatFileSize(file.size)}</span>
                                {showNavigation && (
                                    <>
                                        <span>•</span>
                                        <span>{currentIndex + 1} of {files.length}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Navigation buttons for desktop */}
                            {showNavigation && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                        disabled={!hasPrev}
                                        className="hidden sm:flex p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Previous (←)"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-zinc-400" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        disabled={!hasNext}
                                        className="hidden sm:flex p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Next (→)"
                                    >
                                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                                    </button>
                                </>
                            )}
                            <InstantDownloadButton
                                fileId={file.id}
                                fileName={file.originalName}
                                className="px-3 sm:px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Download</span>
                            </InstantDownloadButton>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                            </button>
                        </div>
                    </div>

                    {/* Preview Content */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        {renderPreview()}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
