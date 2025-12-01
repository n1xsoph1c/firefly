'use client';

import { Search, Menu, Settings, LogOut, Grid3x3, List } from 'lucide-react';
import { Badge } from './ui';
import { APP_NAME } from '@/lib/constants';

interface TopBarProps {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onLogout: () => void;
  onMenuToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSettingsClick?: () => void;
}

export default function TopBar({
  userName,
  userEmail,
  isAdmin,
  viewMode,
  onViewModeChange,
  onLogout,
  onMenuToggle,
  searchQuery = '',
  onSearchChange,
  onSettingsClick,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 ios-header-safe">
      <div className="ios-header-content py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-zinc-200 hover:text-zinc-50 hover:bg-zinc-800 rounded-xl transition-colors touch-target"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gradient">
                  {APP_NAME}
                </h1>
                <p className="text-xs text-zinc-400">Cloud Storage</p>
              </div>
            </div>
          </div>

          {/* Center search - hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:bg-zinc-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none transition-all text-sm text-zinc-50 placeholder-zinc-400"
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* View mode toggle - hidden on mobile */}
            <div className="hidden sm:flex bg-zinc-800 border border-zinc-700 rounded-xl p-1 gap-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                  }`}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                  }`}
              >
                <List size={18} />
              </button>
            </div>

            {/* Settings button - hidden on mobile */}
            <button
              onClick={onSettingsClick}
              className="hidden sm:block p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Settings size={20} />
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
              <div className="hidden sm:block text-right">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-medium text-zinc-50">{userName || userEmail}</p>
                  {isAdmin && (
                    <Badge variant="primary" size="sm">Admin</Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{userEmail}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-colors group"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl focus:bg-zinc-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none transition-all text-sm text-zinc-50 placeholder-zinc-400"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
