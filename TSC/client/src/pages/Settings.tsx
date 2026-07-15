import React, { useState, useEffect } from "react";
import { Bell, Moon, Sun, Smartphone, ShieldCheck, HelpCircle } from "lucide-react";

export const Settings: React.FC = () => {
  const [theme, setTheme] = useState<string>(localStorage.getItem("smartsplit_theme") || "dark");
  const [allowPush, setAllowPush] = useState<boolean>(true);
  const [allowEmail, setAllowEmail] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("smartsplit_theme", nextTheme);
    
    // Toggle class on document
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("PWA is already installed or your browser doesn't support manual installation prompts.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-24 md:pb-6 select-none max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Global Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">Customize themes, notifications, and application preferences.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Theme Settings */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5 pb-2">
            App Appearance
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex gap-2.5 items-center">
              {theme === "dark" ? <Moon className="text-primary" size={18} /> : <Sun className="text-amber-500" size={18} />}
              <div>
                <h4 className="text-xs font-bold text-white">Application Theme</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">Toggle between dark mode obsidian and default theme</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3.5 py-1.5 bg-secondary hover:bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors"
            >
              {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            </button>
          </div>
        </div>

        {/* Notifications Preferences */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5 pb-2">
            Notification Settings
          </h3>

          {/* Push Toggles */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5 items-center">
              <Bell className="text-gray-400" size={18} />
              <div>
                <h4 className="text-xs font-bold text-white">Push Notifications</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">Alerts when transactions are added or settled</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowPush}
              onChange={(e) => setAllowPush(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-white/10 cursor-pointer accent-primary"
            />
          </div>

          {/* Email Toggles */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5 items-center">
              <Smartphone className="text-gray-400" size={18} />
              <div>
                <h4 className="text-xs font-bold text-white">Email Reminders</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">Get weekly balance digests via registered email</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowEmail}
              onChange={(e) => setAllowEmail(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-white/10 cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* PWA Install Trigger */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5 pb-2">
            PWA Device Integration
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex gap-2.5 items-center">
              <Smartphone className="text-primary" size={18} />
              <div>
                <h4 className="text-xs font-bold text-white">Install Desktop/Mobile App</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">Add SmartSplit to your home screen for quick offline access</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              disabled={!deferredPrompt}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                deferredPrompt
                  ? "bg-primary hover:bg-primary-hover text-white shadow-md"
                  : "bg-secondary text-gray-600 border border-white/5 cursor-not-allowed"
              }`}
            >
              Install App
            </button>
          </div>
        </div>

        {/* Legal / Security Summary */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5 pb-2">
            System & Security
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>End-to-End JWT authentication enabled</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <HelpCircle size={14} className="text-primary" />
            <span>Version: SmartSplit PWA v1.0.0 Production-Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
