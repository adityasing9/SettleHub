import React, { useState, useRef } from 'react';
import { MousePointer, Keyboard, CornerDownLeft, Delete, Space, ArrowUp, ArrowDown } from 'lucide-react';
import { wsService } from '../../services/websocket';

export const Touchpad: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [keyboardText, setKeyboardText] = useState<string>('');
  
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Mouse click
  const handleMouseClick = (button: 'left' | 'right', action: 'click' = 'click') => {
    if (!isActive) return;
    wsService.sendInput({
      type: 'input.mouse.click',
      button,
      action
    });
  };

  // Touch tracking for cursor movement
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive || e.touches.length === 0) return;
    const touch = e.touches[0];
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive || e.touches.length === 0 || !lastTouchRef.current) return;
    
    e.preventDefault();

    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchRef.current.x;
    const dy = touch.clientY - lastTouchRef.current.y;

    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      wsService.sendInput({
        type: 'input.mouse.move',
        dx,
        dy,
        sensitivity
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
  };

  // Scroll wheel strip
  const scrollLastY = useRef<number | null>(null);
  const handleScrollTouchMove = (e: React.TouchEvent) => {
    if (!isActive || e.touches.length === 0) return;
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    if (scrollLastY.current !== null) {
      const delta = scrollLastY.current - currentY;
      if (Math.abs(delta) > 8) {
        const direction = delta > 0 ? -1 : 1;
        wsService.sendInput({
          type: 'input.mouse.scroll',
          delta: direction
        });
        scrollLastY.current = currentY;
      }
    } else {
      scrollLastY.current = currentY;
    }
  };

  const handleScrollTouchEnd = () => {
    scrollLastY.current = null;
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyboardText) return;
    wsService.sendInput({
      type: 'input.keyboard.text',
      text: keyboardText
    });
    setKeyboardText('');
  };

  const handleSendKey = (key: string) => {
    wsService.sendInput({
      type: 'input.keyboard.key',
      key
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[700px] rounded-3xl bg-dark-900 border border-dark-800 p-4 select-none">
      {/* Top Controls: Status & Sensitivity */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'}`} />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
            {isActive ? 'REMOTE INPUT ACTIVE' : 'INPUT DISABLED'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showKeyboard
                ? 'bg-brand-primary text-dark-950 border-brand-primary font-bold'
                : 'bg-dark-950 hover:bg-dark-800 border-dark-700 text-slate-300'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Keyboard</span>
          </button>

          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isActive
                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {isActive ? 'Pause' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Sensitivity Slider */}
      <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-slate-400">
        <span>Speed:</span>
        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.1"
          value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          className="w-28 h-1 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
        />
        <span className="font-mono text-slate-300">{sensitivity.toFixed(1)}x</span>
      </div>

      {/* Touch Area and Scroll Bar */}
      <div className="flex-1 flex gap-2 my-2 min-h-[250px]">
        {/* Main Touchpad Canvas */}
        <div
          ref={touchAreaRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 rounded-2xl bg-dark-950 border border-dark-800 flex flex-col items-center justify-center relative overflow-hidden cursor-crosshair touchpad-surface shadow-inner"
        >
          <div className="pointer-events-none flex flex-col items-center justify-center opacity-30">
            <MousePointer className="w-12 h-12 text-slate-400 mb-2" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              Touchpad Surface
            </span>
            <span className="text-[10px] text-slate-500 mt-1">
              Drag finger to move cursor
            </span>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        </div>

        {/* Scroll Bar Strip */}
        <div
          onTouchMove={handleScrollTouchMove}
          onTouchEnd={handleScrollTouchEnd}
          className="w-12 rounded-2xl bg-dark-950 border border-dark-800 flex flex-col items-center justify-center relative select-none touchpad-surface cursor-ns-resize shadow-inner"
        >
          <div className="rotate-90 text-[10px] uppercase font-mono tracking-widest text-slate-500 pointer-events-none">
            Scroll
          </div>
        </div>
      </div>

      {/* Left & Right Click Physical Buttons */}
      <div className="grid grid-cols-2 gap-3 h-16 shrink-0">
        <button
          onClick={() => handleMouseClick('left')}
          className="rounded-2xl bg-dark-950 hover:bg-dark-800 active:bg-dark-700 border border-dark-700/80 text-slate-200 font-bold text-sm tracking-wider uppercase flex items-center justify-center shadow-lg transition-transform active:scale-[0.98]"
        >
          Left Click
        </button>

        <button
          onClick={() => handleMouseClick('right')}
          className="rounded-2xl bg-dark-950 hover:bg-dark-800 active:bg-dark-700 border border-dark-700/80 text-slate-200 font-bold text-sm tracking-wider uppercase flex items-center justify-center shadow-lg transition-transform active:scale-[0.98]"
        >
          Right Click
        </button>
      </div>

      {/* Keyboard Drawer */}
      {showKeyboard && (
        <div className="mt-3 p-3 rounded-2xl bg-dark-950 border border-dark-800 animate-fadeIn">
          <form onSubmit={handleSendText} className="flex gap-2 mb-3">
            <input
              type="text"
              value={keyboardText}
              onChange={(e) => setKeyboardText(e.target.value)}
              placeholder="Type text to send to Windows..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-dark-900 border border-dark-700 text-slate-200 focus:outline-none focus:border-brand-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary text-dark-950 font-bold text-xs rounded-xl hover:bg-cyan-400"
            >
              Send
            </button>
          </form>

          {/* Quick Keys */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 text-xs font-mono">
            <button onClick={() => handleSendKey('enter')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 flex items-center justify-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Enter
            </button>
            <button onClick={() => handleSendKey('backspace')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 flex items-center justify-center gap-1">
              <Delete className="w-3 h-3" /> Bksp
            </button>
            <button onClick={() => handleSendKey('space')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 flex items-center justify-center gap-1">
              <Space className="w-3 h-3" /> Space
            </button>
            <button onClick={() => handleSendKey('tab')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300">
              Tab
            </button>
            <button onClick={() => handleSendKey('escape')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300">
              Esc
            </button>
            <button onClick={() => handleSendKey('win')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300">
              Win
            </button>
            <button onClick={() => handleSendKey('up')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 flex items-center justify-center">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleSendKey('down')} className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 flex items-center justify-center">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
