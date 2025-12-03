import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const GameLobby = ({ onJoin, playerName, setPlayerName }) => {
  const { socket, playerId, isConnected } = useSocket();
  const [sessionId, setSessionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) return;

    console.log('GameLobby: Socket available:', socket.id, 'Connected:', isConnected);

    const handleGameCreated = (data) => {
      console.log('🎮 Game created:', data);
      setIsCreating(false);
      onJoin(data.game);
    };

    const handleError = (error) => {
      console.error('❌ Socket error:', error);
      setError(error.message || 'An error occurred');
      setIsCreating(false);
    };

    const handleJoinSuccess = (data) => {
      console.log('✅ Join success:', data);
      onJoin({
        id: sessionId.toUpperCase(),
        players: data.players,
        status: 'waiting',
        gameMaster: data.gameMaster
      });
    };

    // Event listeners
    socket.on('gameCreated', handleGameCreated);
    socket.on('error', handleError);
    socket.on('joinSuccess', handleJoinSuccess);

    return () => {
      socket.off('gameCreated', handleGameCreated);
      socket.off('error', handleError);
      socket.off('joinSuccess', handleJoinSuccess);
    };
  }, [socket, onJoin, sessionId]);

  const handleCreateGame = () => {
    console.log('🟢 Create Game clicked');
    console.log('Socket exists:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Player name:', playerName);

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!socket) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }

    if (!isConnected) {
      setError('Waiting for server connection...');
      return;
    }
    
    setError('');
    setIsCreating(true);
    
    console.log('📤 Emitting createGame event with username:', playerName);
    socket.emit('createGame', { username: playerName });
  };

  const handleJoinGame = () => {
    console.log('🔵 Join Game clicked');
    console.log('Socket exists:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Session ID:', sessionId);
    console.log('Player name:', playerName);

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!sessionId.trim()) {
      setError('Please enter a game code');
      return;
    }

    if (!socket) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }

    if (!isConnected) {
      setError('Waiting for server connection...');
      return;
    }

    setError('');
    
    console.log('📤 Emitting joinGame event');
    socket.emit('joinGame', { 
      sessionId: sessionId.toUpperCase(),
      username: playerName 
    });
  };

  if (!isConnected) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h1>🎮 Guessing Game</h1>
          <div className="loading-screen">
            <h2>Connecting to server...</h2>
            <p>Please wait while we establish a connection.</p>
            <div className="spinner"></div>
            <p className="connection-hint">
              Make sure the backend server is running on http://localhost:3001
            </p>
          </div>
        </div>
        <style>{`
          .loading-screen {
            text-align: center;
            padding: 40px 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4c51bf;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .connection-hint {
            margin-top: 20px;
            color: #718096;
            font-size: 0.9rem;
            background: #f7fafc;
            padding: 10px;
            border-radius: 5px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1>🎮 Guessing Game</h1>
        
        <div className="connection-status">
          <span className="status-dot connected"></span>
          <small>Connected to server</small>
          <div className="player-id">Your ID: {playerId ? playerId.substring(0, 8) : 'Loading...'}</div>
        </div>
        
        <div className="form-group">
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            type="text"
            className="input"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="create-game-section">
          <h2>Create New Game</h2>
          <p>Become the Game Master and create questions</p>
          <button
            className="btn btn-primary"
            onClick={handleCreateGame}
            disabled={isCreating || !playerName.trim()}
          >
            {isCreating ? (
              <>
                <span className="spinner-small"></span> Creating...
              </>
            ) : (
              'Create Game'
            )}
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="join-game-section">
          <h2>Join Existing Game</h2>
          <div className="join-form">
            <input
              type="text"
              className="input"
              placeholder="Enter game code"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={!playerName.trim()}
            />
            <button
              className="btn btn-success"
              onClick={handleJoinGame}
              disabled={!playerName.trim() || !sessionId.trim()}
            >
              Join Game
            </button>
          </div>
          <p className="hint">Enter the 6-character game code</p>
        </div>

        <div className="instructions">
          <h3>How to Play:</h3>
          <ol>
            <li>Create a game or join with a code</li>
            <li>Game Master creates a question</li>
            <li>Players get 3 attempts to guess</li>
            <li>Winner gets 10 points</li>
            <li>Game Master rotates after each round</li>
          </ol>
        </div>
      </div>

      <style>{`
        .lobby {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 40px);
          padding: 20px;
        }
        
        .lobby-card {
          background: white;
          border-radius: 15px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 500px;
        }
        
        h1 {
          text-align: center;
          color: #4c51bf;
          margin-bottom: 30px;
          font-size: 2.5rem;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 10px;
          background: #f0fff4;
          border-radius: 8px;
          border-left: 4px solid #48bb78;
        }
        
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .status-dot.connected {
          background: #48bb78;
        }
        
        .status-dot.disconnected {
          background: #f56565;
        }
        
        .player-id {
          margin-left: auto;
          color: #718096;
          font-size: 0.85rem;
        }
        
        .create-game-section, .join-game-section {
          margin: 30px 0;
          padding: 20px;
          background: #f7fafc;
          border-radius: 10px;
        }
        
        h2 {
          color: #2d3748;
          margin-bottom: 10px;
          font-size: 1.5rem;
        }
        
        .btn {
          width: 100%;
          margin-top: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }
        
        .spinner-small {
          border: 2px solid #f3f3f3;
          border-top: 2px solid white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }
        
        .join-form {
          display: flex;
          gap: 10px;
          margin: 15px 0;
        }
        
        .join-form .input {
          flex: 1;
        }
        
        .divider {
          display: flex;
          align-items: center;
          margin: 30px 0;
          color: #a0aec0;
        }
        
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .divider span {
          padding: 0 20px;
        }
        
        .hint {
          color: #718096;
          font-size: 0.9rem;
          margin-top: 5px;
        }
        
        .instructions {
          margin-top: 30px;
          padding: 20px;
          background: #edf2f7;
          border-radius: 10px;
        }
        
        .instructions h3 {
          color: #2d3748;
          margin-bottom: 10px;
        }
        
        .instructions ol {
          padding-left: 20px;
          color: #4a5568;
        }
        
        .instructions li {
          margin-bottom: 8px;
        }
        
        @media (max-width: 480px) {
          .lobby-card {
            padding: 20px;
          }
          
          .join-form {
            flex-direction: column;
          }
          
          .connection-status {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          
          .player-id {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default GameLobby;