import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../config/axios';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/*
 * Holds a single Socket.io connection, opened only while authenticated (the
 * server authenticates the handshake with the access token and joins rooms by
 * role). Event wiring lands in Phase 10; this provider is the Phase 0 skeleton.
 */
export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: getAccessToken() },
      withCredentials: true,
      reconnection: true,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
      on: (event, cb) => socketRef.current?.on(event, cb),
      off: (event, cb) => socketRef.current?.off(event, cb),
      emit: (event, payload) => socketRef.current?.emit(event, payload),
    }),
    [connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export { SocketContext };
