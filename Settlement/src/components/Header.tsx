import React, { useState } from 'react';
import { Menu, Search, Bell, Sun, Moon, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenCommandPalette }) => {
  const {
    notifications,
    theme,
    toggleTheme,
    isOffline,
    isSyncing,
    triggerSync,
    markAllNotificationsRead,
    clearNotification,
  } = useApp();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (nId: string) => {
    // Mark as read and open notifications context if needed
    clearNotification(nId);
    setShowNotifDropdown(false);
  };

  return (
    <header className="header glass" style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleSidebar}
          style={{ display: 'flex', padding: '8px' }}
          className="btn btn-secondary btn-sm mobile-only-btn" // custom css rule will display on mobile only
        >
          <Menu size={18} />
        </button>

        {/* Command Palette Trigger */}
        <div
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: '260px',
            transition: 'border-color var(--transition-fast)',
          }}
          className="search-trigger"
        >
          <Search size={14} />
          <span>Search...</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.7rem',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
            }}
          >
            Ctrl K
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Offline Sync Widget */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isOffline ? (
            <div
              className="badge badge-red"
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="You are offline. Data is saved locally."
            >
              <CloudOff size={14} />
              <span className="hide-mobile">Offline</span>
            </div>
          ) : isSyncing ? (
            <div
              className="badge badge-yellow"
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className="spin" style={{ animation: 'shimmer 1.5s infinite linear' }} />
              <span className="hide-mobile">Syncing...</span>
            </div>
          ) : (
            <button
              onClick={triggerSync}
              className="badge badge-blue"
              style={{
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="Sync now"
            >
              <CheckCircle2 size={14} />
              <span className="hide-mobile">Synced</span>
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px', borderRadius: '50%' }}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications Icon & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px', borderRadius: '50%', position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: 'var(--color-red)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignContent: 'center',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  paddingLeft: '4.5px', // manual alignment
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div
              className="glass animate-fade-in"
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '320px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-blue)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        backgroundColor: n.isRead ? 'transparent' : 'var(--bg-primary)',
                        transition: 'background var(--transition-fast)',
                      }}
                      className="notif-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor:
                              n.type === 'success'
                                ? 'var(--color-blue)'
                                : n.type === 'alert'
                                ? 'var(--color-red)'
                                : 'var(--color-yellow)',
                            display: n.isRead ? 'none' : 'inline-block',
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: n.isRead ? 500 : 600 }}>{n.title}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .spin {
          animation: spin-anim 1.5s linear infinite;
        }
        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (min-width: 769px) {
          .mobile-only-btn {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .search-trigger {
            width: 150px !important;
          }
          .search-trigger span:last-child {
            display: none !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
