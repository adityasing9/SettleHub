import React, { useState, useEffect, useRef } from 'react';
import { Search, Hash, User, ShieldAlert, Sparkles, SunMoon, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setView: (view: string) => void;
  onTriggerAction: (action: string) => void;
}

interface CommandItem {
  id: string;
  category: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, setView, onTriggerAction }) => {
  const { groups, members, theme, toggleTheme, triggerSync, isOffline } = useApp();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggling
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compile list of commands based on query
  const commands: CommandItem[] = [
    // Views Navigation
    { id: 'nav-dashboard', category: 'Navigation', title: 'Go to Dashboard', icon: <Sparkles size={16} />, action: () => setView('dashboard') },
    { id: 'nav-groups', category: 'Navigation', title: 'Go to Groups', icon: <Hash size={16} />, action: () => setView('groups') },
    { id: 'nav-borrow', category: 'Navigation', title: 'Go to Borrow & Lend', icon: <ShieldAlert size={16} />, action: () => setView('borrow-lend') },
    { id: 'nav-ledger', category: 'Navigation', title: 'Go to Ledgers', icon: <User size={16} />, action: () => setView('ledger') },
    { id: 'nav-ocr', category: 'Navigation', title: 'Go to AI OCR Scanner', icon: <Sparkles size={16} />, action: () => setView('ocr') },
    { id: 'nav-analytics', category: 'Navigation', title: 'Go to Analytics & Reports', icon: <Hash size={16} />, action: () => setView('analytics') },

    // Action triggers
    { id: 'act-group', category: 'Actions', title: 'Create New Group', icon: <Hash size={16} />, shortcut: 'N', action: () => onTriggerAction('create-group') },
    { id: 'act-expense', category: 'Actions', title: 'Log New Expense', icon: <Sparkles size={16} />, shortcut: 'E', action: () => onTriggerAction('create-expense') },
    { id: 'act-borrow', category: 'Actions', title: 'Log Personal Loan', icon: <ShieldAlert size={16} />, shortcut: 'L', action: () => onTriggerAction('create-borrowlend') },

    // Utility actions
    { id: 'ut-theme', category: 'System', title: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, icon: <SunMoon size={16} />, action: toggleTheme },
    { id: 'ut-sync', category: 'System', title: 'Sync Database', icon: <RefreshCw size={16} />, action: triggerSync, disabled: isOffline },
  ];

  // Dynamic Group searches
  const groupCommands: CommandItem[] = groups.map((g) => ({
    id: `group-${g.id}`,
    category: 'Groups',
    title: `Open Group: ${g.name}`,
    icon: <Hash size={16} />,
    action: () => {
      setView('groups');
      onTriggerAction(`select-group-${g.id}`);
    },
  }));

  // Dynamic Member searches
  const memberCommands: CommandItem[] = members
    .filter((m) => m.id !== 'u-1')
    .map((m) => ({
      id: `member-${m.id}`,
      category: 'Contacts',
      title: `View Ledger: ${m.name}`,
      icon: <User size={16} />,
      action: () => {
        setView('ledger');
        onTriggerAction(`select-member-${m.id}`);
      },
    }));

  const allItems = [...commands, ...groupCommands, ...memberCommands];

  const filteredItems = allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        filteredItems[activeIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Group items by category for visual sections
  const categories: Record<string, typeof filteredItems> = {};
  filteredItems.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  // Flat list index resolver helper
  let itemCounter = 0;

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-container glass" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <Search size={18} className="text-secondary" style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="command-palette-item-shortcut">ESC</span>
        </div>

        <div className="command-palette-results">
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(categories).map(([category, items]) => (
              <div key={category}>
                <div className="command-palette-group-title">{category}</div>
                {items.map((item) => {
                  const currentIdx = itemCounter++;
                  const isSelected = activeIndex === currentIdx;
                  return (
                    <div
                      key={item.id}
                      className={`command-palette-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIndex(currentIdx)}
                    >
                      <span style={{ color: isSelected ? 'var(--color-blue)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                      </span>
                      <span style={{ fontWeight: isSelected ? 500 : 400 }}>{item.title}</span>
                      {item.shortcut && (
                        <span className="command-palette-item-shortcut">{item.shortcut}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
