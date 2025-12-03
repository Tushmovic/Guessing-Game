import React from 'react';

const ScoreBoard = ({ players, scores, currentPlayerId }) => {
  const getPlayerScore = (playerId) => {
    if (!scores) {
      // Fallback to player's score if scores array not provided
      const player = players?.find(p => p.id === playerId);
      return player?.score || 0;
    }
    const playerScore = scores.find(s => s.id === playerId);
    return playerScore ? playerScore.score : 0;
  };
  
  const getPlayerAttempts = (playerId) => {
    const player = players?.find(p => p.id === playerId);
    if (!player) return 3;
    
    // Ensure attempts is between 0 and 3
    let attempts = player.attempts || 3;
    
    // If player has guessed correctly, show 0 attempts (they're done)
    if (player.hasGuessed || player.isWinner) {
      attempts = 0;
    }
    
    // Clamp between 0 and 3
    return Math.min(Math.max(attempts, 0), 3);
  };
  
  const getPlayerStatus = (player) => {
    if (player.isWinner) return 'winner';
    if (player.hasGuessed) return 'guessed';
    if (getPlayerAttempts(player.id) === 0) return 'no-attempts';
    return 'active';
  };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'winner': return '#48bb78';
      case 'guessed': return '#4299e1';
      case 'no-attempts': return '#f56565';
      default: return '#cbd5e0';
    }
  };
  
  const getStatusText = (status) => {
    switch(status) {
      case 'winner': return 'Winner 🏆';
      case 'guessed': return 'Guessed ✓';
      case 'no-attempts': return 'No attempts ❌';
      default: return 'Active';
    }
  };

  // Sort players: Game Master first, then by score (descending), then by name
  const sortedPlayers = [...(players || [])].sort((a, b) => {
    // Game Master goes first
    if (a.isGameMaster && !b.isGameMaster) return -1;
    if (!a.isGameMaster && b.isGameMaster) return 1;
    
    // Then by score (higher first)
    const scoreA = getPlayerScore(a.id);
    const scoreB = getPlayerScore(b.id);
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    // Then by name
    return a.username.localeCompare(b.username);
  });

  return (
    <div className="score-board">
      <div className="scoreboard-header">
        <h3>👥 Players ({players?.length || 0})</h3>
        <div className="game-info">
          {players?.find(p => p.isGameMaster) && (
            <div className="current-game-master">
              Game Master: {players.find(p => p.isGameMaster)?.username}
            </div>
          )}
        </div>
      </div>
      
      <div className="players-list">
        {sortedPlayers.length === 0 ? (
          <div className="no-players">
            No players in the game yet
          </div>
        ) : (
          sortedPlayers.map(player => {
            const status = getPlayerStatus(player);
            const attempts = getPlayerAttempts(player.id);
            
            return (
              <div 
                key={player.id} 
                className={`player-item ${player.id === currentPlayerId ? 'current-player' : ''} ${player.isGameMaster ? 'game-master' : ''} status-${status}`}
              >
                <div className="player-header">
                  <div className="player-name-container">
                    <span className="player-name">
                      {player.username}
                      {player.isGameMaster && ' 👑'}
                      {player.id === currentPlayerId && ' (You)'}
                    </span>
                    <span className="player-status" style={{ color: getStatusColor(status) }}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  <span className="player-score">
                    {getPlayerScore(player.id)} pts
                  </span>
                </div>
                
                <div className="player-details">
                  <div className="attempts-container">
                    <div className="attempts-label">Attempts:</div>
                    <div className="attempts-display">
                      <div className="attempts-bar">
                        <div 
                          className="attempts-fill"
                          style={{ 
                            width: `${(attempts / 3) * 100}%`,
                            backgroundColor: attempts === 0 ? '#f56565' : 
                                            attempts === 1 ? '#ed8936' : 
                                            attempts === 2 ? '#ecc94b' : 
                                            '#48bb78'
                          }}
                        ></div>
                      </div>
                      <span className="attempts-count">{attempts}/3</span>
                    </div>
                  </div>
                  
                  {player.hasGuessed && player.isWinner && (
                    <div className="winner-badge">
                      🏆 Winner!
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <style>{`
        .score-board {
          padding: 20px;
          background: #2d3748;
          color: white;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        
        .scoreboard-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #4a5568;
        }
        
        h3 {
          margin: 0 0 10px 0;
          color: #e2e8f0;
          font-size: 1.3rem;
        }
        
        .game-info {
          font-size: 0.9rem;
          color: #a0aec0;
        }
        
        .current-game-master {
          background: rgba(246, 224, 94, 0.1);
          padding: 6px 12px;
          border-radius: 6px;
          display: inline-block;
          border: 1px solid rgba(246, 224, 94, 0.3);
        }
        
        .players-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        
        .player-item {
          padding: 15px;
          background: #4a5568;
          border-radius: 10px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .player-item:hover {
          background: #5a6578;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .current-player {
          border-color: #4c51bf;
          background: #4a5568;
        }
        
        .game-master {
          border-left: 4px solid #f6e05e;
        }
        
        .status-winner {
          background: linear-gradient(135deg, #4a5568 0%, rgba(72, 187, 120, 0.2) 100%);
        }
        
        .status-guessed {
          background: linear-gradient(135deg, #4a5568 0%, rgba(66, 153, 225, 0.2) 100%);
        }
        
        .status-no-attempts {
          background: linear-gradient(135deg, #4a5568 0%, rgba(245, 101, 101, 0.2) 100%);
        }
        
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .player-name-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .player-name {
          font-weight: 600;
          font-size: 1.1rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }
        
        .player-status {
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .player-score {
          background: rgba(255,255,255,0.1);
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 1rem;
          min-width: 60px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .player-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .attempts-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .attempts-label {
          font-size: 0.85rem;
          color: #cbd5e0;
          font-weight: 600;
        }
        
        .attempts-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .attempts-bar {
          flex: 1;
          height: 8px;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .attempts-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        .attempts-count {
          font-weight: bold;
          font-size: 0.9rem;
          min-width: 40px;
          text-align: center;
        }
        
        .winner-badge {
          background: linear-gradient(135deg, #f6e05e 0%, #d69e2e 100%);
          color: #744210;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          text-align: center;
          margin-top: 8px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .no-players {
          text-align: center;
          padding: 40px 20px;
          color: #a0aec0;
          font-style: italic;
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          border: 2px dashed #4a5568;
        }
        
        @media (max-width: 768px) {
          .score-board {
            padding: 15px;
          }
          
          .player-name {
            max-width: 120px;
          }
          
          .player-score {
            padding: 4px 10px;
            font-size: 0.9rem;
            min-width: 50px;
          }
        }
        
        @media (max-width: 480px) {
          .player-header {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
          
          .player-score {
            align-self: flex-start;
          }
          
          .attempts-display {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          
          .attempts-bar {
            width: 100%;
          }
          
          .attempts-count {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default ScoreBoard;