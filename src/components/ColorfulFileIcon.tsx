import React from 'react';
import {
    FileText,
    Image as ImageIcon,
    Video,
    Music,
    File as FileIcon,
    Archive,
    Code,
    FileSpreadsheet,
    FileCode,
    Film
} from 'lucide-react';

interface FileIconProps {
    mimeType: string;
    fileName: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export default function ColorfulFileIcon({ mimeType, fileName, size = 'md', className = '' }: FileIconProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20'
    };

    const iconSize = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-10 h-10'
    };

    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Video files - Red/Pink gradient
    if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/30`}>
                <Film className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Image files - Blue/Cyan gradient
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30`}>
                <ImageIcon className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Audio files - Purple/Violet gradient
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30`}>
                <Music className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Code files - Green/Emerald gradient
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'swift', 'kt'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30`}>
                <Code className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Document files - Orange/Amber gradient
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30`}>
                <FileText className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Spreadsheet files - Teal/Cyan gradient
    if (['xls', 'xlsx', 'csv', 'numbers'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30`}>
                <FileSpreadsheet className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Archive files - Yellow/Orange gradient
    if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30`}>
                <Archive className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Web files - Indigo/Blue gradient
    if (['html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml'].includes(ext)) {
        return (
            <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30`}>
                <FileCode className={`${iconSize[size]} text-white`} />
            </div>
        );
    }

    // Default - Gray gradient
    return (
        <div className={`${sizeClasses[size]} ${className} rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg shadow-gray-500/20`}>
            <FileIcon className={`${iconSize[size]} text-white`} />
        </div>
    );
}
