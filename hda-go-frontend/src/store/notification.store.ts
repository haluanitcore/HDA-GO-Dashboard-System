import { create } from 'zustand';
import { notificationService } from '@/services';
import { connectSocket, onSocketEvent, offSocketEvent, disconnectSocket, type SocketEvent, type SocketEventData } from '@/lib/socket';

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

const SOCKET_EVENTS: SocketEvent[] = [
  'submission:approved',
  'campaign:new',
  'creator:levelup',
  'campaign:push',
  'reward:claim',
  'notification',
  'bd:new-campaign',
  'bd:campaign-approved',
];

// Module-level map to hold event handler references so we can remove them
const eventHandlers = new Map<SocketEvent, (data: SocketEventData) => void>();

// Module-level set to prevent registering listeners more than once per connection
let listenersRegistered = false;

// Module-level auto-dismiss timer reference
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

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

    // Guard against registering duplicate listeners if initSocket is called again
    // without a preceding disconnect (e.g., StrictMode double-invoke)
    if (listenersRegistered) return;
    listenersRegistered = true;

    SOCKET_EVENTS.forEach((event) => {
      const handler = (data: SocketEventData) => {
        // Show popup
        set({ realtimePopup: data });

        // Update unread count
        set((state) => ({ unreadCount: state.unreadCount + 1 }));

        // Clear any pending auto-dismiss for the previous popup
        if (dismissTimer !== null) {
          clearTimeout(dismissTimer);
        }

        // Auto-dismiss popup after 5 seconds
        dismissTimer = setTimeout(() => {
          set((state) => {
            if (state.realtimePopup?.timestamp === data.timestamp) {
              return { realtimePopup: null };
            }
            return state;
          });
          dismissTimer = null;
        }, 5000);

        // Refetch notifications list
        get().fetchNotifications();
      };

      eventHandlers.set(event, handler);
      onSocketEvent(event, handler);
    });
  },

  dismissPopup: () => {
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    set({ realtimePopup: null });
  },

  disconnect: () => {
    // Remove all registered event listeners before disconnecting
    SOCKET_EVENTS.forEach((event) => {
      const handler = eventHandlers.get(event);
      if (handler) {
        offSocketEvent(event, handler);
        eventHandlers.delete(event);
      }
    });
    listenersRegistered = false;

    // Clear pending dismiss timer
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    disconnectSocket();
    set({ isConnected: false });
  },
}));
