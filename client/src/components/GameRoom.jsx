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

    console.log('🔄 GameRoom: Socket connected, requesting game state...');
    
    // Request current game state
    socket.emit('getGameState', { sessionId: game.id });

    // Event handlers
    const handleGameState = (data) => {
      console.log('📊 Game state received:', data);
      setGameState(data);
      setIsGameMaster(data.gameMaster === playerId);
    };

    const handlePlayerJoined = (data) => {
      console.log('👤 Player joined:', data);
      setGameState(prev => ({
        ...prev,
        players: data.players,
        playerCount: data.playerCount
      }));
      addMessage({
        type: 'system',
        text: `👤 A new player joined! Total players: ${data.playerCount}`
      });
    };

    const handleGameStarted = (data) => {
      console.log('🎬 Game started:', data);
      setGameState(prev => ({
        ...prev,
        status: 'in-progress',
        question: data.question,
        timer: data.timer
      }));
      addMessage({
        type: 'system',
        text: `🎬 Game started! You have ${data.attempts} attempts. Question: "${data.question}"`
      });
    };

    const handleGuessAttempt = (data) => {
      console.log('🤔 Guess attempt:', data);
      const message = data.isCorrect 
        ? `🎯 ${data.playerName} guessed correctly!`
        : `🤔 ${data.playerName} guessed: "${data.guess}" (${data.attemptsLeft} attempts left)`;
      
      addMessage({
        type: 'guess',
        text: message
      });
    };

    const handleGameEnded = (data) => {
      console.log('🏁 Game ended:', data);
      setGameState(prev => ({
        ...prev,
        status: 'ended',
        winner: data.winner,
        winnerName: data.winnerName,
        answer: data.answer,
        scores: data.scores
      }));

      if (data.winner) {
        addMessage({
          type: 'winner',
          text: `🏆 ${data.winnerName} won! Answer: ${data.answer} (+10 points!)`
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

    const handleNextRound = (data) => {
      console.log('🔄 Next round data:', data);
      
      setGameState(prev => ({
        ...prev,
        status: 'waiting',
        question: null,
        answer: null,
        winner: null,
        winnerName: null,
        timer: 60,
        gameMaster: data.gameMaster,
        gameMasterName: data.gameMasterName,
        players: data.players,
        scores: data.scores
      }));
      
      setIsGameMaster(data.gameMaster === playerId);
      
      addMessage({
        type: 'system',
        text: `🔄 New round! ${data.gameMasterName} is now the Game Master.`
      });
      
      // If you're the new game master, add a special message
      if (data.gameMaster === playerId) {
        addMessage({
          type: 'system',
          text: `👑 You are now the Game Master! Create a new question.`
        });
      }
    };

    const handlePlayerLeft = (data) => {
      console.log('👋 Player left:', data);
      setGameState(prev => ({
        ...prev,
        players: data.players,
        gameMaster: data.gameMaster,
        scores: data.scores
      }));
      
      addMessage({
        type: 'system',
        text: `👋 ${data.playerName} left the game.`
      });
    };

    const handleError = (error) => {
      console.error('❌ Socket error:', error);
      addMessage({
        type: 'error',
        text: `❌ Error: ${error.message}`
      });
    };

    // Listeners
    socket.on('gameState', handleGameState);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameStarted', handleGameStarted);
    socket.on('guessAttempt', handleGuessAttempt);
    socket.on('gameEnded', handleGameEnded);
    socket.on('timerUpdate', handleTimerUpdate);
    socket.on('nextRound', handleNextRound);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('error', handleError);

    // Initial message
    addMessage({
      type: 'system',
      text: `🎮 Joined game ${game.id}. Waiting for players...`
    });

    return () => {
      console.log('🧹 Cleaning up GameRoom listeners');
      socket.off('gameState', handleGameState);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('gameStarted', handleGameStarted);
      socket.off('guessAttempt', handleGuessAttempt);
      socket.off('gameEnded', handleGameEnded);
      socket.off('timerUpdate', handleTimerUpdate);
      socket.off('nextRound', handleNextRound);
      socket.off('playerLeft', handlePlayerLeft);
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
    console.log('👋 Leaving game:', game.id);
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
          <h2>🎮 Game: {gameState.id}</h2>
          <div className="status-badge">
            Status: <span className={`status-${gameState.status}`}>{gameState.status}</span>
            {gameState.status === 'in-progress' && (
              <span className="timer">⏱ {gameState.timer}s</span>
            )}
            {gameState.status === 'ended' && (
              <span className="timer-ended">⏱ Time's up</span>
            )}
          </div>
          {isGameMaster && <span className="master-badge">👑 You are Game Master</span>}
          {gameState.gameMasterName && !isGameMaster && (
            <span className="current-master">Game Master: {gameState.gameMasterName}</span>
          )}
        </div>
        <button className="btn btn-danger" onClick={handleLeave}>
          👋 Leave Game
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
          min-height: 700px;
        }
        
        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          flex-wrap: wrap;
          gap: 15px;
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
          padding: 8px 16px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }
        
        .status-waiting {
          color: #f6e05e;
        }
        
        .status-in-progress {
          color: #68d391;
        }
        
        .status-ended {
          color: #fc8181;
        }
        
        .timer {
          background: rgba(255,255,255,0.3);
          padding: 4px 12px;
          border-radius: 10px;
          font-weight: bold;
          color: white;
        }
        
        .timer-ended {
          background: rgba(252, 129, 129, 0.3);
          padding: 4px 12px;
          border-radius: 10px;
          font-weight: bold;
          color: #fed7d7;
        }
        
        .master-badge {
          background: #f6e05e;
          color: #744210;
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
        }
        
        .current-master {
          background: rgba(102, 126, 234, 0.3);
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
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
            align-items: flex-start;
          }
          
          .game-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .status-badge {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          
          h2 {
            font-size: 1.5rem;
          }
        }
        
        @media (max-width: 480px) {
          .game-header {
            padding: 15px;
          }
          
          .master-badge, .current-master {
            font-size: 0.8rem;
            padding: 4px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameRoom;