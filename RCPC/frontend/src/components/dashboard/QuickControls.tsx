import React, { useState } from 'react';
import { Lock, Moon, RotateCcw, Power } from 'lucide-react';
import { api } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useApp } from '../../context/AppContext';

export const QuickControls: React.FC = () => {
  const { status } = useApp();
  const [activeModal, setActiveModal] = useState<'sleep' | 'restart' | 'shutdown' | null>(null);

  const handleLock = async () => {
    try {
      await api.lock();
    } catch (e) {
      console.error('Lock error', e);
    }
  };

  const handleSleep = async () => {
    try {
      await api.sleep();
    } finally {
      setActiveModal(null);
    }
  };

  const handleRestart = async () => {
    try {
      await api.restart(5);
    } finally {
      setActiveModal(null);
    }
  };

  const handleShutdown = async () => {
    try {
      await api.shutdown(5);
    } finally {
      setActiveModal(null);
    }
  };

  return (
    <>
      <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Quick Power & System Controls
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Lock */}
          <button
            onClick={handleLock}
            disabled={status !== 'connected'}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-950/80 hover:bg-dark-800 border border-dark-800 text-slate-200 hover:text-white transition-all active:scale-95 disabled:opacity-40"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-brand-primary mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Lock PC</span>
            <span className="text-[10px] text-slate-500">Instant lock</span>
          </button>

          {/* Sleep */}
          <button
            onClick={() => setActiveModal('sleep')}
            disabled={status !== 'connected'}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-950/80 hover:bg-dark-800 border border-dark-800 text-slate-200 hover:text-white transition-all active:scale-95 disabled:opacity-40"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2">
              <Moon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Sleep</span>
            <span className="text-[10px] text-slate-500">Low-power</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => setActiveModal('restart')}
            disabled={status !== 'connected'}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-950/80 hover:bg-dark-800 border border-dark-800 text-slate-200 hover:text-white transition-all active:scale-95 disabled:opacity-40"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 mb-2">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Restart</span>
            <span className="text-[10px] text-slate-500">5s timer</span>
          </button>

          {/* Shutdown */}
          <button
            onClick={() => setActiveModal('shutdown')}
            disabled={status !== 'connected'}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-950/80 hover:bg-red-950/20 border border-dark-800 hover:border-red-500/30 text-slate-200 hover:text-red-400 transition-all active:scale-95 disabled:opacity-40"
          >
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 mb-2">
              <Power className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Shutdown</span>
            <span className="text-[10px] text-slate-500">Power off</span>
          </button>
        </div>
      </div>

      {/* Sleep Confirmation */}
      <ConfirmModal
        isOpen={activeModal === 'sleep'}
        title="Put PC to Sleep?"
        message="This will suspend running processes and put your Windows laptop into low-power sleep mode. You may need to wake it physically or via Wake-on-LAN."
        confirmLabel="Sleep PC"
        onConfirm={handleSleep}
        onCancel={() => setActiveModal(null)}
      />

      {/* Restart Confirmation */}
      <ConfirmModal
        isOpen={activeModal === 'restart'}
        title="Restart Windows PC?"
        message="Your laptop will restart in 5 seconds. Unsaved work in open desktop applications may be lost."
        confirmLabel="Restart Now"
        isDangerous={true}
        onConfirm={handleRestart}
        onCancel={() => setActiveModal(null)}
      />

      {/* Shutdown Confirmation */}
      <ConfirmModal
        isOpen={activeModal === 'shutdown'}
        title="Shut Down Windows PC?"
        message="This will completely power off your Windows laptop in 5 seconds. RCPC connection will be terminated."
        confirmLabel="Shut Down"
        isDangerous={true}
        onConfirm={handleShutdown}
        onCancel={() => setActiveModal(null)}
      />
    </>
  );
};
