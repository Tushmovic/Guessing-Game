import React, { useState, useEffect } from 'react';

const GameControls = ({ gameState, isGameMaster, playerId, socket }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [nextRoundCountdown, setNextRoundCountdown] = useState(5);
  
  // Countdown for next round
  useEffect(() => {
    if (gameState?.status !== 'ended') {
      setNextRoundCountdown(5);
      return;
    }
    
    const interval = setInterval(() => {
      setNextRoundCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState?.status]);
  
  const handleStartGame = () => {
    console.log('🚀 Starting game with:', { question, answer });
    
    if (!question.trim() || !answer.trim()) {
      alert('Please enter both question and answer');
      return;
    }
    
    if (!socket || !gameState) return;
    
    setIsStarting(true);
    
    socket.emit('startGame', {
      sessionId: gameState.id,
      question: question.trim(),
      answer: answer.trim()
    });
    
    // Reset after sending
    setTimeout(() => {
      setQuestion('');
      setAnswer('');
      setIsStarting(false);
    }, 1000);
  };
  
  // Find next game master (player after current game master)
  const findNextGameMaster = () => {
    if (!gameState?.players || gameState.players.length === 0) return null;
    
    const playerIds = gameState.players.map(p => p.id);
    const currentIndex = playerIds.indexOf(gameState.gameMaster);
    
    if (currentIndex === -1) return gameState.players[0];
    
    const nextIndex = (currentIndex + 1) % playerIds.length;
    return gameState.players.find(p => p.id === playerIds[nextIndex]);
  };
  
  const nextGameMaster = findNextGameMaster();
  
  if (!isGameMaster) {
    return (
      <div className="game-controls">
        <h4>🎮 Game Controls</h4>
        
        <div className="player-count">
          <div className="count-label">Players Online:</div>
          <div className="count-value">{gameState?.players?.length || 0}/10</div>
        </div>
        
        <div className="game-status">
          <div className="status-label">Status:</div>
          <div className={`status-value status-${gameState?.status || 'waiting'}`}>
            {gameState?.status || 'waiting'}
          </div>
        </div>
        
        {gameState?.status === 'in-progress' && (
          <div className="timer-info">
            <div className="timer-label">Time Left:</div>
            <div className="timer-value">{gameState.timer || 60}s</div>
          </div>
        )}
        
        {gameState?.status === 'ended' && (
          <div className="non-master-ended">
            {gameState.winner ? (
              <div className="winner-info">
                <div className="winner-label">🏆 Winner:</div>
                <div className="winner-name">{gameState.winnerName || 'Someone'}</div>
              </div>
            ) : (
              <div className="timeout-info">
                <div className="timeout-label">⏰ Time's up!</div>
                <div className="timeout-message">No winner this round</div>
              </div>
            )}
            
            {gameState.answer && (
              <div className="answer-info">
                <div className="answer-label">Answer:</div>
                <div className="answer-text">{gameState.answer}</div>
              </div>
            )}
            
            {nextRoundCountdown > 0 && (
              <div className="next-round-countdown">
                <div className="countdown-label">Next round in:</div>
                <div className="countdown-timer">{nextRoundCountdown}s</div>
              </div>
            )}
          </div>
        )}
        
        <p className="hint">Only the Game Master can start the game</p>
        
        {gameState?.gameMasterName && (
          <div className="current-game-master">
            <span className="crown">👑</span>
            Current Game Master: {gameState.gameMasterName}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="game-controls">
      <h4>👑 Game Master Controls</h4>
      
      {gameState?.status === 'waiting' && (
        <div className="control-panel">
          <div className="form-group">
            <label>❓ Question:</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question... Example: What has keys but can't open locks?"
              className="input textarea"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>🎯 Answer:</label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the correct answer... Example: piano"
              className="input"
            />
            <small className="hint">Answer will be case-insensitive</small>
          </div>
          
          <div className="player-requirement">
            <div className="requirement-status">
              {gameState?.players?.length >= 2 ? (
                <span className="requirement-met">✅ Ready to start!</span>
              ) : (
                <span className="requirement-not-met">❌ Need more players</span>
              )}
            </div>
            <div className="player-count-display">
              Minimum: 2 players | Current: {gameState?.players?.length || 0} players
            </div>
          </div>
          
          <button
            onClick={handleStartGame}
            className="btn btn-success"
            disabled={!question || !answer || (gameState?.players?.length || 0) < 2 || isStarting}
          >
            {isStarting ? (
              <>
                <span className="spinner-small"></span> Starting Game...
              </>
            ) : (
              '🎬 Start Game'
            )}
          </button>
        </div>
      )}
      
      {gameState?.status === 'in-progress' && (
        <div className="game-in-progress">
          <div className="timer-display">
            ⏱ {gameState.timer || 60}s remaining
          </div>
          <div className="current-question">
            <strong>Current Question:</strong>
            <p className="question-text">{gameState.question}</p>
          </div>
          <p className="hint">Game is in progress. Players are guessing...</p>
        </div>
      )}
      
      {gameState?.status === 'ended' && (
        <div className="game-ended">
          {gameState.winner ? (
            <>
              <div className="winner-announcement">
                🏆 {gameState.winnerName || 'Someone'} won this round!
              </div>
              <div className="answer-reveal">
                <strong>Answer was:</strong> {gameState.answer}
              </div>
              <div className="points-awarded">
                <strong>+10 points awarded!</strong>
              </div>
            </>
          ) : (
            <>
              <div className="timeout-message">
                ⏰ Time's up! No winner this round.
              </div>
              <div className="answer-reveal">
                <strong>Answer was:</strong> {gameState.answer}
              </div>
            </>
          )}
          
          <div className="next-round-info">
            <div className="spinner-small"></div>
            <p className="countdown-message">
              Next round starting in {nextRoundCountdown} second{nextRoundCountdown !== 1 ? 's' : ''}...
            </p>
            {nextGameMaster && (
              <p className="next-master-info">
                <strong>Next Game Master:</strong> {nextGameMaster.username}
                {nextGameMaster.id === playerId && ' (That\'s you!)'}
              </p>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        .game-controls {
          padding: 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }
        
        h4 {
          margin-bottom: 20px;
          color: #2d3748;
          font-size: 1.2rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
        }
        
        .control-panel {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #4a5568;
          font-size: 0.95rem;
        }
        
        .player-requirement {
          padding: 12px;
          background: #edf2f7;
          border-radius: 8px;
          text-align: center;
        }
        
        .requirement-status {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 1rem;
        }
        
        .requirement-met {
          color: #276749;
        }
        
        .requirement-not-met {
          color: #c53030;
        }
        
        .player-count-display {
          color: #718096;
          font-size: 0.9rem;
        }
        
        .game-in-progress, .game-ended {
          padding: 20px;
          background: #f7fafc;
          border-radius: 10px;
          text-align: center;
        }
        
        .timer-display {
          font-size: 1.5rem;
          font-weight: bold;
          color: #4c51bf;
          margin-bottom: 20px;
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .current-question {
          margin: 20px 0;
          padding: 16px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #4c51bf;
          text-align: left;
        }
        
        .question-text {
          margin-top: 8px;
          color: #4a5568;
          font-size: 1.1rem;
          line-height: 1.5;
        }
        
        .winner-announcement {
          background: linear-gradient(135deg, #f6e05e 0%, #d69e2e 100%);
          color: #744210;
          padding: 16px;
          border-radius: 8px;
          font-weight: bold;
          margin-bottom: 16px;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(214, 158, 46, 0.2);
        }
        
        .answer-reveal {
          background: #f0fff4;
          color: #276749;
          padding: 14px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #48bb78;
          text-align: left;
        }
        
        .points-awarded {
          background: #fefcbf;
          color: #744210;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: bold;
          border: 2px dashed #d69e2e;
        }
        
        .timeout-message {
          background: #fff5f5;
          color: #c53030;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-weight: bold;
          border-left: 4px solid #f56565;
        }
        
        .next-round-info {
          padding: 16px;
          background: #ebf8ff;
          border-radius: 8px;
          margin-top: 20px;
        }
        
        .countdown-message {
          margin: 12px 0;
          color: #2b6cb0;
          font-weight: 600;
        }
        
        .next-master-info {
          margin: 8px 0 0 0;
          color: #4a5568;
          font-size: 0.95rem;
        }
        
        /* Non-game master styles */
        .player-count, .game-status, .timer-info {
          padding: 12px;
          background: #edf2f7;
          border-radius: 8px;
          margin: 12px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .count-label, .status-label, .timer-label {
          color: #4a5568;
          font-weight: 600;
        }
        
        .count-value, .status-value, .timer-value {
          font-weight: bold;
          color: #2d3748;
        }
        
        .status-waiting { color: #d69e2e; }
        .status-in-progress { color: #38a169; }
        .status-ended { color: #e53e3e; }
        
        .non-master-ended {
          margin: 15px 0;
          padding: 15px;
          background: #f7fafc;
          border-radius: 8px;
        }
        
        .winner-info, .timeout-info, .answer-info, .next-round-countdown {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 0;
          padding: 10px;
          background: white;
          border-radius: 6px;
        }
        
        .winner-label, .timeout-label, .answer-label, .countdown-label {
          color: #4a5568;
          font-weight: 600;
        }
        
        .winner-name, .timeout-message, .answer-text, .countdown-timer {
          font-weight: bold;
        }
        
        .winner-name { color: #276749; }
        .timeout-message { color: #c53030; }
        .answer-text { color: #2b6cb0; }
        .countdown-timer { 
          color: #4c51bf;
          font-size: 1.2rem;
        }
        
        .current-game-master {
          margin-top: 15px;
          padding: 10px;
          background: #fefcbf;
          color: #744210;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          border: 1px solid #ecc94b;
        }
        
        .crown {
          margin-right: 8px;
        }
        
        .hint {
          color: #718096;
          font-size: 0.9rem;
          margin-top: 12px;
          font-style: italic;
        }
        
        .hint:last-child {
          margin-bottom: 0;
        }
        
        .spinner-small {
          border: 2px solid #f3f3f3;
          border-top: 2px solid white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 480px) {
          .game-controls {
            padding: 15px;
          }
          
          .timer-display {
            font-size: 1.3rem;
            padding: 10px;
          }
          
          .player-count, .game-status, .timer-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          
          .winner-info, .timeout-info, .answer-info, .next-round-countdown {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameControls;