import React from 'react';
import { Folder } from 'lucide-react';

interface ColorfulFolderIconProps {
    folderName: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export default function ColorfulFolderIcon({ folderName, size = 'md', className = '' }: ColorfulFolderIconProps) {
    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-14 h-14',
        lg: 'w-18 h-18',
        xl: 'w-24 h-24'
    };

    const iconSize = {
        sm: 'w-5 h-5',
        md: 'w-7 h-7',
        lg: 'w-9 h-9',
        xl: 'w-12 h-12'
    };

    // Generate color based on folder name hash for consistency
    const getGradientColors = (name: string) => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const gradients = [
            { from: 'from-blue-500', to: 'to-cyan-500', shadow: 'shadow-blue-500/40' },
            { from: 'from-purple-500', to: 'to-pink-500', shadow: 'shadow-purple-500/40' },
            { from: 'from-green-500', to: 'to-emerald-500', shadow: 'shadow-green-500/40' },
            { from: 'from-orange-500', to: 'to-red-500', shadow: 'shadow-orange-500/40' },
            { from: 'from-indigo-500', to: 'to-purple-500', shadow: 'shadow-indigo-500/40' },
            { from: 'from-teal-500', to: 'to-cyan-500', shadow: 'shadow-teal-500/40' },
            { from: 'from-rose-500', to: 'to-pink-500', shadow: 'shadow-rose-500/40' },
            { from: 'from-amber-500', to: 'to-yellow-500', shadow: 'shadow-amber-500/40' },
        ];

        return gradients[hash % gradients.length];
    };

    const colors = getGradientColors(folderName);

    return (
        <div className={`${sizeClasses[size]} ${className} rounded-2xl bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center shadow-xl ${colors.shadow} transform transition-transform duration-300 hover:scale-110`}>
            <Folder className={`${iconSize[size]} text-white fill-white/20`} />
        </div>
    );
}
