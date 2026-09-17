import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { ConnectionCard } from './components/dashboard/ConnectionCard';
import { SystemMetrics } from './components/dashboard/SystemMetrics';
import { QuickControls } from './components/dashboard/QuickControls';
import { MediaPad } from './components/control/MediaPad';
import { ScreenshotViewer } from './components/control/ScreenshotViewer';
import { ClipboardSync } from './components/control/ClipboardSync';
import { Touchpad } from './components/input/Touchpad';
import { NetworkManager } from './components/network/NetworkManager';
import { FileManager } from './components/files/FileManager';
import { AppManager } from './components/apps/AppManager';
import { ActivityLog } from './components/activity/ActivityLog';
import { PairingModal } from './components/pairing/PairingModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { AlertCircle, X } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, notifications, dismissNotification } = useApp();

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <ConnectionCard />
            <SystemMetrics />
            <QuickControls />
            <ClipboardSync />
          </div>
        );
      case 'control':
        return (
          <div className="space-y-6">
            <QuickControls />
            <MediaPad />
            <ScreenshotViewer />
            <ClipboardSync />
          </div>
        );
      case 'input':
        return <Touchpad />;
      case 'network':
        return <NetworkManager />;
      case 'files':
        return <FileManager />;
      case 'apps':
        return <AppManager />;
      case 'activity':
        return <ActivityLog />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-dark-950 pb-20 md:pb-6">
      <Header />

      {/* Floating Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto animate-fadeIn">
          {notifications.map((msg, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-dark-900 border border-brand-primary/30 text-white shadow-2xl backdrop-blur-md text-xs"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-brand-primary shrink-0" />
                <span>{msg}</span>
              </div>
              <button
                onClick={() => dismissNotification(idx)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {renderTab()}
      </main>

      <BottomNav />
      <PairingModal />
      <SettingsModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="flex min-h-screen bg-dark-950 text-slate-100 selection:bg-brand-primary selection:text-dark-950">
        <Sidebar />
        <MainContent />
      </div>
    </AppProvider>
  );
};

export default App;
