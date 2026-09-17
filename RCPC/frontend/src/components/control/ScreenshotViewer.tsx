import React, { useState } from 'react';
import { Camera, RefreshCw, Maximize2, X, Download } from 'lucide-react';
import { api } from '../../services/api';

export const ScreenshotViewer: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fullScreen, setFullScreen] = useState<boolean>(false);

  const captureScreenshot = async () => {
    setLoading(true);
    try {
      const url = await api.fetchScreenshotBlob();
      setImageUrl(url);
    } catch (e) {
      console.error('Screenshot error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Desktop Screen Capture
          </h3>
          <p className="text-[11px] text-slate-500">Live on-demand snapshot of Windows desktop</p>
        </div>
        <button
          onClick={captureScreenshot}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-primary text-dark-950 text-xs font-bold hover:bg-cyan-400 active:scale-95 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          Capture Screen
        </button>
      </div>

      {imageUrl ? (
        <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-dark-800 aspect-video flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Windows Desktop Snapshot"
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setFullScreen(true)}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <button
              onClick={() => setFullScreen(true)}
              className="p-2 rounded-xl bg-dark-950/80 hover:bg-dark-900 text-white backdrop-blur-md shadow-lg"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={imageUrl}
              download={`rcpc-desktop-${Date.now()}.jpg`}
              className="p-2 rounded-xl bg-dark-950/80 hover:bg-dark-900 text-white backdrop-blur-md shadow-lg"
              title="Download Snapshot"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-dark-800 p-8 flex flex-col items-center justify-center text-center">
          <Camera className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 font-medium">No screenshot captured yet</p>
          <p className="text-[11px] text-slate-500 mt-1">Tap "Capture Screen" to view Windows display</p>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {fullScreen && imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2">
            <span className="text-xs font-mono text-slate-400">Windows Desktop Snapshot</span>
            <button
              onClick={() => setFullScreen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-dark-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img src={imageUrl} alt="Windows Desktop" className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
