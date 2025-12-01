'use client';

import { useState } from 'react';
import { Input, Button, Alert } from './ui';
import { Folder, Globe } from 'lucide-react';
import { APP_URL } from '@/lib/constants';

interface CreateFolderProps {
  parentFolderId: string | null;
  onFolderCreated: () => void;
}

export default function CreateFolder({ parentFolderId, onFolderCreated }: CreateFolderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (isPublic && !slug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate slug if making public
    if (isPublic && !slug.trim()) {
      setError('URL slug is required for public folders');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: parentFolderId,
          isPublic,
          slug: isPublic ? slug.trim() : undefined,
        }),
      });

      if (response.ok) {
        setName('');
        setDescription('');
        setIsPublic(false);
        setSlug('');
        onFolderCreated();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create folder');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // URL preview for sharing
  const urlPreview = `${APP_URL.replace(/\/$/, '')}/shared/username/`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="folderName"
        label="Folder Name"
        type="text"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="Enter folder name"
        required
        leftIcon={<Folder size={18} />}
      />

      <div>
        <label htmlFor="folderDescription" className="block text-sm font-medium text-zinc-300 mb-2">
          Description (optional)
        </label>
        <textarea
          id="folderDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-zinc-100 placeholder-zinc-500 text-sm transition-colors"
          placeholder="Enter folder description"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => {
              setIsPublic(e.target.checked);
              if (e.target.checked && !slug && name) {
                setSlug(generateSlug(name));
              } else if (!e.target.checked) {
                setSlug('');
              }
            }}
            className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-zinc-600 rounded bg-zinc-800"
          />
          <label htmlFor="isPublic" className="text-sm text-zinc-300 flex items-center gap-2">
            <Globe size={16} />
            Make this folder publicly shareable
          </label>
        </div>

        {isPublic && (
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-zinc-300 mb-2">
              Public URL Slug
            </label>
            <div className="flex rounded-lg shadow-sm overflow-hidden border border-zinc-700">
              <span className="inline-flex items-center px-3 bg-zinc-800 text-zinc-500 text-sm border-r border-zinc-700">
                {urlPreview}
              </span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 min-w-0 px-3 py-2 bg-zinc-900 border-0 focus:ring-2 focus:ring-violet-500 text-zinc-100 text-sm"
                placeholder="my-folder"
                required={isPublic}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              This will be the URL where people can access your shared folder.
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={creating}
        disabled={!name.trim()}
        className="w-full justify-center"
      >
        {creating ? 'Creating...' : 'Create Folder'}
      </Button>
    </form>
  );
}