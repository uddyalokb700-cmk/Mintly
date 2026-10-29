import React, { useState } from 'react';
import { X, CheckCheck, Bell, AlertTriangle, Sun, ShieldAlert, Sparkles } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import { formatRelativeDate } from '../../utils/formatters';

export const NotificationDrawer: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    closeDrawer,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  if (!isDrawerOpen) return null;

  const filtered = activeTab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'morning_greeting':
        return <Sun className="w-5 h-5 text-amber-400" />;
      case 'overspending_warning':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'threshold_alert':
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'budget_alert':
        return <Sparkles className="w-5 h-5 text-teal-400" />;
      default:
        return <Bell className="w-5 h-5 text-mint-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#111715] border-l border-[#223029] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#1E2923] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-mint-400/10 text-mint-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Notifications</h2>
                <p className="text-xs text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-mint-400 hover:text-mint-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1E2923] px-5 pt-3 gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-mint-400 text-mint-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === 'unread'
                  ? 'border-mint-400 text-mint-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-800/40 mx-auto flex items-center justify-center text-slate-500 mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-medium text-slate-300">No notifications yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  When Mintly generates daily morning greetings or spending alerts, they'll appear right here.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.is_read && markAsRead(item.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    item.is_read
                      ? 'bg-[#151D19]/60 border-[#1E2923] opacity-80'
                      : 'bg-[#151D19] border-mint-400/30 shadow-sm shadow-mint-400/5'
                  }`}
                >
                  {!item.is_read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-mint-400" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-black/30 shrink-0">
                      {getIcon(item.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-sm font-medium text-slate-200 leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.body}</p>
                      <span className="text-[10px] text-slate-500 mt-2 block">
                        {formatRelativeDate(item.created_at.split('T')[0])}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
