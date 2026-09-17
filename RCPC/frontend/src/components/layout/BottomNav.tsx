import React from 'react';
import {
  LayoutDashboard,
  Sliders,
  MousePointer,
  Network,
  FolderOpen,
  Layers,
  History
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'control', label: 'Control', icon: Sliders },
    { id: 'input', label: 'Input', icon: MousePointer },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'apps', label: 'Apps', icon: Layers },
    { id: 'activity', label: 'Activity', icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/90 backdrop-blur-lg border-t border-dark-800 pb-safe">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 min-w-[52px] rounded-xl transition-all ${
                isActive
                  ? 'text-brand-primary font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform ${
                  isActive ? 'bg-brand-primary/15 scale-110' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
