import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  if (!socket || !socket.connected) {
    const url = getApiBaseUrl();
    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🟢 [Socket Connected] Connected to Real-time Chat Gateway:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 [Socket Disconnected] Reason:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [Socket Connection Error]:', err.message);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
