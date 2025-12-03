import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import ChatInterface from './ChatInterface';
import ScoreBoard from './ScoreBoard';
import GameControls from './GameControls';

const GameRoom = ({ game, onLeave, playerName }) => {
  const { socket, playerId } = useSocket();
  const [gameState, setGameState] = useState(game);
  const [messages, setMessages] = useState([]);
  const [isGameMaster, setIsGameMaster] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Request current game state
    socket.emit('getGameState', { sessionId: game.id });

    // Event handlers
    const handleGameState = (data) => {
      setGameState(data);
      setIsGameMaster(data.gameMaster === playerId);
    };

    const handlePlayerJoined = (data) => {
      setGameState(prev => ({
        ...prev,
        players: data.players,
        playerCount: data.playerCount
      }));
      addMessage({
        type: 'system',
        text: `A new player joined! Total players: ${data.playerCount}`
      });
    };

    const handleGameStarted = (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'in-progress',
        question: data.question,
        timer: data.timer
      }));
      addMessage({
        type: 'system',
        text: `Game started! You have ${data.attempts} attempts.`
      });
    };

    const handleGuessAttempt = (data) => {
      const message = data.isCorrect 
        ? `🎯 ${data.playerName} guessed correctly!`
        : `🤔 ${data.playerName} guessed: "${data.guess}" (${data.attemptsLeft} attempts left)`;
      
      addMessage({
        type: 'guess',
        text: message
      });
    };

    const handleGameEnded = (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'ended',
        winner: data.winner,
        scores: data.scores
      }));

      if (data.winner) {
        addMessage({
          type: 'winner',
          text: `🎉 ${data.winnerName} won! Answer: ${data.answer}`
        });
      } else if (data.timeout) {
        addMessage({
          type: 'system',
          text: `⏰ Time's up! Answer: ${data.answer}`
        });
      }
    };

    const handleTimerUpdate = (data) => {
      setGameState(prev => ({
        ...prev,
        timer: data.timer
      }));
    };

    const handleError = (error) => {
      addMessage({
        type: 'error',
        text: `Error: ${error.message}`
      });
    };

    // Listeners
    socket.on('gameState', handleGameState);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameStarted', handleGameStarted);
    socket.on('guessAttempt', handleGuessAttempt);
    socket.on('gameEnded', handleGameEnded);
    socket.on('timerUpdate', handleTimerUpdate);
    socket.on('error', handleError);

    // Initial message
    addMessage({
      type: 'system',
      text: `Joined game ${game.id}. Waiting for players...`
    });

    return () => {
      socket.off('gameState', handleGameState);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('gameStarted', handleGameStarted);
      socket.off('guessAttempt', handleGuessAttempt);
      socket.off('gameEnded', handleGameEnded);
      socket.off('timerUpdate', handleTimerUpdate);
      socket.off('error', handleError);
    };
  }, [socket, game.id, playerId]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, {
      ...message,
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleLeave = () => {
    socket.emit('leaveGame', { sessionId: game.id });
    onLeave();
  };

  if (!gameState) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div className="game-room">
      <div className="game-header">
        <div className="game-info">
          <h2>Game: {gameState.id}</h2>
          <div className="status-badge">
            Status: {gameState.status}
            {gameState.status === 'in-progress' && (
              <span className="timer">⏱ {gameState.timer}s</span>
            )}
          </div>
          {isGameMaster && <span className="master-badge">👑 Game Master</span>}
        </div>
        <button className="btn btn-danger" onClick={handleLeave}>
          Leave Game
        </button>
      </div>

      <div className="game-container">
        <div className="sidebar">
          <ScoreBoard 
            players={gameState.players || []} 
            scores={gameState.scores}
            currentPlayerId={playerId}
          />
          
          <GameControls
            gameState={gameState}
            isGameMaster={isGameMaster}
            playerId={playerId}
            socket={socket}
          />
        </div>

        <div className="chat-area">
          <ChatInterface
            messages={messages}
            gameState={gameState}
            playerId={playerId}
            socket={socket}
          />
        </div>
      </div>

      <style>{`
        .game-room {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        
        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .game-info {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        h2 {
          margin: 0;
          font-size: 1.8rem;
        }
        
        .status-badge {
          background: rgba(255,255,255,0.2);
          padding: 5px 15px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .timer {
          background: rgba(255,255,255,0.3);
          padding: 2px 10px;
          border-radius: 10px;
          font-weight: bold;
        }
        
        .master-badge {
          background: #f6e05e;
          color: #744210;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
        }
        
        @media (min-width: 768px) {
          .game-container {
            display: flex;
            flex-direction: row;
            min-height: 600px;
          }
        }
        
        @media (max-width: 767px) {
          .game-header {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
          }
          
          .game-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameRoom;