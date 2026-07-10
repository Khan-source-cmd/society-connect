import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

/**
 * Custom hook for real-time WebSocket connection
 * Automatically connects, identifies, and listens for events
 */
export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 WebSocket connected');

      // Identify with role info
      const role = localStorage.getItem('userRole');
      const flatNumber = localStorage.getItem('userFlat');
      const userId = localStorage.getItem('userId');
      socket.emit('identify', { role, flatNumber, userId });

      // Join flat room for targeted events
      if (flatNumber) {
        socket.emit('join-flat', flatNumber);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 WebSocket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.log('WebSocket error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Listen for a specific event
  const on = (event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  };

  // Emit an event
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { isConnected, lastEvent, on, emit, socket: socketRef };
};

export default useSocket;