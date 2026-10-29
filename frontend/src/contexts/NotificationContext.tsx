import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification, NotificationPreference } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  pushStatus: NotificationPermission | 'unsupported';
  preferences: NotificationPreference | null;
  updatePreferences: (data: Partial<NotificationPreference>) => Promise<void>;
  triggerTestGreeting: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ unread_count: number; notifications: AppNotification[] }>('/notifications/');
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch (err) {
      // silently ignore if not authenticated
    }
  }, [user]);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<NotificationPreference>('/notifications/preferences/');
      setPreferences(res);
    } catch (err) {}
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPreferences();
      // Poll every 45s for fresh notifications
      const timer = setInterval(fetchNotifications, 45000);
      return () => clearInterval(timer);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
    }
  }, [user, fetchNotifications, fetchPreferences]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read/`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const updatePreferences = async (data: Partial<NotificationPreference>) => {
    try {
      const updated = await api.patch<NotificationPreference>('/notifications/preferences/', data);
      setPreferences(updated);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const requestPushPermission = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const vapidRes = await api.get<{ publicKey: string }>('/notifications/vapid-key/');

        if (!vapidRes.publicKey) return false;

        const convertedVapidKey = urlBase64ToUint8Array(vapidRes.publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        const rawKey = subscription.getKey('p256dh');
        const rawAuth = subscription.getKey('auth');

        const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))) : '';
        const auth = rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : '';

        await api.post('/notifications/push-subscriptions/', {
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        });

        await fetchPreferences();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error enabling push notifications:', err);
      return false;
    }
  };

  const triggerTestGreeting = async () => {
    await api.post('/notifications/test-morning-greeting/');
    await fetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        requestPushPermission,
        pushStatus,
        preferences,
        updatePreferences,
        triggerTestGreeting,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
