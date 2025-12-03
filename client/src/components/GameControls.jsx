import React, { useState } from 'react';

const GameControls = ({ gameState, isGameMaster, playerId, socket }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  
  const handleStartGame = () => {
    if (!question.trim() || !answer.trim()) {
      alert('Please enter both question and answer');
      return;
    }
    
    if (!socket || !gameState) return;
    
    socket.emit('startGame', {
      sessionId: gameState.id,
      question: question.trim(),
      answer: answer.trim()
    });
  };
  
  if (!isGameMaster) {
    return (
      <div className="game-controls">
        <h4>Game Controls</h4>
        <p>Only the Game Master can start the game</p>
        <div className="player-count">
          Players: {gameState?.players?.length || 0}/10
        </div>
        <div className="game-status">
          Status: {gameState?.status || 'loading'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="game-controls">
      <h4>Game Master Controls</h4>
      
      {gameState?.status === 'waiting' && (
        <div className="control-panel">
          <div className="form-group">
            <label>Question:</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question..."
              className="input textarea"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Answer:</label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the correct answer"
              className="input"
            />
          </div>
          
          <div className="player-requirement">
            Need at least 2 players to start<br />
            Current: {gameState?.players?.length || 0} players
          </div>
          
          <button
            onClick={handleStartGame}
            className="btn btn-success"
            disabled={!question || !answer || (gameState?.players?.length || 0) < 2}
          >
            Start Game
          </button>
        </div>
      )}
      
      {gameState?.status === 'in-progress' && (
        <div className="game-in-progress">
          <div className="timer-display">
            ⏱ {gameState.timer || 60}s remaining
          </div>
          <p>Game is in progress...</p>
        </div>
      )}
      
      {gameState?.status === 'ended' && (
        <div className="game-ended">
          <p>Round ended! Waiting for next round...</p>
        </div>
      )}
      
      <style>{`
        .game-controls {
          padding: 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }
        
        h4 {
          margin-bottom: 15px;
          color: #2d3748;
          font-size: 1.2rem;
        }
        
        .control-panel {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .player-requirement {
          padding: 10px;
          background: #edf2f7;
          border-radius: 5px;
          text-align: center;
          color: #718096;
          font-size: 0.9rem;
        }
        
        .game-in-progress, .game-ended {
          padding: 15px;
          background: #f7fafc;
          border-radius: 5px;
          text-align: center;
        }
        
        .timer-display {
          font-size: 1.3rem;
          font-weight: bold;
          color: #4c51bf;
          margin-bottom: 10px;
        }
        
        .player-count, .game-status {
          padding: 8px 12px;
          background: #edf2f7;
          border-radius: 5px;
          margin: 10px 0;
          text-align: center;
        }
        
        @media (max-width: 480px) {
          .game-controls {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameControls;