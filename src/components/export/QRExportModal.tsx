import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { useFriends } from '../../hooks/useFriends';
import { useGroups } from '../../hooks/useGroups';
import { useTransactions } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import {
  ExportScope,
  packQRData,
  packQRChunks,
  filterExportPayload
} from '../../utils/qrDataTransfer';
import { BackupData } from '../../utils/exportImport';
import {
  QrCode,
  Download,
  Copy,
  Users,
  User,
  Wallet,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles
} from 'lucide-react';

interface QRExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: ExportScope;
  preselectedGroupId?: string;
  preselectedFriendId?: string;
  onOpenPhoneSender?: () => void;
}

export const QRExportModal: React.FC<QRExportModalProps> = ({
  isOpen,
  onClose,
  initialScope = 'ALL',
  preselectedGroupId,
  preselectedFriendId,
  onOpenPhoneSender
}) => {
  const { friends, activeFriends } = useFriends();
  const { groups } = useGroups();
  const { transactions } = useTransactions();
  const { showToast } = useToast();

  const [scope, setScope] = useState<ExportScope>(
    preselectedGroupId ? 'GROUPS' : preselectedFriendId ? 'FRIENDS' : initialScope
  );

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    preselectedGroupId ? [preselectedGroupId] : groups.map(g => g.id)
  );

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
    preselectedFriendId ? [preselectedFriendId] : activeFriends.map(f => f.id)
  );

  const [includePersonalExpenses, setIncludePersonalExpenses] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [isAutoCycling, setIsAutoCycling] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Sync selection lists when groups and friends finish loading from Dexie
  useEffect(() => {
    if (selectedGroupIds.length === 0 && groups.length > 0 && !preselectedGroupId) {
      setSelectedGroupIds(groups.map(g => g.id));
    }
  }, [groups, preselectedGroupId]);

  useEffect(() => {
    if (selectedFriendIds.length === 0 && activeFriends.length > 0 && !preselectedFriendId) {
      setSelectedFriendIds(activeFriends.map(f => f.id));
    }
  }, [activeFriends, preselectedFriendId]);

  // Full backup data representation (uses all friends so no references are lost)
  const allData: BackupData = useMemo(() => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    friends: friends && friends.length > 0 ? friends : activeFriends,
    groups,
    transactions
  }), [friends, activeFriends, groups, transactions]);

  // Filtered payload based on sender selection
  const filteredPayload = useMemo(() => {
    return filterExportPayload(allData, {
      scope,
      selectedGroupIds,
      selectedFriendIds,
      includePersonalExpenses
    });
  }, [allData, scope, selectedGroupIds, selectedFriendIds, includePersonalExpenses]);

  // Generate chunks that never exceed QR capacity (capped at 1400 chars per chunk)
  const qrChunks = useMemo(() => {
    try {
      return packQRChunks(filteredPayload, 1400);
    } catch {
      return [];
    }
  }, [filteredPayload]);

  const activeQRPayload = qrChunks[activeChunkIndex] || '';
  const totalSizeBytes = useMemo(() => {
    return qrChunks.reduce((acc, c) => acc + c.length, 0);
  }, [qrChunks]);

  const isMultiPart = qrChunks.length > 1;

  // Reset chunk index when filter options change
  useEffect(() => {
    setActiveChunkIndex(0);
  }, [scope, selectedGroupIds, selectedFriendIds, includePersonalExpenses]);

  // Slideshow auto-advance for multi-part QR codes
  useEffect(() => {
    if (!isAutoCycling || qrChunks.length <= 1) return;
    const interval = setInterval(() => {
      setActiveChunkIndex(prev => (prev + 1) % qrChunks.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [isAutoCycling, qrChunks.length]);

  // Toggle group selection
  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  // Toggle friend selection
  const toggleFriend = (id: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Copy QR text or JSON
  const handleCopyText = async () => {
    try {
      const textToCopy = qrChunks.length === 1 ? qrChunks[0] : JSON.stringify(filteredPayload, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      showToast({
        type: 'success',
        title: 'Copied to Clipboard',
        description: qrChunks.length === 1 ? 'QR code payload copied.' : 'Full backup JSON copied to clipboard.'
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Copy Failed',
        description: 'Unable to access clipboard.'
      });
    }
  };

  // Download QR Code as PNG Image
  const handleDownloadQRImage = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 40, 40, 520, 520);

        const filename = qrChunks.length > 1
          ? `SettleMate_QR_Part_${activeChunkIndex + 1}_of_${qrChunks.length}_${new Date().toISOString().slice(0, 10)}.png`
          : `SettleMate_QR_Export_${new Date().toISOString().slice(0, 10)}.png`;

        const a = document.createElement('a');
        a.download = filename;
        a.href = canvas.toDataURL('image/png');
        a.click();

        showToast({
          type: 'success',
          title: 'QR Image Downloaded',
          description: isMultiPart
            ? `Part ${activeChunkIndex + 1} of ${qrChunks.length} saved.`
            : 'Share this QR image with your friend via WhatsApp or messaging app.'
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Download filtered JSON file fallback
  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SettleMate_Export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export & Share via QR Code"
      subtitle="Select what you want to share with another device"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Scope Selector Tabs */}
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
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
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

        {/* Scope Granular Controls */}
        {scope === 'GROUPS' && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Select Groups to Export
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedGroupIds(groups.map(g => g.id))}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedGroupIds([])}
                  className="text-slate-500 hover:underline font-semibold"
                >
                  Deselect
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <p className="text-xs text-slate-500">No groups created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {groups.map(g => {
                  const isChecked = selectedGroupIds.includes(g.id);
                  return (
                    <label
                      key={g.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleGroup(g.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{g.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                        {g.members.length} members
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {scope === 'FRIENDS' && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Select Friends to Export
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedFriendIds(activeFriends.map(f => f.id))}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedFriendIds([])}
                  className="text-slate-500 hover:underline font-semibold"
                >
                  Deselect
                </button>
              </div>
            </div>

            {activeFriends.length === 0 ? (
              <p className="text-xs text-slate-500">No friends added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {activeFriends.map(f => {
                  const isChecked = selectedFriendIds.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFriend(f.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{f.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(scope === 'GROUPS' || scope === 'FRIENDS') && (
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={includePersonalExpenses}
              onChange={e => setIncludePersonalExpenses(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Also include your Personal Expenses in this export</span>
          </label>
        )}

        {/* WhatsApp Web Shortcut if large or All Data */}
        {onOpenPhoneSender && (scope === 'ALL' || isMultiPart) && (
          <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:to-indigo-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                  Exporting to PC? Use Instant P2P Sync
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Transfers your entire database wirelessly in 1 tap without scanning multi-part codes.
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => {
                onClose();
                onOpenPhoneSender();
              }}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs shadow-sm w-full sm:w-auto"
            >
              Scan PC Monitor
            </Button>
          </div>
        )}

        {/* QR Code Canvas & Payload Metrics */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-center shadow-xs">
          {/* Summary Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
              {filteredPayload.groups.length} Groups
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
              {filteredPayload.friends.length} Friends
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
              {filteredPayload.transactions.length} Transactions
            </span>
            <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {totalSizeBytes} bytes
            </span>
            {isMultiPart && (
              <span className="px-2.5 py-1 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                {qrChunks.length} QR Parts
              </span>
            )}
          </div>

          {/* Multi-Part Carousel Controls */}
          {isMultiPart && (
            <div className="flex flex-col items-center gap-2.5 w-full max-w-sm p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Part {activeChunkIndex + 1} of {qrChunks.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAutoCycling(!isAutoCycling)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    isAutoCycling
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isAutoCycling ? (
                    <>
                      <Pause className="w-3 h-3 text-emerald-600" />
                      <span>Pause Slideshow</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-indigo-600" />
                      <span>Auto-Cycle (2.5s)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 w-full pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveChunkIndex(prev => (prev - 1 + qrChunks.length) % qrChunks.length)}
                  className="text-xs py-1 px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                  Prev
                </Button>

                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[160px] py-1">
                  {qrChunks.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveChunkIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === activeChunkIndex
                          ? 'bg-indigo-600 w-5'
                          : 'bg-slate-300 dark:bg-slate-600 w-2 hover:bg-slate-400'
                      }`}
                      title={`Part ${i + 1}`}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveChunkIndex(prev => (prev + 1) % qrChunks.length)}
                  className="text-xs py-1 px-2.5"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}

          {/* QR Render Container */}
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 inline-block"
          >
            {activeQRPayload ? (
              <QRCodeSVG
                value={activeQRPayload}
                size={230}
                level="L"
                includeMargin={false}
              />
            ) : (
              <div className="w-[230px] h-[230px] flex items-center justify-center text-xs text-slate-400">
                No items selected to export.
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {isMultiPart ? (
              <span>
                Scan Part 1, then Part 2 and so on with SettleMate on the other device. Or tap <strong>Auto-Cycle</strong> to let it switch automatically.
              </span>
            ) : (
              <span>
                Scan this QR code from SettleMate on another device (via <strong>Settings → Scan QR to Import</strong>) to import directly.
              </span>
            )}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              disabled={!activeQRPayload}
            >
              <Copy className="w-4 h-4" />
              <span>{isMultiPart ? 'Copy Backup JSON' : 'Copy Data'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadJSON}
              disabled={!activeQRPayload}
            >
              <FileJson className="w-4 h-4" />
              <span>Save JSON</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadQRImage}
              disabled={!activeQRPayload}
            >
              <Download className="w-4 h-4" />
              <span>
                {isMultiPart
                  ? `Download Part ${activeChunkIndex + 1}`
                  : 'Download QR Image'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
