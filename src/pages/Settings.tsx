import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { exportJSONBackup, importJSONBackup, exportCSV } from '../utils/exportImport';
import { db } from '../db/database';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  ShieldCheck,
  Smartphone,
  Info,
  Layers
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [isClearOpen, setIsClearOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setImportFileContent(event.target?.result as string);
        setIsImportOpen(true);
      };
      reader.onerror = () => {
        showToast({
          type: 'error',
          title: 'File Read Error',
          description: 'Could not read the selected JSON file.'
        });
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importFileContent) return;
    const result = await importJSONBackup(importFileContent, importMode);
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Import Successful',
        description: result.message
      });
    } else {
      showToast({
        type: 'error',
        title: 'Import Failed',
        description: result.message
      });
    }
    setIsImportOpen(false);
    setImportFileContent(null);
  };

  const handleClearAllData = async () => {
    await db.friends.clear();
    await db.transactions.clear();
    await db.groups.clear();
    showToast({
      type: 'info',
      title: 'Data Cleared',
      description: 'All local friends, transactions, and groups have been removed.'
    });
    setIsClearOpen(false);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Settings & Data Management</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Customize app appearance, export backups, and manage local data
        </p>
      </div>

      {/* Theme Selection */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Appearance & Theme
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose your preferred color theme or match your operating system.
        </p>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
              theme === 'light'
                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-500 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span>Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
              theme === 'dark'
                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-500 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
              theme === 'system'
                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-500 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Laptop className="w-5 h-5 text-slate-400" />
            <span>System</span>
          </button>
        </div>
      </Card>

      {/* Data Backup & Export */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Data Export & Backup
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export your complete database as a JSON backup file or download transactions as CSV for Excel.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={exportJSONBackup} variant="outline" size="sm">
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export JSON Backup</span>
          </Button>

          <Button onClick={exportCSV} variant="outline" size="sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export CSV Report</span>
          </Button>

          <label className="inline-flex items-center justify-center font-medium rounded-xl px-3 py-1.5 text-xs gap-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-amber-500" />
            <span>Import JSON Backup</span>
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </Card>

      {/* PWA & Installation */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            PWA Installation & Offline Support
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          SettleMate is an installable Progressive Web App. You can install it on your home screen for quick access. It works completely offline without internet!
        </p>
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 font-medium">
          💡 <strong>To Install:</strong> On Chrome/Android click 'Install App' or 'Add to Home Screen' in browser menu. On Safari/iOS tap 'Share' then 'Add to Home Screen'.
        </div>
      </Card>

      {/* Privacy Guarantee */}
      <Card className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>Local-First Privacy Guarantee</span>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
          All your friends, transactions, and group data are stored 100% locally in your browser using IndexedDB. No financial data is ever sent to external cloud servers.
        </p>
      </Card>

      {/* Danger Zone: Clear Data */}
      <Card className="p-5 border-rose-200/80 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
          Danger Zone
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Permanently clear all local transaction history, friends, and group data.
        </p>
        <Button onClick={() => setIsClearOpen(true)} variant="danger" size="sm">
          <Trash2 className="w-4 h-4" />
          <span>Clear All Local Data</span>
        </Button>
      </Card>

      {/* Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Backup Data"
        subtitle="Select import mode"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Choose how to handle existing data when importing this backup file:
          </p>

          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Merge with Existing Data (Safe)
                </span>
                <span className="text-[11px] text-slate-500">
                  Adds new records and updates matching records without deleting existing items.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900 cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="mt-0.5 text-rose-600"
              />
              <div>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                  Replace Entire Database
                </span>
                <span className="text-[11px] text-slate-500">
                  Wipes current local database completely before restoring the backup.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmImport}>
              Proceed Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Confirmation */}
      <ConfirmDialog
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={handleClearAllData}
        title="Clear All Local Data?"
        message="This action cannot be undone. All friends, transactions, and group data will be permanently wiped from local browser storage."
        confirmText="Yes, Wipe All Data"
      />
    </div>
  );
};
