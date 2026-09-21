import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../context/ToastContext';
import {
  startPCReceiver,
  formatPairingQR,
  SyncConnectionStatus,
  ReceiverController
} from '../../services/p2pSync';
import { importJSONBackup, BackupData } from '../../utils/exportImport';
import {
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Users,
  User,
  Receipt,
  Wifi,
  Sparkles
} from 'lucide-react';

interface PCReceiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const PCReceiverModal: React.FC<PCReceiverModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const { showToast } = useToast();

  const [status, setStatus] = useState<SyncConnectionStatus>('INITIALIZING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [receivedData, setReceivedData] = useState<BackupData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [saving, setSaving] = useState(false);

  const controllerRef = useRef<ReceiverController | null>(null);

  const startSession = () => {
    if (controllerRef.current) {
      controllerRef.current.close();
      controllerRef.current = null;
    }

    setReceivedData(null);
    setErrorMsg(null);
    setSessionId('');
    setStatus('INITIALIZING');

    const controller = startPCReceiver(
      (newStatus, err) => {
        setStatus(newStatus);
        if (err) setErrorMsg(err);
      },
      (data) => {
        setReceivedData(data);
      },
      (readySessionId) => {
        setSessionId(readySessionId);
      }
    );

    controllerRef.current = controller;
  };

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      if (controllerRef.current) {
        controllerRef.current.close();
        controllerRef.current = null;
      }
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.close();
        controllerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSaveToDatabase = async () => {
    if (!receivedData) return;

    try {
      setSaving(true);
      const res = await importJSONBackup(JSON.stringify(receivedData), importMode);

      if (res.success) {
        showToast({
          type: 'success',
          title: 'PC Synced Successfully! 🎉',
          description: res.message
        });

        if (onSyncComplete) {
          onSyncComplete();
        }

        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'Save Failed',
          description: res.message
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Saving Data',
        description: err.message || 'Failed to save data on PC.'
      });
    } finally {
      setSaving(false);
    }
  };

  const qrString = sessionId ? formatPairingQR(sessionId) : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sync to PC (WhatsApp Style)"
      subtitle="Scan this monitor using your phone camera to beam data to PC"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Step 1: Received Data Confirmation Screen */}
        {receivedData ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Data Received from Phone!</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                Your phone has sent the selected data over an encrypted peer-to-peer connection.
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <Users className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs text-slate-500 block">Groups</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {receivedData.groups?.length || 0}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <User className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <span className="text-xs text-slate-500 block">Friends</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {receivedData.friends?.length || 0}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <Receipt className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <span className="text-xs text-slate-500 block">Expenses</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {receivedData.transactions?.length || 0}
                </span>
              </div>
            </div>

            {/* Groups list if any */}
            {receivedData.groups && receivedData.groups.length > 0 && (
              <div className="text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Groups Transferred:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {receivedData.groups.map(g => (
                    <span
                      key={g.id}
                      className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
                    >
                      {g.name} ({g.members?.length || 0} members)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Merge vs Replace */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Save Mode for PC
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
                      name="pcImportMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600"
                    />
                    <span className="font-bold text-slate-900 dark:text-white">
                      Merge with PC Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Safe. Adds new records from phone without overwriting unrelated PC data.
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
                      name="pcImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600"
                    />
                    <span className="font-bold text-rose-700 dark:text-rose-400">
                      Replace All PC Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Wipes PC database and sets it identical to this phone transfer.
                  </p>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startSession}
                disabled={saving}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pair Again</span>
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save & Sync on PC'}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Pairing Screen with QR Code */
          <div className="space-y-4 text-center">
            {/* Live Status Header */}
            <div className="flex items-center justify-center gap-2 text-xs font-semibold">
              {status === 'INITIALIZING' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting secure connection...</span>
                </div>
              )}

              {status === 'WAITING_FOR_SCAN' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold animate-pulse">
                  <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ready! Waiting for phone to scan this monitor...</span>
                </div>
              )}

              {status === 'CONNECTED' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Phone Paired! Waiting for data transfer...</span>
                </div>
              )}

              {status === 'TRANSFERRING' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Receiving data from phone...</span>
                </div>
              )}

              {status === 'ERROR' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Connection error</span>
                </div>
              )}
            </div>

            {/* QR Code Container */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl inline-block shadow-sm">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
                {qrString && status !== 'INITIALIZING' ? (
                  <QRCodeSVG
                    value={qrString}
                    size={240}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[240px] h-[240px] flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Starting secure sync session...
                    </span>
                    <span className="text-[11px] text-slate-400">
                      QR code will appear in a moment
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>How to link your phone:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1 text-[11px]">
                <li>Open SettleMate on your <strong>Phone</strong>.</li>
                <li>Go to <strong>Settings → Send to PC (Scan Monitor)</strong>.</li>
                <li>Point your phone camera at this QR code on your PC monitor.</li>
                <li>Choose what to export and tap <strong>"Send to PC"</strong>.</li>
              </ol>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
                {errorMsg}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={startSession}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Reconnecting</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
