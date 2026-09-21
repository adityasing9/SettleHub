import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../../context/ToastContext';
import { unpackQRData, processQRScan } from '../../utils/qrDataTransfer';
import { importJSONBackup, BackupData } from '../../utils/exportImport';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Receipt,
  RotateCcw,
  FileText
} from 'lucide-react';

interface QRImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const QRImportModal: React.FC<QRImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const { showToast } = useToast();

  const [scanMode, setScanMode] = useState<'CAMERA' | 'FILE' | 'PASTE'>('CAMERA');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Scanned payload preview state
  const [scannedData, setScannedData] = useState<BackupData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);

  // Multi-part scanning state
  const partsMapRef = useRef<Map<number, string>>(new Map());
  const currentTagRef = useRef<string | undefined>(undefined);
  const [multiPartProgress, setMultiPartProgress] = useState<{ current: number; total: number } | null>(null);

  // Paste text state
  const [pastedText, setPastedText] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'settlemate-qr-reader';

  // Process decoded QR text (handles both single and multi-part QR codes)
  const handleDecodedText = (decodedText: string) => {
    try {
      const res = processQRScan(decodedText, partsMapRef.current, currentTagRef.current);
      if (res.tag) currentTagRef.current = res.tag;

      if (!res.isComplete) {
        if (res.totalParts > 1) {
          setMultiPartProgress({ current: res.partsCount, total: res.totalParts });
          if ('vibrate' in navigator) {
            try { navigator.vibrate(80); } catch {}
          }
          showToast({
            type: 'info',
            title: `Part ${res.currentPart} of ${res.totalParts} Scanned`,
            description: `Keep pointing camera at screen to scan remaining parts (${res.partsCount}/${res.totalParts} captured).`
          });
        }
        return; // Keep camera scanning for remaining parts
      }

      const data = res.payload;
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data decoded from QR code.');
      }

      const friendCount = data.friends?.length || 0;
      const groupCount = data.groups?.length || 0;
      const txCount = data.transactions?.length || 0;

      if (friendCount === 0 && groupCount === 0 && txCount === 0) {
        throw new Error('QR code does not contain any friends, groups, or transactions.');
      }

      // Stop camera if running
      stopCamera();

      setMultiPartProgress(null);
      partsMapRef.current.clear();
      currentTagRef.current = undefined;

      setScannedData(data);
      if ('vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100]); } catch {}
      }

      showToast({
        type: 'success',
        title: res.totalParts > 1 ? `All ${res.totalParts} Parts Received! 🎉` : 'QR Code Scanned!',
        description: `Found ${groupCount} groups, ${friendCount} friends, and ${txCount} transactions.`
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Invalid QR Code',
        description: err.message || 'The scanned QR code is not a valid SettleMate payload.'
      });
    }
  };

  // Start live camera scanner
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // Frame parse error ignored
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      setIsScanning(false);
      setCameraError(
        err?.message || 'Camera permission denied or camera not available on this device.'
      );
    }
  };

  // Stop camera scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  // Handle image file scan
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      const decodedText = await html5QrCode.scanFile(file, true);
      handleDecodedText(decodedText);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'QR Not Found in Image',
        description: 'Unable to detect a valid QR code in the uploaded image. Please try another image.'
      });
    }
  };

  // Start/Stop camera on modal open/close or scanMode change
  useEffect(() => {
    if (isOpen && scanMode === 'CAMERA' && !scannedData) {
      // Small timeout to allow DOM container to render
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode, scannedData]);

  // Execute database import
  const handleConfirmImport = async () => {
    if (!scannedData) return;

    try {
      setImporting(true);
      const res = await importJSONBackup(JSON.stringify(scannedData), importMode);

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Import Successful!',
          description: res.message
        });

        if (onImportSuccess) {
          onImportSuccess();
        }

        // Close modal after import
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'Import Failed',
          description: res.message
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Import Error',
        description: err.message || 'Failed to save imported data into database.'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleResetScan = () => {
    setScannedData(null);
    setMultiPartProgress(null);
    partsMapRef.current.clear();
    currentTagRef.current = undefined;
    if (scanMode === 'CAMERA') {
      setTimeout(() => startCamera(), 100);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        setMultiPartProgress(null);
        partsMapRef.current.clear();
        currentTagRef.current = undefined;
        onClose();
      }}
      title="Import Data via QR Code"
      subtitle="Scan a QR code from another device to import data"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* If data is scanned, show Preview & Confirmation Screen */}
        {scannedData ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>QR Code Validated & Ready to Import</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                The QR code contains valid SettleMate expense data. Review the summary below:
              </p>
            </div>

            {/* Discovered Entities Summary */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <Users className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs text-slate-500 block">Groups</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {scannedData.groups?.length || 0}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <User className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <span className="text-xs text-slate-500 block">Friends</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {scannedData.friends?.length || 0}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <Receipt className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <span className="text-xs text-slate-500 block">Expenses</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {scannedData.transactions?.length || 0}
                </span>
              </div>
            </div>

            {/* Group Names Preview if any */}
            {scannedData.groups && scannedData.groups.length > 0 && (
              <div className="text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Groups Included:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {scannedData.groups.map(g => (
                    <span
                      key={g.id}
                      className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
                    >
                      {g.name} ({g.members.length} members)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Import Mode Options */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Choose Import Action
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    importMode === 'merge'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600"
                    />
                    <span className="font-bold text-slate-900 dark:text-white">
                      Merge with Existing Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Recommended. Adds new records and updates matches without deleting your current data.
                  </p>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-rose-600 bg-rose-50/60 dark:bg-rose-950/50 dark:border-rose-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600"
                    />
                    <span className="font-bold text-rose-700 dark:text-rose-400">
                      Replace All Local Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Caution: Wipes your existing database and replaces it completely with this payload.
                  </p>
                </label>
              </div>
            </div>

            {/* Confirmation Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetScan}
                disabled={importing}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Scan Another</span>
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={handleConfirmImport}
                  disabled={importing}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importing ? 'Importing...' : 'Confirm Import'}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Scanning Screen */
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScanMode('CAMERA')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  scanMode === 'CAMERA'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setScanMode('FILE');
                }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  scanMode === 'FILE'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Screenshot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setScanMode('PASTE');
                }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  scanMode === 'PASTE'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
            </div>

            {/* Camera View */}
            {scanMode === 'CAMERA' && (
              <div className="space-y-3">
                <div className="relative w-full max-w-sm mx-auto">
                  <div
                    id={scannerContainerId}
                    className="w-full overflow-hidden rounded-2xl bg-black aspect-square flex items-center justify-center relative"
                  >
                    {!isScanning && !cameraError && (
                      <div className="text-xs text-white/70 animate-pulse">
                        Initializing camera...
                      </div>
                    )}
                  </div>

                  {multiPartProgress && (
                    <div className="absolute top-3 left-3 right-3 z-10 bg-indigo-950/90 text-white p-2.5 rounded-xl text-xs backdrop-blur-xs border border-indigo-400/40 shadow-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span className="font-semibold">
                          Multi-Part QR: Captured {multiPartProgress.current} of {multiPartProgress.total}
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-300 font-bold">
                        {Math.round((multiPartProgress.current / multiPartProgress.total) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Camera Access Unavailable</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setScanMode('FILE')}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload QR Code Image Instead</span>
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Point your camera directly at the SettleMate QR code on the other screen.
                </p>
              </div>
            )}

            {/* File Upload View */}
            {scanMode === 'FILE' && (
              <div className="space-y-4">
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to choose QR screenshot or photo
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, WEBP formats supported
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                <div id={scannerContainerId} className="hidden" />
              </div>
            )}

            {/* Paste Text View */}
            {scanMode === 'PASTE' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Paste Encoded Payload (SMQR:... or JSON)
                  </label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="SMQR:..."
                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!pastedText.trim()}
                    onClick={() => handleDecodedText(pastedText)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Decode & Preview</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
