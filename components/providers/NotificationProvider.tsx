"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  realtime, 
  databases,
} from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import { Query } from 'appwrite';
import { useAuth } from '@/lib/auth';

// ActivityLog type definition for internal use
interface ActivityLog {
  $id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  details: string | null;
}

interface NotificationContextType {
  notifications: ActivityLog[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user?.$id) return;
    
    setIsLoading(true);
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASES.WHISPERRNOTE,
        APPWRITE_CONFIG.TABLES.WHISPERRNOTE.ACTIVITY_LOG,
        [Query.equal('userId', user.$id), Query.orderDesc('timestamp'), Query.limit(50)]
      );
      const logs = res.documents as unknown as ActivityLog[];
      setNotifications(logs);
      setUnreadCount(logs.filter(log => !localStorage.getItem(`read_notif_${log.$id}`)).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.$id) return;

    const channel = `databases.${APPWRITE_CONFIG.DATABASES.WHISPERRNOTE}.collections.${APPWRITE_CONFIG.TABLES.WHISPERRNOTE.ACTIVITY_LOG}.documents`;
    
    const unsub = realtime.subscribe(channel, (response) => {
      const payload = response.payload as ActivityLog;
      
      if (payload.userId !== user.$id) return;

      const isCreate = response.events.some(e => e.includes('.create'));

      if (isCreate) {
        setNotifications(prev => [payload, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`Whisperr ${payload.targetType}`, {
            body: payload.action,
          });
        }
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
      else (unsub as any).unsubscribe?.();
    };
  }, [user?.$id]);

  const markAsRead = (id: string) => {
    localStorage.setItem(`read_notif_${id}`, 'true');
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    notifications.forEach(log => localStorage.setItem(`read_notif_${log.$id}`, 'true'));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      isLoading, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
