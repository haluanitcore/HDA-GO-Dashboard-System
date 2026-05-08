import { io, Socket } from 'socket.io-client';

// ══════════════════════════════════════════════════
// 29 + 35. REALTIME CONNECTION — Socket.io Client
// Connects to backend WebSocket on /events namespace
//
// Events:
// | submission:approved | QC            |
// | campaign:new        | Publish       |
// | creator:levelup     | Threshold     |
// | campaign:push       | CM            |
// | reward:claim        | Reward Engine |
// | notification        | Generic       |
// ══════════════════════════════════════════════════

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function connectSocket(userId: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${SOCKET_URL}/events`, {
    query: { userId },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// ── Type-safe event listeners ──
export type SocketEvent =
  | 'submission:approved'
  | 'campaign:new'
  | 'creator:levelup'
  | 'campaign:push'
  | 'reward:claim'
  | 'notification';

export interface SocketEventData {
  type: SocketEvent;
  title: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

export function onSocketEvent(event: SocketEvent, callback: (data: SocketEventData) => void) {
  socket?.on(event, callback);
}

export function offSocketEvent(event: SocketEvent, callback?: (data: SocketEventData) => void) {
  if (callback) {
    socket?.off(event, callback);
  } else {
    socket?.off(event);
  }
}
