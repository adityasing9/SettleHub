import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  Upload,
  FolderPlus,
  Trash2,
  Download,
  ArrowLeft,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { api } from '../../services/api';
import type { FileBrowseResult, FileEntry } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

export const FileManager: React.FC = () => {
  const [data, setData] = useState<FileBrowseResult | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const [showMkdirModal, setShowMkdirModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path?: string) => {
    setLoading(true);
    try {
      const res = await api.browseFiles(path);
      setData(res);
      if (!currentPath && res.current_path) {
        setCurrentPath(res.current_path);
      }
    } catch (e) {
      console.error('Failed to browse files', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.is_dir) {
      setCurrentPath(entry.path);
    } else {
      window.open(api.getDownloadUrl(entry.path), '_blank');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !data) return;
    const file = e.target.files[0];
    try {
      await api.uploadFile(file, data.current_path);
      loadFiles(data.current_path);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !data) return;
    try {
      await api.createFolder(data.current_path, newFolderName.trim());
      setShowMkdirModal(false);
      setNewFolderName('');
      loadFiles(data.current_path);
    } catch (err) {
      console.error('Create folder error', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !data) return;
    try {
      await api.deleteFile(deleteTarget.path);
      setDeleteTarget(null);
      loadFiles(data.current_path);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Root Sandboxes Switcher */}
      {data?.roots && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.roots.map((r) => (
            <button
              key={r.path}
              onClick={() => setCurrentPath(r.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold shrink-0 border transition-all ${
                currentPath.startsWith(r.path)
                  ? 'bg-brand-primary text-dark-950 border-brand-primary shadow-md shadow-brand-primary/20'
                  : 'bg-dark-900 hover:bg-dark-800 text-slate-300 border-dark-800'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Explorer Container */}
      <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-dark-800">
          <div className="flex items-center gap-2 overflow-hidden">
            {!data?.is_root && (
              <button
                onClick={() => {
                  const parent = currentPath.split(/[\\/]/).slice(0, -1).join('\\');
                  setCurrentPath(parent);
                }}
                className="p-2 rounded-xl bg-dark-950 hover:bg-dark-800 text-slate-300 hover:text-white"
                title="Go Up"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs font-mono text-slate-400 truncate">
              {data?.current_path || 'Loading sandbox...'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Upload File */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-950 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-brand-primary" />
              <span className="hidden sm:inline">Upload</span>
              <input type="file" onChange={handleUpload} className="hidden" />
            </label>

            {/* New Folder */}
            <button
              onClick={() => setShowMkdirModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-950 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">New Folder</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => loadFiles(currentPath)}
              className="p-1.5 rounded-xl bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white border border-dark-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* File Entries List */}
        <div className="mt-4 space-y-1 max-h-[500px] overflow-y-auto">
          {data?.entries && data.entries.length > 0 ? (
            data.entries.map((entry) => (
              <div
                key={entry.path}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-dark-950 transition-colors group cursor-pointer"
                onClick={() => handleEntryClick(entry)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`p-2 rounded-xl ${
                      entry.is_dir
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-brand-primary/10 text-brand-primary'
                    }`}
                  >
                    {entry.is_dir ? (
                      <Folder className="w-4 h-4 fill-amber-400/20" />
                    ) : (
                      <File className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-medium text-slate-200 block truncate">
                      {entry.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {entry.is_dir ? 'Directory' : formatSize(entry.size_bytes)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!entry.is_dir && (
                    <a
                      href={api.getDownloadUrl(entry.path)}
                      download
                      className="p-2 text-slate-400 hover:text-brand-primary rounded-lg hover:bg-dark-900"
                      title="Download to phone"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setDeleteTarget(entry)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-dark-900"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              Directory is empty
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      {showMkdirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-dark-900 border border-dark-700 p-6">
            <h3 className="text-sm font-bold text-white mb-2">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-dark-950 border border-dark-700 text-slate-200 focus:outline-none focus:border-brand-primary"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMkdirModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-dark-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-brand-primary text-dark-950 hover:bg-cyan-400"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Item?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
