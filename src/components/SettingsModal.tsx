'use client';

import { useState, useEffect } from 'react';
import { X, User, Palette, HardDrive, Settings as SettingsIcon, Database, Server, Users } from 'lucide-react';
import { Button, Badge } from './ui';
import StorageUsage from './StorageUsage';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string;
        email: string;
        name: string;
        isAdmin: boolean;
    };
}

interface SystemInfo {
    nodeVersion: string;
    databaseStatus: string;
    diskSpace?: {
        total: string;
        used: string;
        available: string;
    };
}

export default function SettingsModal({ isOpen, onClose, user }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'admin'>('account');
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [viewModePreference, setViewModePreference] = useState<'grid' | 'list'>('grid');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        if (isOpen && user.isAdmin) {
            // Load system info for admin
            loadSystemInfo();
        }
    }, [isOpen, user.isAdmin]);

    const loadSystemInfo = async () => {
        try {
            const response = await fetch('/api/admin/system-info');
            if (response.ok) {
                const data = await response.json();
                setSystemInfo(data);
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'account' as const, label: 'Account', icon: User },
        { id: 'appearance' as const, label: 'Appearance', icon: Palette },
        ...(user.isAdmin ? [{ id: 'admin' as const, label: 'Admin', icon: SettingsIcon }] : []),
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-50">Settings</h2>
                        <p className="text-sm text-zinc-400 mt-1">Manage your preferences and configuration</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 px-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${isActive
                                        ? 'border-violet-500 text-violet-400'
                                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                    <User size={20} className="text-violet-400" />
                                    Account Information
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm text-zinc-400">Name</label>
                                        <p className="text-zinc-100 font-medium">{user.name || 'Not set'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-zinc-400">Email</label>
                                        <p className="text-zinc-100 font-medium">{user.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-zinc-400">Role</label>
                                        <div className="mt-1">
                                            <Badge variant={user.isAdmin ? 'primary' : 'default'}>
                                                {user.isAdmin ? 'Administrator' : 'User'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                    <HardDrive size={20} className="text-violet-400" />
                                    Storage Usage
                                </h3>
                                <StorageUsage />
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Theme</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`p-4 border-2 rounded-xl transition-all ${theme === 'dark'
                                                ? 'border-violet-500 bg-violet-500/10'
                                                : 'border-zinc-700 hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="w-full aspect-video bg-zinc-900 rounded-lg mb-3 border border-zinc-700"></div>
                                        <p className="text-sm font-medium text-zinc-100">Dark Mode</p>
                                    </button>
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`p-4 border-2 rounded-xl transition-all ${theme === 'light'
                                                ? 'border-violet-500 bg-violet-500/10'
                                                : 'border-zinc-700 hover:border-zinc-600'
                                            }`}
                                        disabled
                                    >
                                        <div className="w-full aspect-video bg-zinc-100 rounded-lg mb-3 border border-zinc-300"></div>
                                        <p className="text-sm font-medium text-zinc-100">Light Mode</p>
                                        <p className="text-xs text-zinc-500 mt-1">Coming Soon</p>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Default View Mode</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setViewModePreference('grid')}
                                        className={`p-4 border-2 rounded-xl transition-all ${viewModePreference === 'grid'
                                                ? 'border-violet-500 bg-violet-500/10'
                                                : 'border-zinc-700 hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="grid grid-cols-3 gap-1 mb-3">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="aspect-square bg-zinc-700 rounded"></div>
                                            ))}
                                        </div>
                                        <p className="text-sm font-medium text-zinc-100">Grid View</p>
                                    </button>
                                    <button
                                        onClick={() => setViewModePreference('list')}
                                        className={`p-4 border-2 rounded-xl transition-all ${viewModePreference === 'list'
                                                ? 'border-violet-500 bg-violet-500/10'
                                                : 'border-zinc-700 hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="space-y-1 mb-3">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="h-3 bg-zinc-700 rounded"></div>
                                            ))}
                                        </div>
                                        <p className="text-sm font-medium text-zinc-100">List View</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'admin' && user.isAdmin && (
                        <div className="space-y-6">
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                    <Server size={20} className="text-violet-400" />
                                    System Configuration
                                </h3>
                                <div className="space-y-3 font-  mono text-sm">
                                    <div className="flex justify-between py-2 border-b border-zinc-700">
                                        <span className="text-zinc-400">Upload Path</span>
                                        <span className="text-zinc-100">{process.env.NEXT_PUBLIC_UPLOAD_PATH || '/uploads'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-zinc-700">
                                        <span className="text-zinc-400">Max File Size</span>
                                        <span className="text-zinc-100">10 GB</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-zinc-700">
                                        <span className="text-zinc-400">Chunk Size</span>
                                        <span className="text-zinc-100">5 MB</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-zinc-400">Storage Limit</span>
                                        <span className="text-zinc-100">250 GB</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                    <Database size={20} className="text-violet-400" />
                                    System Information
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between py-2 border-b border-zinc-700">
                                        <span className="text-zinc-400">Node Version</span>
                                        <span className="text-zinc-100">{systemInfo?.nodeVersion || 'Loading...'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-zinc-700">
                                        <span className="text-zinc-400">Database Status</span>
                                        <Badge variant="success">Connected</Badge>
                                    </div>
                                    {systemInfo?.diskSpace && (
                                        <>
                                            <div className="flex justify-between py-2 border-b border-zinc-700">
                                                <span className="text-zinc-400">Total Disk Space</span>
                                                <span className="text-zinc-100">{systemInfo.diskSpace.total}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-zinc-700">
                                                <span className="text-zinc-400">Used</span>
                                                <span className="text-zinc-100">{systemInfo.diskSpace.used}</span>
                                            </div>
                                            <div className="flex justify-between py-2">
                                                <span className="text-zinc-400">Available</span>
                                                <span className="text-zinc-100">{systemInfo.diskSpace.available}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-violet-400" />
                                    Feature Toggles
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                                        <span className="text-zinc-100">Public File Sharing</span>
                                        <input type="checkbox" className="toggle" defaultChecked />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                                        <span className="text-zinc-100">File Compression</span>
                                        <input type="checkbox" className="toggle" defaultChecked />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                                        <span className="text-zinc-100">Video Processing</span>
                                        <input type="checkbox" className="toggle" defaultChecked />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                                        <span className="text-zinc-100">User Registration</span>
                                        <input type="checkbox" className="toggle" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 p-6 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                    <Button variant="primary">
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
