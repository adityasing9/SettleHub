import React, { useState, useMemo, useRef } from 'react';
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
  FileJson
} from 'lucide-react';

interface QRExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: ExportScope;
  preselectedGroupId?: string;
  preselectedFriendId?: string;
}

export const QRExportModal: React.FC<QRExportModalProps> = ({
  isOpen,
  onClose,
  initialScope = 'ALL',
  preselectedGroupId,
  preselectedFriendId
}) => {
  const { activeFriends } = useFriends();
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
  const qrRef = useRef<HTMLDivElement>(null);

  // Full backup data representation
  const allData: BackupData = useMemo(() => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    friends: activeFriends,
    groups,
    transactions
  }), [activeFriends, groups, transactions]);

  // Filtered payload based on sender selection
  const filteredPayload = useMemo(() => {
    return filterExportPayload(allData, {
      scope,
      selectedGroupIds,
      selectedFriendIds,
      includePersonalExpenses
    });
  }, [allData, scope, selectedGroupIds, selectedFriendIds, includePersonalExpenses]);

  // Packed QR string with deflate compression
  const qrPayload = useMemo(() => {
    try {
      return packQRData(filteredPayload);
    } catch {
      return '';
    }
  }, [filteredPayload]);

  const payloadSizeBytes = qrPayload.length;
  const isLarge = payloadSizeBytes > 2200;

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

  // Copy QR text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      showToast({
        type: 'success',
        title: 'Copied to Clipboard',
        description: 'QR Code payload copied. You can send it directly to another device.'
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

        const a = document.createElement('a');
        a.download = `SettleMate_QR_Export_${new Date().toISOString().slice(0, 10)}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();

        showToast({
          type: 'success',
          title: 'QR Image Downloaded',
          description: 'Share this QR image with your friend via WhatsApp or messaging app.'
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
            <span
              className={`px-2.5 py-1 rounded-full font-bold ${
                isLarge
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {payloadSizeBytes} bytes compressed
            </span>
          </div>

          {/* Size Warning if large */}
          {isLarge && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Data is large ({payloadSizeBytes} bytes). Some phone cameras may take longer to scan. Consider filtering to specific groups or use JSON export below.
              </span>
            </div>
          )}

          {/* QR Render Container */}
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 inline-block"
          >
            {qrPayload ? (
              <QRCodeSVG
                value={qrPayload}
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
            Scan this QR code from SettleMate on another device (via <strong>Settings → Scan QR to Import</strong>) to import directly.
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
              disabled={!qrPayload}
            >
              <Copy className="w-4 h-4" />
              <span>Copy Data</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadJSON}
              disabled={!qrPayload}
            >
              <FileJson className="w-4 h-4" />
              <span>Save JSON</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadQRImage}
              disabled={!qrPayload}
            >
              <Download className="w-4 h-4" />
              <span>Download QR Image</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
