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
    console.log('Attempting to connect to socket server...');
    
    // Connect to socket server
    const newSocket = io('http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server with ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('connected', (data) => {
      console.log('📱 Server assigned playerId:', data);
      if (data && data.playerId) {
        setPlayerId(data.playerId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
    });

    newSocket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('Cleaning up socket connection');
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