import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sliders, Database, User as UserIcon, Shield, Smartphone, History } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [numberFormat, setNumberFormat] = useState('comma');
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  // Backup state
  const [backupJson, setBackupJson] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  // Security state
  const [securityPin, setSecurityPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchPreferences();
    fetchSecurityData();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/settings/preferences');
      setDefaultCurrency(res.data.default_currency);
      setLanguage(res.data.language);
      setDateFormat(res.data.date_format);
      setNumberFormat(res.data.number_format);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSecurityData = async () => {
    try {
      const sRes = await api.get('/settings/security/sessions');
      setSessions(sRes.data);
      
      const lRes = await api.get('/settings/security/logs');
      setSecurityLogs(lRes.data);
    } catch (err) {
      console.error('Error fetching security info', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesLoading(true);
    try {
      await api.put('/settings/preferences', {
        theme,
        default_currency: defaultCurrency,
        language,
        date_format: dateFormat,
        number_format: numberFormat
      });
      alert('Preferences updated successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to update preferences');
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post('/settings/backup/export');
      setBackupJson(JSON.stringify(res.data, null, 2));
      alert('Database backup data generated successfully below!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to export backup data. Make sure you are an Admin.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async () => {
    if (!backupJson) {
      alert('Please paste backup JSON data first');
      return;
    }
    if (!window.confirm('WARNING: Importing backup data might overwrite or append database records. Proceed?')) return;
    
    setBackupLoading(true);
    try {
      const parsed = JSON.parse(backupJson);
      await api.post('/settings/backup/import', parsed);
      alert('Database restored successfully!');
      setBackupJson('');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to import backup data. Make sure JSON is correct and you have Admin role.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPin.length !== 4) {
      alert('PIN must be exactly 4 digits');
      return;
    }
    setPinLoading(true);
    try {
      await api.post(`/settings/security/pin?pin=${securityPin}`);
      alert('Quick-lock security PIN saved successfully!');
      setSecurityPin('');
      fetchSecurityData();
    } catch (err) {
      console.error(err);
      alert('Failed to save security PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const handleRevokeSession = async (id: number) => {
    if (!window.confirm('Terminate this user session?')) return;
    try {
      await api.post(`/settings/security/sessions/${id}/revoke`);
      fetchSecurityData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure profile configurations, default currencies, and databases.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PREFERENCES FORM */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Sliders size={16} className="text-indigo-600" />
            Application Preferences
          </h3>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Base Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Number Formatting</label>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="comma">Western (1,234,567.89)</option>
                <option value="indian">Indian System (12,34,567.89)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={preferencesLoading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg disabled:opacity-50 transition-all duration-200"
            >
              {preferencesLoading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>

        {/* ACCOUNT INFO & BACKUP */}
        <div className="space-y-6">
          {/* PROFILE SUMMARY */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <UserIcon size={16} className="text-indigo-600" />
              Active User Session
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Username</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user?.username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Email Address</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400 font-bold">Security Role</span>
                <span className="px-2.5 py-0.5 font-black bg-indigo-600/10 text-indigo-600 rounded-full text-[10px] uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* BACKUP RESTORE CARD */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Database size={16} className="text-indigo-600" />
              Database Backups
            </h3>
            
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Export complete JSON tables dumps or upload previous logs files. Admin credentials required.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleExportBackup}
                disabled={backupLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs hover:bg-slate-200/50 dark:hover:bg-slate-900/50 active:scale-[0.98] transition-all"
              >
                Export JSON
              </button>
              <button
                onClick={handleImportBackup}
                disabled={backupLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                Import JSON
              </button>
            </div>

            {backupJson && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                <label className="block text-[10px] font-bold text-slate-400">JSON Backup Data</label>
                <textarea
                  value={backupJson}
                  onChange={(e) => setBackupJson(e.target.value)}
                  placeholder="Paste JSON database dump here..."
                  className="w-full h-32 p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECURITY ACCESS CENTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* PIN LOCK & DEVICE SESSIONS */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Shield size={16} className="text-indigo-600" />
            Security & Device Management
          </h3>

          {/* Quick PIN */}
          <form onSubmit={handleSavePin} className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Set 4-Digit Quick Lock PIN</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold tracking-widest text-center"
                />
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                >
                  Save PIN
                </button>
              </div>
            </div>
          </form>

          {/* Sessions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Smartphone size={12} />
              Active Sessions Devices
            </h4>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl text-xs font-semibold">
                  <div>
                    <div className="font-bold">{s.user_agent || 'Unknown Web Device'}</div>
                    <span className="text-[10px] text-slate-400">IP: {s.ip_address || 'Unknown'} • Active</span>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="px-2 py-1 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-lg text-[10px]"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECURITY LOGS AUDIT */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <History size={16} className="text-indigo-600" />
            Security Incident Logs
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {securityLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl text-xs font-semibold">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-indigo-600 capitalize">{log.event_type.replace('_', ' ')}</span>
                  <span className="text-[9px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{log.details}</p>
              </div>
            ))}
            {securityLogs.length === 0 && (
              <div className="text-center py-8 text-slate-400">No security incidents logged.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
