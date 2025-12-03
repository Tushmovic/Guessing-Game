import React from 'react';

const ScoreBoard = ({ players, scores, currentPlayerId }) => {
  const getPlayerScore = (playerId) => {
    if (!scores) return 0;
    const playerScore = scores.find(s => s.id === playerId);
    return playerScore ? playerScore.score : 0;
  };
  
  const getPlayerAttempts = (playerId) => {
    const player = players?.find(p => p.id === playerId);
    return player?.attempts ?? 3;
  };
  
  return (
    <div className="score-board">
      <h3>Players ({players?.length || 0})</h3>
      <div className="players-list">
        {players && players.map(player => (
          <div 
            key={player.id} 
            className={`player-item ${player.id === currentPlayerId ? 'current-player' : ''} ${player.isGameMaster ? 'game-master' : ''}`}
          >
            <div className="player-info">
              <span className="player-name">
                {player.username}
                {player.isGameMaster && ' 👑'}
                {player.id === currentPlayerId && ' (You)'}
              </span>
              <span className="player-score">
                {getPlayerScore(player.id)} pts
              </span>
            </div>
            {player.attempts !== undefined && (
              <div className="player-attempts">
                Attempts: {getPlayerAttempts(player.id)}/3
              </div>
            )}
          </div>
        ))}
      </div>
      
      <style>{`
        .score-board {
          padding: 20px;
          background: #2d3748;
          color: white;
          flex: 1;
          overflow-y: auto;
        }
        
        h3 {
          margin-bottom: 20px;
          color: #e2e8f0;
          font-size: 1.3rem;
        }
        
        .players-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .player-item {
          padding: 12px;
          background: #4a5568;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .player-item:hover {
          background: #5a6578;
        }
        
        .current-player {
          background: #4c51bf;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .game-master {
          border-left: 4px solid #f6e05e;
        }
        
        .player-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .player-name {
          font-weight: 600;
          max-width: 70%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .player-score {
          background: rgba(255,255,255,0.1);
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: bold;
          font-size: 0.9rem;
        }
        
        .player-attempts {
          margin-top: 8px;
          font-size: 0.8rem;
          color: #cbd5e0;
          background: rgba(0,0,0,0.2);
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default ScoreBoard;