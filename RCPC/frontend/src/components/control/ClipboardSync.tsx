import React, { useState } from 'react';
import { Clipboard, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { api } from '../../services/api';

export const ClipboardSync: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchFromWindows = async () => {
    setLoading(true);
    try {
      const res = await api.getClipboard();
      setText(res.text || '');
    } catch (e) {
      console.error('Failed to get clipboard', e);
    } finally {
      setLoading(false);
    }
  };

  const sendToWindows = async () => {
    if (!text) return;
    setLoading(true);
    try {
      await api.setClipboard(text);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to set clipboard', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Clipboard Synchronization
          </h3>
          <p className="text-[11px] text-slate-500">Secure two-way text exchange with Windows</p>
        </div>
        <div className="p-2 rounded-xl bg-cyan-500/10 text-brand-primary">
          <Clipboard className="w-4 h-4" />
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type or paste text to synchronize..."
        className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-950 border border-dark-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-primary resize-none transition-colors"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={fetchFromWindows}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-dark-950 hover:bg-dark-800 border border-dark-800 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
        >
          <ArrowDown className="w-3.5 h-3.5 text-brand-primary" />
          Fetch from PC
        </button>

        <button
          onClick={sendToWindows}
          disabled={loading || !text}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-primary hover:bg-cyan-400 text-dark-950 text-xs font-bold active:scale-95 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-40"
        >
          {copiedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied to PC!
            </>
          ) : (
            <>
              <ArrowUp className="w-3.5 h-3.5" />
              Send to PC
            </>
          )}
        </button>
      </div>
    </div>
  );
};
