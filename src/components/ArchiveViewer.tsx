'use client';

import { Archive, File, Folder, HardDrive } from 'lucide-react';

interface ArchiveFile {
    name: string;
    size: number;
    isDirectory: boolean;
    path: string;
}

interface ArchiveViewerProps {
    fileName: string;
    fileSize: number;
    // In a real implementation, this would come from an API that extracts archive contents
    files?: ArchiveFile[];
}

const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export default function ArchiveViewer({ fileName, fileSize, files = [] }: ArchiveViewerProps) {
    const fileCount = files.filter(f => !f.isDirectory).length;
    const folderCount = files.filter(f => f.isDirectory).length;

    return (
        <div className="flex flex-col h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
            {/* Header */}
            <div className="px-6 py-4 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 rounded-xl flex items-center justify-center">
                        <Archive className="h-6 w-6 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-100">{fileName}</h3>
                        <p className="text-sm text-zinc-400">{formatFileSize(fileSize)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                        <File className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-300">{fileCount} files</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                        <Folder className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-300">{folderCount} folders</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {files.length > 0 ? (
                    <div className="space-y-1">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {file.isDirectory ? (
                                        <Folder className="h-5 w-5 text-violet-400 flex-shrink-0" />
                                    ) : (
                                        <File className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                                        <p className="text-xs text-zinc-500">{file.path}</p>
                                    </div>
                                </div>
                                {!file.isDirectory && (
                                    <span className="text-xs text-zinc-500 flex-shrink-0 ml-4">
                                        {formatFileSize(file.size)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
                            <Archive className="h-10 w-10 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-300 mb-2">Archive Contents</h3>
                        <p className="text-sm text-zinc-500 max-w-sm">
                            Archive file listing is not yet available. Download the file to extract and view its contents.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
