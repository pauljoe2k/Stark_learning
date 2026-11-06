import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@pinpoint/shared';
import { useAuth } from './auth';

export type ConnectionState = 'offline' | 'connecting' | 'connected' | 'disconnected';
interface SocketContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  status: ConnectionState;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, status: 'offline' });
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [status, setStatus] = useState<ConnectionState>('offline');
  const socket = useMemo(() => token
    ? io(API_URL, { auth: { token }, autoConnect: false, reconnection: true })
    : null, [token]);

  useEffect(() => {
    if (!socket) {
      setStatus('offline');
      return;
    }
    setStatus('connecting');
    socket.connect();
    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={{ socket, status }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
