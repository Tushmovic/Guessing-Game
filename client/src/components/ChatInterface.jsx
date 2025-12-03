import React, { useState, useRef, useEffect } from 'react';

const ChatInterface = ({ messages, gameState, playerId, socket }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || !gameState) return;
    
    // Don't allow guessing if game is not in progress or player has won
    if (gameState.status !== 'in-progress' || gameState.winner) {
      return;
    }
    
    socket.emit('submitGuess', {
      sessionId: gameState.id,
      guess: input
    });
    
    setInput('');
  };
  
  const getMessageClass = (type) => {
    switch(type) {
      case 'system': return 'message-system';
      case 'guess': return 'message-guess';
      case 'error': return 'message-error';
      case 'winner': return 'message-winner';
      default: return 'message-player';
    }
  };
  
  const canGuess = () => {
    if (!gameState) return false;
    if (gameState.status !== 'in-progress') return false;
    if (gameState.winner) return false;
    
    // Check if current player can guess
    const currentPlayer = gameState.players?.find(p => p.id === playerId);
    if (!currentPlayer) return false;
    
    return currentPlayer.attempts > 0 && !currentPlayer.hasGuessed;
  };
  
  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>Game Chat</h3>
        {gameState.status === 'in-progress' && gameState.question && (
          <div className="question-box">
            <strong>Question:</strong> {gameState.question}
          </div>
        )}
        {gameState.status === 'in-progress' && (
          <div className="attempts-info">
            Enter your guess below (3 attempts)
          </div>
        )}
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            No messages yet. Be the first to say something!
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message ${getMessageClass(msg.type)}`}>
              <div className="message-content">{msg.text}</div>
              <div className="message-time">{msg.timestamp}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {gameState.status === 'in-progress' && canGuess() && (
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your guess..."
            className="chat-input"
            disabled={!canGuess()}
          />
          <button type="submit" className="btn btn-primary">
            Guess
          </button>
        </form>
      )}
      
      <style>{`
        .chat-interface {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .chat-header {
          padding: 15px;
          background: #4c51bf;
          color: white;
        }
        
        .chat-header h3 {
          margin: 0 0 10px 0;
        }
        
        .question-box {
          margin-top: 10px;
          padding: 10px;
          background: rgba(255,255,255,0.2);
          border-radius: 5px;
          font-size: 0.9rem;
        }
        
        .attempts-info {
          margin-top: 5px;
          font-size: 0.8rem;
          opacity: 0.9;
        }
        
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          background: #f7fafc;
        }
        
        .no-messages {
          text-align: center;
          color: #a0aec0;
          padding: 40px 20px;
          font-style: italic;
        }
        
        .message {
          padding: 10px 15px;
          margin-bottom: 10px;
          border-radius: 8px;
        }
        
        .message-content {
          margin-bottom: 5px;
        }
        
        .message-time {
          font-size: 0.8rem;
          color: #718096;
          text-align: right;
        }
        
        .chat-input-form {
          display: flex;
          padding: 15px;
          background: white;
          border-top: 1px solid #e2e8f0;
          gap: 10px;
        }
        
        .chat-input {
          flex: 1;
        }
        
        @media (max-width: 480px) {
          .chat-input-form {
            flex-direction: column;
          }
          
          .chat-input {
            margin-bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;