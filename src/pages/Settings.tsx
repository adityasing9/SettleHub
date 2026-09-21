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
  Layers,
  FileText,
  Clipboard,
  CheckCircle2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { QRExportModal } from '../components/export/QRExportModal';
import { QRImportModal } from '../components/export/QRImportModal';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [pastedJson, setPastedJson] = useState<string>('');
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isQRExportOpen, setIsQRExportOpen] = useState(false);
  const [isQRImportOpen, setIsQRImportOpen] = useState(false);

  const activeJsonContent = importTab === 'file' ? importFileContent : pastedJson;

  const getJsonPreview = (jsonStr: string | null) => {
    if (!jsonStr || !jsonStr.trim()) return null;
    try {
      const raw = JSON.parse(jsonStr);
      const root = raw.data && typeof raw.data === 'object' ? raw.data : raw;
      const rawFriends = root.friends || root.Friends || [];
      const rawTransactions = root.transactions || root.Transactions || [];
      const rawGroups = root.groups || root.Groups || [];

      if (!Array.isArray(rawFriends) && !Array.isArray(rawTransactions) && !Array.isArray(rawGroups)) {
        return { isValid: false, error: 'Backup does not contain valid friends or transactions lists.' };
      }

      return {
        isValid: true,
        friendsCount: Array.isArray(rawFriends) ? rawFriends.length : 0,
        transactionsCount: Array.isArray(rawTransactions) ? rawTransactions.length : 0,
        groupsCount: Array.isArray(rawGroups) ? rawGroups.length : 0
      };
    } catch (e: any) {
      return { isValid: false, error: 'Invalid JSON syntax. Please check file or pasted text.' };
    }
  };

  const preview = getJsonPreview(activeJsonContent);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = event => {
        setImportFileContent(event.target?.result as string);
      };
      reader.onerror = () => {
        showToast({
          type: 'error',
          title: 'File Read Error',
          description: 'Could not read the selected file on this device.'
        });
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedJson(text);
          showToast({
            type: 'info',
            title: 'Pasted from Clipboard',
            description: 'JSON text loaded into input area.'
          });
          return;
        }
      }
    } catch (e) {
      // Fallback
    }
    showToast({
      type: 'info',
      title: 'Paste JSON',
      description: 'Long press in the text box below and select Paste.'
    });
  };

  const handleConfirmImport = async () => {
    const contentToImport = importTab === 'file' ? importFileContent : pastedJson;
    if (!contentToImport || !contentToImport.trim()) {
      showToast({
        type: 'error',
        title: 'No Data',
        description: 'Please select a JSON file or paste backup JSON text.'
      });
      return;
    }

    try {
      setIsImporting(true);
      const result = await importJSONBackup(contentToImport, importMode);
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Import Successful',
          description: result.message
        });
        setIsImportOpen(false);
        setImportFileContent(null);
        setImportFileName(null);
        setPastedJson('');
      } else {
        showToast({
          type: 'error',
          title: 'Import Failed',
          description: result.message
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Import Error',
        description: err.message || 'An unexpected error occurred during import.'
      });
    } finally {
      setIsImporting(false);
    }
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
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Data Export & Backup
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Transfer data wirelessly via QR code between devices or download JSON/CSV backups.
          </p>
        </div>

        {/* QR Code Sync */}
        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-xs font-bold">
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Wireless QR Code Transfer (Phone-to-Phone)</span>
          </div>
          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
            Export all or selected groups/friends as a QR code and scan directly with another device's camera.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button onClick={() => setIsQRExportOpen(true)} variant="primary" size="sm">
              <QrCode className="w-4 h-4" />
              <span>Export via QR Code</span>
            </Button>

            <Button onClick={() => setIsQRImportOpen(true)} variant="outline" size="sm">
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Scan QR Code to Import</span>
            </Button>
          </div>
        </div>

        {/* File Based Export */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
            File Backups
          </span>
          <div className="flex flex-wrap gap-3">
            <Button onClick={exportJSONBackup} variant="outline" size="sm">
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Export JSON Backup</span>
            </Button>

            <Button onClick={exportCSV} variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Export CSV Report</span>
            </Button>

            <Button onClick={() => setIsImportOpen(true)} variant="outline" size="sm">
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Import JSON Backup</span>
            </Button>
          </div>
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

      {/* Enhanced Universal Mobile-Friendly Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportFileContent(null);
          setImportFileName(null);
          setPastedJson('');
        }}
        title="Import Backup Data"
        subtitle="Restore from JSON file or paste backup text"
      >
        <div className="space-y-4">
          {/* Tabs: Choose File vs Paste JSON */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setImportTab('file')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                importTab === 'file'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Select File</span>
            </button>

            <button
              type="button"
              onClick={() => setImportTab('paste')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                importTab === 'paste'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste JSON Text</span>
            </button>
          </div>

          {/* Tab 1: File Upload with Android Full-Document Support */}
          {importTab === 'file' ? (
            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl cursor-pointer bg-indigo-50/30 dark:bg-indigo-950/20 transition-all text-center">
                <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {importFileName ? importFileName : 'Tap here to choose JSON file'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Works with Downloads, Google Drive & Android Files (.json / .txt)
                </span>
                {/* Accept multiple document MIME types for 100% Android & iOS support */}
                <input
                  type="file"
                  accept=".json,application/json,text/plain,*/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            /* Tab 2: Paste JSON Text */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Paste Backup JSON Content:
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Paste from Clipboard
                </button>
              </div>
              <textarea
                rows={5}
                value={pastedJson}
                onChange={e => setPastedJson(e.target.value)}
                placeholder='Paste your backup JSON here, e.g. {"friends": [...], "transactions": [...]}'
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Live Validation & Record Count Badge */}
          {preview && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                preview.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}
            >
              {preview.isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>
                    Valid backup detected: <strong>{preview.friendsCount}</strong> friends,{' '}
                    <strong>{preview.transactionsCount}</strong> transactions,{' '}
                    <strong>{preview.groupsCount}</strong> groups.
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{preview.error}</span>
                </>
              )}
            </div>
          )}

          {/* Import Mode Selector */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Choose Import Mode:
            </p>

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

          {/* Actions - Sticky at bottom */}
          <div className="sticky -bottom-5 bg-white dark:bg-slate-900 pt-3 pb-3 -mx-5 px-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 z-10 shadow-lg">
            <Button
              variant="ghost"
              onClick={() => {
                setIsImportOpen(false);
                setImportFileContent(null);
                setImportFileName(null);
                setPastedJson('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmImport}
              disabled={!preview || !preview.isValid || isImporting}
            >
              {isImporting ? 'Importing...' : 'Confirm & Import'}
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

      <QRExportModal
        isOpen={isQRExportOpen}
        onClose={() => setIsQRExportOpen(false)}
      />

      <QRImportModal
        isOpen={isQRImportOpen}
        onClose={() => setIsQRImportOpen(false)}
        onImportSuccess={() => {
          showToast({
            type: 'success',
            title: 'Database Synced',
            description: 'New data has been successfully imported from QR code.'
          });
        }}
      />
    </div>
  );
};
