import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Html5Qrcode } from 'html5-qrcode';
import { useFriends } from '../../hooks/useFriends';
import { useGroups } from '../../hooks/useGroups';
import { useTransactions } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import {
  parsePairingQR,
  connectPhoneToPC,
  SyncConnectionStatus,
  SenderController
} from '../../services/p2pSync';
import {
  ExportScope,
  filterExportPayload
} from '../../utils/qrDataTransfer';
import { BackupData } from '../../utils/exportImport';
import { db } from '../../db/database';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  User,
  Database,
  Wallet,
  Send,
  RotateCcw,
  Monitor
} from 'lucide-react';

interface PhoneSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedGroupId?: string;
}

export const PhoneSenderModal: React.FC<PhoneSenderModalProps> = ({
  isOpen,
  onClose,
  preselectedGroupId
}) => {
  const { friends, activeFriends } = useFriends();
  const { groups } = useGroups();
  const { transactions } = useTransactions();
  const { showToast } = useToast();

  const [step, setStep] = useState<'SCAN' | 'SELECT' | 'SENDING' | 'SUCCESS'>('SCAN');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SyncConnectionStatus>('INITIALIZING');

  // Scope selection state
  const [scope, setScope] = useState<ExportScope>(preselectedGroupId ? 'GROUPS' : 'ALL');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    preselectedGroupId ? [preselectedGroupId] : groups.map(g => g.id)
  );
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(activeFriends.map(f => f.id));
  const [includePersonalExpenses, setIncludePersonalExpenses] = useState(false);

  // Sync selection lists when groups and friends finish loading from Dexie
  useEffect(() => {
    if (selectedGroupIds.length === 0 && groups.length > 0) {
      setSelectedGroupIds(groups.map(g => g.id));
    }
  }, [groups]);

  useEffect(() => {
    if (selectedFriendIds.length === 0 && activeFriends.length > 0) {
      setSelectedFriendIds(activeFriends.map(f => f.id));
    }
  }, [activeFriends]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const senderControllerRef = useRef<SenderController | null>(null);
  const scannerContainerId = 'phone-to-pc-qr-reader';

  // Base data object
  const allData: BackupData = useMemo(() => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    friends: friends && friends.length > 0 ? friends : activeFriends,
    groups,
    transactions
  }), [friends, activeFriends, groups, transactions]);

  // Filtered payload
  const filteredPayload = useMemo(() => {
    return filterExportPayload(allData, {
      scope,
      selectedGroupIds,
      selectedFriendIds,
      includePersonalExpenses
    });
  }, [allData, scope, selectedGroupIds, selectedFriendIds, includePersonalExpenses]);

  // Start camera scanner
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
          handleScannedQRCode(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access camera on this phone.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
  };

  // Handle scanned QR from PC monitor
  const handleScannedQRCode = async (decodedText: string) => {
    const sessionId = parsePairingQR(decodedText);
    if (!sessionId) {
      showToast({
        type: 'error',
        title: 'Not a PC Pairing Code',
        description: 'Please scan the pairing QR code shown on your PC monitor.'
      });
      return;
    }

    await stopCamera();
    setTargetSessionId(sessionId);
    setStep('SELECT');

    // Connect WebRTC to PC
    const controller = connectPhoneToPC(
      sessionId,
      (newStatus) => {
        setConnectionStatus(newStatus);
      },
      () => {
        setStep('SUCCESS');
      }
    );

    senderControllerRef.current = controller;
  };

  // Trigger data send
  const handleSendToPC = async () => {
    const controller = senderControllerRef.current;
    if (!controller) {
      showToast({
        type: 'error',
        title: 'Connection Lost',
        description: 'WebRTC connection to PC is not active. Please tap Rescan.'
      });
      return;
    }

    try {
      setStep('SENDING');

      // Fetch fresh records directly from Dexie so 100% of all data is included
      const [allTxs, allFrs, allGrps] = await Promise.all([
        db.transactions.toArray(),
        db.friends.toArray(),
        db.groups.toArray()
      ]);

      const freshAllData: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        friends: allFrs,
        groups: allGrps,
        transactions: allTxs
      };

      const payloadToSend = filterExportPayload(freshAllData, {
        scope,
        selectedGroupIds,
        selectedFriendIds,
        includePersonalExpenses
      });

      await controller.sendPayload(payloadToSend);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Transfer Failed',
        description: err?.message || 'Could not send data to PC.'
      });
      setStep('SELECT');
    }
  };

  const handleReset = () => {
    if (senderControllerRef.current) {
      senderControllerRef.current.close();
      senderControllerRef.current = null;
    }
    setStep('SCAN');
    setTargetSessionId(null);
    setTimeout(() => startCamera(), 150);
  };

  // Camera management: only active when modal is open and in SCAN step
  useEffect(() => {
    if (isOpen && step === 'SCAN') {
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
  }, [isOpen, step]);

  // WebRTC controller cleanup: only when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      if (senderControllerRef.current) {
        senderControllerRef.current.close();
        senderControllerRef.current = null;
      }
    }

    return () => {
      if (senderControllerRef.current) {
        senderControllerRef.current.close();
        senderControllerRef.current = null;
      }
    };
  }, [isOpen]);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const toggleFriend = (id: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        if (senderControllerRef.current) senderControllerRef.current.close();
        onClose();
      }}
      title="Send Data to PC (WhatsApp Style)"
      subtitle="Point camera at your PC monitor to beam data"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Step 1: Camera Scanner */}
        {step === 'SCAN' && (
          <div className="space-y-3 text-center">
            <div
              id={scannerContainerId}
              className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-square flex items-center justify-center relative"
            />

            {cameraError ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                <span>{cameraError}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Align the pairing QR code from your <strong>PC screen</strong> inside the viewfinder.
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Data to Send */}
        {step === 'SELECT' && (
          <div className="space-y-4">
            {/* Connection Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
              connectionStatus === 'CONNECTED'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                : connectionStatus === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
            }`}>
              <div className="flex items-center gap-2">
                <Monitor className={`w-4 h-4 ${
                  connectionStatus === 'CONNECTED'
                    ? 'text-emerald-600'
                    : connectionStatus === 'ERROR'
                    ? 'text-rose-600'
                    : 'text-indigo-600'
                }`} />
                <span className={`text-xs font-bold ${
                  connectionStatus === 'CONNECTED'
                    ? 'text-emerald-950 dark:text-emerald-200'
                    : connectionStatus === 'ERROR'
                    ? 'text-rose-950 dark:text-rose-200'
                    : 'text-indigo-950 dark:text-indigo-200'
                }`}>
                  {connectionStatus === 'CONNECTED'
                    ? 'Connected to PC!'
                    : connectionStatus === 'ERROR'
                    ? 'Connection Error'
                    : 'Connecting to PC...'}
                </span>
              </div>

              {connectionStatus === 'CONNECTED' ? (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>P2P Ready</span>
                </span>
              ) : connectionStatus === 'ERROR' ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Rescan
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Connecting...</span>
                </span>
              )}
            </div>

            {/* Scope Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              {[
                { id: 'ALL', label: 'All Data', icon: Database },
                { id: 'GROUPS', label: 'By Group', icon: Users },
                { id: 'FRIENDS', label: 'By Friend', icon: User },
                { id: 'PERSONAL_ONLY', label: 'Personal Only', icon: Wallet }
              ].map(tab => {
                const Icon = tab.icon;
                const active = scope === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setScope(tab.id as ExportScope)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scope: ALL Info Card */}
            {scope === 'ALL' && (
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-left space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-950 dark:text-indigo-200">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Full Database Backup (All Data Selected)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every single record will be transferred: all 1-on-1 friend splits, all group trips, personal expenses, settlements, loans, and categories.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-bold">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
                    <span className="text-slate-400 font-normal block text-[10px]">Friends</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{filteredPayload.friends.length}</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
                    <span className="text-slate-400 font-normal block text-[10px]">Groups</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{filteredPayload.groups.length}</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
                    <span className="text-slate-400 font-normal block text-[10px]">Total Expenses</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{filteredPayload.transactions.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Group Selection */}
            {scope === 'GROUPS' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 max-h-36 overflow-y-auto">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Groups:
                </span>
                {groups.map(g => (
                  <label
                    key={g.id}
                    className="flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        className="rounded text-indigo-600"
                      />
                      <span className="truncate">{g.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {g.members.length} members
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Friend Selection */}
            {scope === 'FRIENDS' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 max-h-36 overflow-y-auto">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Friends:
                </span>
                {activeFriends.map(f => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriendIds.includes(f.id)}
                      onChange={() => toggleFriend(f.id)}
                      className="rounded text-indigo-600"
                    />
                    <span className="truncate">{f.name}</span>
                  </label>
                ))}
              </div>
            )}

            {(scope === 'GROUPS' || scope === 'FRIENDS') && (
              <label className="flex items-center gap-2 text-xs cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includePersonalExpenses}
                  onChange={e => setIncludePersonalExpenses(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Include your personal expenses</span>
              </label>
            )}

            {/* Payload preview pills */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Will Send:</span>
              <div className="flex gap-2 font-bold text-slate-900 dark:text-white">
                <span>{filteredPayload.groups.length} Groups</span>
                <span>•</span>
                <span>{filteredPayload.friends.length} Friends</span>
                <span>•</span>
                <span>{filteredPayload.transactions.length} Expenses</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rescan</span>
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSendToPC}
                  disabled={connectionStatus === 'ERROR'}
                >
                  {connectionStatus === 'CONNECTING' || connectionStatus === 'INITIALIZING' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send to PC</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sending Screen */}
        {step === 'SENDING' && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Beaming Data to PC...
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Streaming encrypted peer-to-peer data directly to your monitor session.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Success Screen */}
        {step === 'SUCCESS' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Sent to PC Successfully! 🎉
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Your data has arrived on your PC monitor. Look at your PC screen to confirm and view the updated records.
              </p>
            </div>
            <div className="pt-2">
              <Button type="button" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
