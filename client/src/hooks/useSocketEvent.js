import { useContext, useEffect } from 'react';
import { SocketContext } from '../context/SocketContext';

// Subscribe to a Socket.io event with automatic cleanup. Used across dashboards
// from Phase 10 onward; safe to call before the socket connects.
export function useSocketEvent(event, handler) {
  const ctx = useContext(SocketContext);
  useEffect(() => {
    const socket = ctx?.socket;
    if (!socket || !event || typeof handler !== 'function') return undefined;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [ctx?.socket, event, handler]);
}

export default useSocketEvent;
