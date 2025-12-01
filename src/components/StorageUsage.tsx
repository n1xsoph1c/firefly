'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

interface StorageUsage {
  usedStorage: number;
  storageLimit: number;
  usagePercentage: number;
  fileCount: number;
  folderCount: number;
  trash: {
    files: number;
    folders: number;
  };
}

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, children }: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (percentage: number): string => {
    if (percentage < 50) return '#8b5cf6'; // violet
    if (percentage < 80) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(percentage)}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {/* Content in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default function StorageUsage() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/storage/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Failed to load storage usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'text-violet-400';
    if (percentage < 80) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <Card className="!p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
          <div className="mx-auto w-28 h-28 bg-zinc-800 rounded-full"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-8 bg-zinc-800 rounded"></div>
              <div className="h-3 bg-zinc-800 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-zinc-800 rounded"></div>
              <div className="h-3 bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!usage) {
    return (
      <Card className="!p-6">
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Storage info unavailable</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="!p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Storage</h3>
          <button className="text-sm text-violet-400 hover:text-violet-300 font-medium">
            Manage
          </button>
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center">
          <CircularProgress percentage={usage.usagePercentage}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getUsageColor(usage.usagePercentage)}`}>
                {usage.usagePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-400">Used</div>
            </div>
          </CircularProgress>
        </div>

        {/* Storage Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">Used</span>
            <span className="text-sm font-medium text-zinc-50">
              {formatBytes(usage.usedStorage)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">Available</span>
            <span className="text-sm font-medium text-zinc-50">
              {formatBytes(usage.storageLimit - usage.usedStorage)}
            </span>
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-300">Total</span>
              <span className="text-sm font-medium text-zinc-50">
                {formatBytes(usage.storageLimit)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">{usage.fileCount}</div>
            <div className="text-xs text-zinc-400">Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">{usage.folderCount}</div>
            <div className="text-xs text-zinc-400">Folders</div>
          </div>
        </div>

        {/* Warning if usage is high */}
        {usage.usagePercentage > 90 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-300">
                Storage almost full - consider cleaning up files
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button variant="primary" size="md" className="w-full">
            Upgrade Storage
          </Button>
          <Button variant="secondary" size="md" className="w-full">
            Clean Up Files
          </Button>
        </div>
      </div>
    </Card>
  );
}