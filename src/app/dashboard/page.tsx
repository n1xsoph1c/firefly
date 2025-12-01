'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChunkedFileUpload from '@/components/ChunkedFileUpload';
import FileList from '@/components/FileList';
import FolderList from '@/components/FolderList';
import CreateFolder from '@/components/CreateFolder';
import SharesManagement from '@/components/SharesManagement';
import StorageAnalytics from '@/components/StorageAnalytics';
import StorageUsage from '@/components/StorageUsage';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Breadcrumb from '@/components/Breadcrumb';
import EmptyState from '@/components/EmptyState';
import SettingsModal from '@/components/SettingsModal';
import { Modal } from '@/components/ui';
import {
  Folder,
  Upload,
  Search,
  Menu,
  User,
  Settings,
  Cloud,
  BarChart3,
  Users,
  Grid,
  List as ListIcon
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

interface File {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isPublic: boolean;
  _count: {
    files: number;
    children: number;
  };
  createdAt: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentView, setCurrentView] = useState<'files' | 'analytics' | 'shares'>('files');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile sidebar
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadFiles();
      loadFolders();
      loadBreadcrumbs();
    }
  }, [user, currentFolderId]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const params = new URLSearchParams();
      if (currentFolderId) {
        params.append('folderId', currentFolderId);
      }

      const response = await fetch(`/api/files?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const params = new URLSearchParams();
      if (currentFolderId) {
        params.append('parentId', currentFolderId);
      }

      const response = await fetch(`/api/folders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadBreadcrumbs = async () => {
    if (!currentFolderId) {
      setBreadcrumbs([{ id: null, name: 'My Drive' }]);
      return;
    }

    try {
      const response = await fetch(`/api/folders/${currentFolderId}/path`);
      if (response.ok) {
        const data = await response.json();
        setBreadcrumbs([{ id: null, name: 'My Drive' }, ...data.path]);
      } else {
        setBreadcrumbs([{ id: null, name: 'My Drive' }]);
      }
    } catch (error) {
      console.error('Failed to load breadcrumbs:', error);
      setBreadcrumbs([{ id: null, name: 'My Drive' }]);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleFileUploaded = () => {
    loadFiles();
    setShowUploadModal(false);
  };

  const handleFolderCreated = () => {
    loadFolders();
    setShowCreateFolderModal(false);
  };

  const handleFolderDeleted = () => {
    loadFolders();
  };

  const handleFileDeleted = () => {
    loadFiles();
  };

  // Filter files and folders based on search query
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
          <span className="text-lg font-medium text-zinc-300 animate-pulse">Loading your Drive...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view: 'files' | 'analytics' | 'shares') => {
          setCurrentView(view);
          if (view === 'files') setCurrentFolderId(null);
          setSidebarOpen(false);
        }}
        onUpload={() => setShowUploadModal(true)}
        onCreateFolder={() => setShowCreateFolderModal(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
        isAdmin={user.isAdmin}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <TopBar
          userName={user.name || user.email}
          userEmail={user.email}
          isAdmin={user.isAdmin}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          onSettingsClick={() => setShowSettingsModal(true)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto px-6 lg:px-8 py-6 mobile-content-spacing">
          {currentView === 'files' && (
            <div className="space-y-6 animate-fade-in">
              {/* Breadcrumb */}
              <Breadcrumb
                items={breadcrumbs}
                onNavigate={(id: string | null) => setCurrentFolderId(id)}
              />

              {/* Empty State */}
              {folders.length === 0 && files.length === 0 && (
                <EmptyState
                  type="both"
                  title="This folder is empty"
                  description="Start organizing your files by creating folders or uploading new content"
                  onUpload={() => setShowUploadModal(true)}
                  onCreateFolder={() => setShowCreateFolderModal(true)}
                />
              )}

              {/* Folders Grid/List */}
              {folders.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-50">Folders</h3>
                    <span className="text-sm text-zinc-400">{filteredFolders.length} items</span>
                  </div>
                  <FolderList
                    folders={filteredFolders}
                    onFolderClick={setCurrentFolderId}
                    onFolderDeleted={handleFolderDeleted}
                    viewMode={viewMode}
                  />
                </div>
              )}

              {/* Files Grid/List */}
              {filteredFiles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-50">Files</h3>
                    <span className="text-sm text-zinc-400">{filteredFiles.length} items</span>
                  </div>
                  <FileList
                    files={filteredFiles}
                    onFileDeleted={handleFileDeleted}
                    viewMode={viewMode}
                    folders={folders}
                    currentFolderId={currentFolderId}
                  />
                </div>
              )}
            </div>
          )}

          {currentView === 'analytics' && user?.isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-zinc-50 mb-2">Analytics Dashboard</h2>
                <p className="text-zinc-300">Monitor your storage usage and file activity</p>
              </div>
              <StorageAnalytics />
            </div>
          )}

          {currentView === 'shares' && user?.isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-zinc-50 mb-2">Shared Files</h2>
                <p className="text-zinc-300">Manage your public file shares and permissions</p>
              </div>
              <SharesManagement />
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        size="md"
      >
        <ChunkedFileUpload
          currentFolderId={currentFolderId}
          onFileUploaded={handleFileUploaded}
        />
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        title="Create Folder"
        size="md"
      >
        <CreateFolder
          parentFolderId={currentFolderId}
          onFolderCreated={handleFolderCreated}
        />
      </Modal>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 z-30 safe-area-bottom">
        <div className="grid grid-cols-4 h-16 px-2">
          <button
            onClick={() => {
              setCurrentView('files');
              setCurrentFolderId(null);
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 rounded-xl mx-1 ${currentView === 'files' && !currentFolderId
              ? 'text-violet-400 bg-violet-500/10'
              : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50'
              }`}
          >
            <Folder className="h-5 w-5" />
            <span className="text-xs font-medium">Drive</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex flex-col items-center justify-center space-y-1 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 transition-all duration-200 rounded-xl mx-1"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs font-medium">Upload</span>
          </button>

          {user?.isAdmin && (
            <>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 rounded-xl mx-1 ${currentView === 'analytics'
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50'
                  }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs font-medium">Analytics</span>
              </button>

              <button
                onClick={() => setCurrentView('shares')}
                className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 rounded-xl mx-1 ${currentView === 'shares'
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50'
                  }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">Shared</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Settings Modal */}
      {user && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          user={user}
        />
      )}
    </div>
  );
}