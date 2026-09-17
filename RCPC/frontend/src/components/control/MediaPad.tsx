import React, { useState } from 'react';
import { Volume2, VolumeX, Volume1, Play, Pause, SkipForward, SkipBack, Square } from 'lucide-react';
import { api } from '../../services/api';

export const MediaPad: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const handleVolumeUp = async () => {
    try {
      await api.volumeUp(2);
    } catch (e) {}
  };

  const handleVolumeDown = async () => {
    try {
      await api.volumeDown(2);
    } catch (e) {}
  };

  const handleMuteToggle = async () => {
    try {
      await api.volumeMute();
      setIsMuted(!isMuted);
    } catch (e) {}
  };

  const handlePlayPause = async () => {
    try {
      await api.playPause();
      setIsPlaying(!isPlaying);
    } catch (e) {}
  };

  const handleNext = async () => {
    try {
      await api.mediaNext();
    } catch (e) {}
  };

  const handlePrev = async () => {
    try {
      await api.mediaPrev();
    } catch (e) {}
  };

  const handleStop = async () => {
    try {
      await api.mediaStop();
      setIsPlaying(false);
    } catch (e) {}
  };

  return (
    <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
        Windows Multimedia & Volume
      </h3>

      {/* Volume Controls */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={handleVolumeDown}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-dark-950 hover:bg-dark-800 border border-dark-800 text-slate-200 active:scale-95 transition-all text-xs font-semibold"
        >
          <Volume1 className="w-4 h-4 text-brand-primary" />
          Vol Down
        </button>

        <button
          onClick={handleMuteToggle}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-semibold active:scale-95 transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-dark-950 hover:bg-dark-800 border-dark-800 text-slate-200'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-brand-primary" />}
          {isMuted ? 'Muted' : 'Mute'}
        </button>

        <button
          onClick={handleVolumeUp}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-dark-950 hover:bg-dark-800 border border-dark-800 text-slate-200 active:scale-95 transition-all text-xs font-semibold"
        >
          <Volume2 className="w-4 h-4 text-brand-primary" />
          Vol Up
        </button>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-dark-950 border border-dark-800">
        <button
          onClick={handlePrev}
          className="p-3 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 hover:text-white active:scale-90 transition-transform"
          title="Previous Track"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={handlePlayPause}
          className="p-4 rounded-2xl bg-brand-primary text-dark-950 font-bold hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
          title="Play / Pause"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-dark-950" /> : <Play className="w-6 h-6 fill-dark-950 ml-0.5" />}
        </button>

        <button
          onClick={handleNext}
          className="p-3 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 hover:text-white active:scale-90 transition-transform"
          title="Next Track"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <button
          onClick={handleStop}
          className="p-3 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-400 hover:text-red-400 active:scale-90 transition-transform ml-2"
          title="Stop Playback"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
