import React from 'react';
import {
  LayoutDashboard,
  FolderSync,
  ArrowUpDown,
  BookOpen,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  Globe,
  Plane,
  Home,
  Briefcase,
  Users,
  GraduationCap,
  Plus,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Group } from '../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  setView: (view: string) => void;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  onTriggerAction: (action: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentView,
  setView,
  selectedGroupId,
  setSelectedGroupId,
  onTriggerAction,
}) => {
  const { groups, currentUser, isOffline, logout } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'groups', label: 'Groups', icon: <FolderSync size={18} /> },
    { id: 'borrow-lend', label: 'Borrow & Lend', icon: <ArrowUpDown size={18} /> },
    { id: 'ledger', label: 'Personal Ledger', icon: <BookOpen size={18} /> },
    { id: 'ocr', label: 'AI OCR Scanner', icon: <Receipt size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet size={18} /> },
  ];

  const getGroupCategoryIcon = (category: Group['category']) => {
    switch (category) {
      case 'trip':
        return <Plane size={14} />;
      case 'home':
        return <Home size={14} />;
      case 'office':
        return <Briefcase size={14} />;
      case 'family':
        return <Users size={14} />;
      case 'college':
        return <GraduationCap size={14} />;
      default:
        return <Globe size={14} />;
    }
  };

  const handleNavClick = (viewId: string) => {
    setView(viewId);
    if (viewId !== 'groups') {
      setSelectedGroupId(null);
    }
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  const handleGroupClick = (groupId: string) => {
    setSelectedGroupId(groupId);
    setView('groups');
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 98,
          }}
          className="mobile-overlay"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span style={{ fontSize: '1.4rem' }}>🤝</span>
            <span>SettleHub</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = currentView === item.id && !selectedGroupId;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingRight: '12px' }}>
            <span className="sidebar-nav-section-title" style={{ padding: '0 12px' }}>
              My Groups
            </span>
            <button
              onClick={() => onTriggerAction('create-group')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background var(--transition-fast)'
              }}
              title="Create new group"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 4px', marginTop: '4px' }}>
            {groups.length === 0 ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: '8px 12px' }}>
                No groups created yet
              </span>
            ) : (
              groups.map((group) => {
                const isActive = currentView === 'groups' && selectedGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => handleGroupClick(group.id)}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    style={{
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'inherit',
                      padding: '7px 12px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: isActive ? 'var(--color-blue)' : 'var(--text-tertiary)' }}>
                      {getGroupCategoryIcon(group.category)}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </nav>

        <div className="sidebar-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flexGrow: 1 }}>
            <div className="avatar">{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                {isOffline ? 'Offline Mode' : 'Cloud Synced'}
              </span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log Out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            z-index: 99;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .mobile-overlay {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-overlay {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
