// src/context/SocketContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Dynamic socket URL - uses environment variable or defaults to localhost
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    
    console.log(`🔌 Attempting to connect to socket server at: ${socketUrl}`);
    console.log(`🌍 Environment: ${import.meta.env.MODE}`);
    console.log(`🔧 VITE_SOCKET_URL: ${import.meta.env.VITE_SOCKET_URL || 'Not set (using default)'}`);
    
    // Connect to socket server
    const newSocket = io(socketUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server with ID:', newSocket.id);
      console.log('📡 Socket URL:', socketUrl);
      setIsConnected(true);
    });

    newSocket.on('connected', (data) => {
      console.log('📱 Server assigned playerId:', data);
      if (data && data.playerId) {
        setPlayerId(data.playerId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server. Reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
      console.error('🔗 Attempted URL:', socketUrl);
      console.error('⏰ Time:', new Date().toLocaleTimeString());
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔴 Reconnection error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('🔴 Reconnection failed after all attempts');
    });

    newSocket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });

    newSocket.on('ping', () => {
      console.log('📡 Ping from server');
    });

    newSocket.on('pong', (latency) => {
      console.log(`📡 Pong from server, latency: ${latency}ms`);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (newSocket.connected) {
        newSocket.disconnect();
      }
      newSocket.close();
    };
  }, []);

  const value = {
    socket,
    playerId,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};