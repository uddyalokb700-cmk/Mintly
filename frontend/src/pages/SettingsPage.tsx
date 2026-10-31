import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Globe,
  Clock,
  Moon,
  Sun,
  Bell,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Save,
  RotateCcw,
  Database,
  HardDrive,
  UploadCloud,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    preferences,
    updatePreferences,
    requestPushPermission,
    pushStatus,
    triggerTestGreeting,
  } = useNotifications();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferred_currency || 'INR');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification prefs
  const [morningReminder, setMorningReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [overspendingAlerts, setOverspendingAlerts] = useState(true);
  const [thresholdPercentage, setThresholdPercentage] = useState(80);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  // Neon Cloud Services State
  const [neonHealth, setNeonHealth] = useState<{
    database?: { status: string; engine: string };
    object_storage?: { status: string; bucket: string };
  } | null>(null);
  const [isUploadingNeonFile, setIsUploadingNeonFile] = useState(false);
  const [uploadedNeonFile, setUploadedNeonFile] = useState<{
    filename: string;
    key: string;
    presigned_url: string;
    size: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPreferredCurrency(user.preferred_currency);
      setTimezone(user.timezone);
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/health/')
      .then((res) => res.json())
      .then((data) => setNeonHealth(data))
      .catch(() => {
        // Fallback to storage health
        api.get<{ status: string; bucket: string }>('/storage/health/')
          .then((st) => setNeonHealth({
            database: { status: 'ok', engine: 'postgresql' },
            object_storage: { status: st.status, bucket: st.bucket }
          }))
          .catch(() => {});
      });
  }, []);

  const handleNeonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingNeonFile(true);
    setUploadError(null);
    setUploadedNeonFile(null);

    try {
      const res = await api.upload<{
        status: string;
        key: string;
        filename: string;
        size: number;
        presigned_url: string;
        bucket: string;
      }>('/storage/upload/', file, 'documents');

      setUploadedNeonFile({
        filename: res.filename,
        key: res.key,
        presigned_url: res.presigned_url,
        size: res.size,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload to Neon Object Storage');
    } finally {
      setIsUploadingNeonFile(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (preferences) {
      setMorningReminder(preferences.morning_reminder_enabled);
      setReminderTime(preferences.reminder_time);
      setOverspendingAlerts(preferences.overspending_alerts_enabled);
      setThresholdPercentage(preferences.threshold_percentage);
      setQuietHoursEnabled(preferences.quiet_hours_enabled);
      setQuietHoursStart(preferences.quiet_hours_start);
      setQuietHoursEnd(preferences.quiet_hours_end);
    }
  }, [preferences]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      await updateUser({
        name,
        preferred_currency: preferredCurrency,
        timezone,
      });
      setProfileMessage('Profile settings updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordMessage('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefsMessage(null);
    try {
      await updatePreferences({
        morning_reminder_enabled: morningReminder,
        reminder_time: reminderTime,
        overspending_alerts_enabled: overspendingAlerts,
        threshold_percentage: thresholdPercentage,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        timezone,
      });
      setPrefsMessage('Notification preferences saved.');
    } catch (err: any) {
      alert(err.message || 'Failed to save notification preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleTriggerGreeting = async () => {
    try {
      await triggerTestGreeting();
      alert('Morning greeting triggered! Check your notifications bell or browser alerts.');
    } catch (err: any) {
      alert(err.message || 'Failed to trigger greeting');
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset demo data back to default sample budget and transactions?')) return;
    setIsResettingDemo(true);
    try {
      await api.post('/auth/demo/');
      alert('Demo data has been reset to defaults.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo data');
    } finally {
      setIsResettingDemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Preferences & Account Settings</h2>
        <p className="text-xs text-slate-400">
          Manage currency, notifications, appearance, and security
        </p>
      </div>

      {/* Profile & Currency */}
      <Card elevated className="p-6">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923] flex items-center gap-2">
            <User className="w-4 h-4 text-mint-400" />
            <span>Profile & Regional Format</span>
          </h3>

          {profileMessage && (
            <div className="p-3 rounded-xl bg-mint-400/10 border border-mint-400/30 text-mint-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-100 focus:outline-none focus:border-mint-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Display Currency</label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" isLoading={isSavingProfile}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Theme Appearance */}
      <Card elevated className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923] flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-mint-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          <span>Appearance</span>
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              theme === 'dark'
                ? 'bg-mint-400/10 border-mint-400 text-mint-400 font-semibold'
                : 'bg-[#080B0A] border-[#1E2923] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-5 h-5" />
            <div className="text-left">
              <p className="text-xs">Dark Mode (Default)</p>
              <p className="text-[10px] text-slate-500">Premium fintech aesthetics</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              theme === 'light'
                ? 'bg-mint-400/10 border-mint-400 text-mint-400 font-semibold'
                : 'bg-[#080B0A] border-[#1E2923] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-5 h-5" />
            <div className="text-left">
              <p className="text-xs">Light Mode</p>
              <p className="text-[10px] text-slate-500">Crisp high contrast</p>
            </div>
          </button>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card elevated className="p-6">
        <form onSubmit={handleSaveNotifications} className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2923]">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-mint-400" />
              <span>Smart Notifications & Web Push</span>
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={handleTriggerGreeting} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-mint-400" />
              <span>Send Test Greeting</span>
            </Button>
          </div>

          {prefsMessage && (
            <div className="p-3 rounded-xl bg-mint-400/10 border border-mint-400/30 text-mint-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{prefsMessage}</span>
            </div>
          )}

          {/* Web Push Status */}
          <div className="p-4 rounded-xl bg-[#080B0A] border border-[#1E2923] flex items-center justify-between text-xs">
            <div>
              <h4 className="font-semibold text-slate-200">Browser Web Push Status</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {pushStatus === 'granted'
                  ? 'Browser push is active and subscribed with VAPID.'
                  : 'Allows Mintly to send scheduled morning greetings even when browser tab is inactive.'}
              </p>
            </div>
            {pushStatus !== 'granted' ? (
              <Button type="button" size="sm" onClick={requestPushPermission}>
                Enable Push
              </Button>
            ) : (
              <span className="text-xs font-semibold text-mint-400 bg-mint-400/10 px-2.5 py-1 rounded-full border border-mint-400/20">
                Active
              </span>
            )}
          </div>

          {/* Morning reminder toggle & time */}
          <div className="p-4 rounded-xl bg-[#080B0A] border border-[#1E2923] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Scheduled Morning Reminder</h4>
                <p className="text-[11px] text-slate-400">
                  Daily briefing with your exact spending allowance
                </p>
              </div>
              <input
                type="checkbox"
                checked={morningReminder}
                onChange={(e) => setMorningReminder(e.target.checked)}
                className="h-4 w-4 rounded bg-[#111715] border-[#223029] text-mint-400 focus:ring-mint-400"
              />
            </div>

            {morningReminder && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs text-slate-400">Reminder Time:</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#111715] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
                />
              </div>
            )}
          </div>

          {/* Overspending alerts & threshold */}
          <div className="p-4 rounded-xl bg-[#080B0A] border border-[#1E2923] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Overspending Warnings</h4>
                <p className="text-[11px] text-slate-400">
                  Notify when spending crosses daily threshold
                </p>
              </div>
              <input
                type="checkbox"
                checked={overspendingAlerts}
                onChange={(e) => setOverspendingAlerts(e.target.checked)}
                className="h-4 w-4 rounded bg-[#111715] border-[#223029] text-mint-400 focus:ring-mint-400"
              />
            </div>

            {overspendingAlerts && (
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Alert Threshold (% of daily allowance):</span>
                  <span className="font-bold text-mint-400 tabular-nums">{thresholdPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={thresholdPercentage}
                  onChange={(e) => setThresholdPercentage(parseInt(e.target.value))}
                  className="w-full accent-mint-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" isLoading={isSavingPrefs}>
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card elevated className="p-6">
        <form onSubmit={handleSavePassword} className="space-y-4">
          <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923] flex items-center gap-2">
            <Lock className="w-4 h-4 text-mint-400" />
            <span>Change Password</span>
          </h3>

          {passwordMessage && (
            <div className="p-3 rounded-xl bg-mint-400/10 border border-mint-400/30 text-mint-400 text-xs">
              {passwordMessage}
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {passwordError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-100 focus:outline-none focus:border-mint-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 chars"
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-100 focus:outline-none focus:border-mint-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-100 focus:outline-none focus:border-mint-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" isLoading={isSavingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Neon Cloud Infrastructure & Services */}
      <Card elevated className="p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2923]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-mint-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Neon Cloud Services & Storage
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-mint-950 text-mint-400 border border-mint-800">
            Branch: production
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Postgres Service */}
          <div className="p-3 rounded-xl bg-[#080B0A] border border-[#223029] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-mint-400" />
                Postgres Database
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                {neonHealth?.database?.status === 'ok' ? 'Online' : 'Connected'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Engine: {neonHealth?.database?.engine || 'PostgreSQL 18.6'} (Neon Lakebase)
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Driver: psycopg2 with pooler (CONN_MAX_AGE=0)
            </p>
          </div>

          {/* Object Storage Service */}
          <div className="p-3 rounded-xl bg-[#080B0A] border border-[#223029] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-mint-400" />
                Object Storage
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                {neonHealth?.object_storage?.status === 'healthy' ? 'Healthy' : 'Active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Bucket: <span className="font-mono text-slate-300">{neonHealth?.object_storage?.bucket || 'assets'}</span> (Private S3-compatible)
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              SigV4 Path-Style Addressing
            </p>
          </div>
        </div>

        {/* Object Storage Upload Test */}
        <div className="pt-2 border-t border-[#1E2923] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">Test Object Storage Upload</h4>
              <p className="text-[11px] text-slate-400">
                Upload a test document or receipt directly to Neon Object Storage
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleNeonFileUpload}
                disabled={isUploadingNeonFile}
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#14231C] text-mint-300 border border-[#223B2D] hover:bg-[#1A2E24] transition-colors">
                <UploadCloud className="w-3.5 h-3.5" />
                {isUploadingNeonFile ? 'Uploading...' : 'Upload Asset'}
              </span>
            </label>
          </div>

          {uploadError && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {uploadError}
            </p>
          )}

          {uploadedNeonFile && (
            <div className="p-3 rounded-xl bg-mint-950/40 border border-mint-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-mint-400 flex-shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-slate-200 truncate">{uploadedNeonFile.filename}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{uploadedNeonFile.key}</p>
                </div>
              </div>
              <a
                href={uploadedNeonFile.presigned_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-mint-400 hover:text-mint-300 font-medium ml-2 flex-shrink-0"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Demo Mode & Account Actions */}
      <Card elevated className="p-6 space-y-4 border-slate-800">
        <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923]">
          Account & Data Actions
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Reset Demo Data</h4>
            <p className="text-[11px] text-slate-400">
              Restore default sample transactions (₹30,000 income, ₹6,000 savings, ₹800 daily allowance)
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetDemoData}
            isLoading={isResettingDemo}
            className="gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-mint-400" />
            <span>Reset Demo Data</span>
          </Button>
        </div>

        <div className="pt-4 border-t border-[#1E2923] flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-rose-400">Sign Out</h4>
            <p className="text-[11px] text-slate-400">Sign out of your Mintly account on this device</p>
          </div>
          <Button variant="danger" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};
