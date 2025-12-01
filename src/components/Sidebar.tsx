'use client';

import {
  CloudUpload,
  FolderPlus,
  HardDrive,
  BarChart3,
  Share2,
  Settings,
  X
} from 'lucide-react';
import { Button } from './ui';
import StorageUsage from './StorageUsage';

interface SidebarProps {
  currentView: 'files' | 'analytics' | 'shares';
  onViewChange: (view: 'files' | 'analytics' | 'shares') => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onSettingsClick?: () => void;
  isAdmin: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  onUpload,
  onCreateFolder,
  onSettingsClick,
  isAdmin,
  isOpen = true,
  onClose,
}: SidebarProps) {
  const navItems = [
    { id: 'files' as const, label: 'My Drive', icon: HardDrive, adminOnly: false },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, adminOnly: true },
    { id: 'shares' as const, label: 'Shared Files', icon: Share2, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        lg:sticky lg:top-0 lg:z-0 lg:h-screen
        w-80
        bg-zinc-900 border-r border-zinc-800
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
        flex flex-col
        safe-area-left
        h-screen
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-50">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<CloudUpload size={20} />}
              onClick={() => { onUpload(); onClose?.(); }}
              className="w-full justify-center shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
            >
              Upload Files
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<FolderPlus size={18} />}
              onClick={() => { onCreateFolder(); onClose?.(); }}
              className="w-full justify-center"
            >
              New Folder
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-3">
              Navigation
            </h3>

            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;

              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => { onViewChange(item.id); onClose?.(); }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-300 border border-violet-500/30 shadow-lg shadow-violet-500/10'
                      : 'text-zinc-200 hover:text-zinc-50 hover:bg-zinc-800'
                    }
                  `}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Storage Usage */}
          <div className="pt-4 border-t border-zinc-800">
            <StorageUsage />
          </div>
        </div>

        {/* Settings (Bottom) */}
        <div className="p-4 border-t border-zinc-800 safe-area-bottom">
          <button
            onClick={() => { onSettingsClick?.(); onClose?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-200 hover:text-zinc-50 hover:bg-zinc-800 transition-colors"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}
