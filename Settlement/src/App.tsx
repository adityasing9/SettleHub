import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './views/Dashboard';
import { GroupsView } from './views/GroupsView';
import { BorrowLendView } from './views/BorrowLendView';
import { LedgerView } from './views/LedgerView';
import { OcrScannerView } from './views/OcrScannerView';
import { AnalyticsView } from './views/AnalyticsView';
import { ReportsView } from './views/ReportsView';

function AppContent() {
  // View states
  const [view, setView] = useState('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Inter-view communication action triggers
  const [triggerAction, setTriggerAction] = useState<string | null>(null);

  const handleTriggerAction = (action: string) => {
    setTriggerAction(action);
  };

  const clearTriggerAction = () => {
    setTriggerAction(null);
  };

  // View router
  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            setView={setView}
            setSelectedGroupId={setSelectedGroupId}
            onTriggerAction={handleTriggerAction}
          />
        );
      case 'groups':
        return (
          <GroupsView
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            triggerAction={triggerAction}
            clearTriggerAction={clearTriggerAction}
          />
        );
      case 'borrow-lend':
        return (
          <BorrowLendView
            triggerAction={triggerAction}
            clearTriggerAction={clearTriggerAction}
          />
        );
      case 'ledger':
        return (
          <LedgerView
            triggerAction={triggerAction}
            clearTriggerAction={clearTriggerAction}
          />
        );
      case 'ocr':
        return (
          <OcrScannerView
            setView={setView}
            setSelectedGroupId={setSelectedGroupId}
          />
        );
      case 'analytics':
        return <AnalyticsView />;
      case 'reports':
        return <ReportsView />;
      default:
        return (
          <Dashboard
            setView={setView}
            setSelectedGroupId={setSelectedGroupId}
            onTriggerAction={handleTriggerAction}
          />
        );
    }
  };

  return (
    <>
      {/* Background glassmorphic glows */}
      <div className="bg-glow bg-glow-blue" />
      <div className="bg-glow bg-glow-orange" />
      <div className="bg-glow bg-glow-red" />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView={view}
        setView={setView}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        onTriggerAction={handleTriggerAction}
      />

      <div className="app-container">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        
        <main className="main-content">
          {renderView()}
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        setView={setView}
        onTriggerAction={handleTriggerAction}
      />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
