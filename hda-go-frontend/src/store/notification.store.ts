import { create } from 'zustand';
import { notificationService } from '@/services';
import { connectSocket, onSocketEvent, disconnectSocket, type SocketEventData } from '@/lib/socket';

// ══════════════════════════════════════════════════
// NOTIFICATION STORE — Real-time + Persistent
// Socket.io Receive → Show Popup → Update Badge Count
// ══════════════════════════════════════════════════

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read_status: boolean;
  created_at?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  realtimePopup: SocketEventData | null;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  initSocket: (userId: string) => void;
  dismissPopup: () => void;
  disconnect: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  realtimePopup: null,

  fetchNotifications: async () => {
    try {
      const data = await notificationService.getAll();
      set({ notifications: data });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read_status: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await notificationService.markAllAsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read_status: true })),
      unreadCount: 0,
    }));
  },

  initSocket: (userId) => {
    connectSocket(userId);
    set({ isConnected: true });

    // Listen to ALL real-time events → Show popup
    const events = [
      'submission:approved',
      'campaign:new',
      'creator:levelup',
      'campaign:push',
      'reward:claim',
      'notification',
    ] as const;

    events.forEach((event) => {
      onSocketEvent(event, (data: SocketEventData) => {
        // Show popup
        set({ realtimePopup: data });

        // Update unread count
        set((state) => ({ unreadCount: state.unreadCount + 1 }));

        // Auto-dismiss popup after 5 seconds
        setTimeout(() => {
          set((state) => {
            if (state.realtimePopup?.timestamp === data.timestamp) {
              return { realtimePopup: null };
            }
            return state;
          });
        }, 5000);

        // Refetch notifications list
        get().fetchNotifications();
      });
    });
  },

  dismissPopup: () => set({ realtimePopup: null }),

  disconnect: () => {
    disconnectSocket();
    set({ isConnected: false });
  },
}));
