import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import './App.css';

// Connection status component - now inside the same file
const ConnectionStatus = () => {
  const { isConnected, playerId } = useSocket();
  return (
    <div className="connection-status-bar">
      <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot"></span>
        <span className="status-text">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {playerId && isConnected && (
        <div className="player-id-badge">
          ID: {playerId.substring(0, 8)}
        </div>
      )}
    </div>
  );
};

// Main App Component with Socket Context
const AppContent = () => {
  const { isConnected } = useSocket();
  const [currentGame, setCurrentGame] = useState(null);
  const [playerName, setPlayerName] = useState('');

  const handleJoinGame = (gameData) => {
    console.log('🎮 Joining game:', gameData);
    setCurrentGame(gameData);
  };

  const handleLeaveGame = () => {
    console.log('👋 Leaving game');
    setCurrentGame(null);
  };

  // Show loading screen if not connected
  if (!isConnected) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1>🎮 Guessing Game</h1>
          <div className="spinner-large"></div>
          <h2>Connecting to server...</h2>
          <p>Please wait while we establish a connection to the game server.</p>
          <div className="connection-hint">
            <p><strong>If this takes too long:</strong></p>
            <ol>
              <li>Make sure the backend server is running on http://localhost:3001</li>
              <li>Check that port 3001 is not blocked by firewall</li>
              <li>Try refreshing the page</li>
            </ol>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConnectionStatus />
      <div className="app">
        {currentGame ? (
          <GameRoom 
            game={currentGame} 
            onLeave={handleLeaveGame} 
            playerName={playerName}
          />
        ) : (
          <GameLobby 
            onJoin={handleJoinGame} 
            playerName={playerName}
            setPlayerName={setPlayerName}
          />
        )}
      </div>
    </>
  );
};

// Main App Wrapper
function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;