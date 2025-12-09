// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Dynamic CORS for production
const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const io = socketIo(server, {
  cors: {
    origin: [frontendUrl, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: [frontendUrl, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

// CRITICAL: Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Additional status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Guessing Game Backend is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Store all active game sessions
const gameSessions = new Map();
const players = new Map(); // socket.id -> player info

// Helper function to generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to broadcast to room
function broadcastToRoom(roomId, event, data) {
  io.to(roomId).emit(event, data);
}

io.on('connection', (socket) => {
  console.log('✅ New player connected:', socket.id);
  
  // Store player with default username
  players.set(socket.id, {
    id: socket.id,
    username: `Player_${socket.id.substring(0, 4)}`,
    score: 0,
    currentGame: null,
    attempts: 3
  });

  // Send player their ID immediately
  socket.emit('connected', { playerId: socket.id });
  console.log('📱 Sent playerId to client:', socket.id);

  // Handle creating a new game
  socket.on('createGame', (data) => {
    console.log('🎮 Creating game for:', socket.id, 'with data:', data);
    
    const sessionId = generateSessionId();
    const player = players.get(socket.id);
    
    // Use provided username or default
    if (data.username) {
      player.username = data.username;
    }
    
    // Create new game session
    const gameSession = {
      id: sessionId,
      gameMaster: socket.id,
      players: new Map(),
      status: 'waiting', // waiting, in-progress, ended
      question: null,
      answer: null,
      winner: null,
      timer: 60,
      maxPlayers: 10,
      createdAt: Date.now()
    };
    
    // Add creator as first player and game master
    gameSession.players.set(socket.id, { 
      ...player, 
      isGameMaster: true,
      attempts: 3,
      hasGuessed: false
    });
    
    // Update player's current game
    player.currentGame = sessionId;
    
    // Store game session
    gameSessions.set(sessionId, gameSession);
    
    // Join socket room
    socket.join(sessionId);
    
    // Send success response
    socket.emit('gameCreated', {
      sessionId,
      game: {
        id: sessionId,
        players: Array.from(gameSession.players.values()),
        status: gameSession.status,
        gameMaster: socket.id
      }
    });
    
    console.log(`✅ Game ${sessionId} created by ${socket.id} (${player.username})`);
  });

  // Handle joining a game - ENHANCED VERSION
  socket.on('joinGame', (data) => {
    console.log('🎯 JOIN GAME REQUEST - Full data:', JSON.stringify(data));
    console.log('🎯 All active games:', Array.from(gameSessions.keys()));
    
    const { sessionId, username } = data;
    const gameSession = gameSessions.get(sessionId);
    
    if (!gameSession) {
      console.log('❌ GAME NOT FOUND - Requested:', sessionId);
      console.log('❌ Available games:', Array.from(gameSessions.keys()));
      socket.emit('error', { 
        message: `Game "${sessionId}" not found. Check the code or the game may have ended.` 
      });
      return;
    }
    
    console.log('🎯 Game found:', {
      id: gameSession.id,
      status: gameSession.status,
      players: gameSession.players.size,
      maxPlayers: gameSession.maxPlayers
    });
    
    if (gameSession.status !== 'waiting') {
      console.log('❌ Game not in waiting state:', gameSession.status);
      socket.emit('error', { 
        message: `Game is ${gameSession.status === 'in-progress' ? 'in progress' : 'ended'}.` 
      });
      return;
    }
    
    if (gameSession.players.size >= gameSession.maxPlayers) {
      console.log('❌ Game full:', gameSession.players.size, '/', gameSession.maxPlayers);
      socket.emit('error', { 
        message: `Game is full (${gameSession.players.size}/${gameSession.maxPlayers} players)` 
      });
      return;
    }
    
    // Rest of your existing join logic...
    const player = players.get(socket.id);
    
    // Update player username if provided
    if (username) {
      player.username = username;
    }
    
    // Check if player already in game
    if (gameSession.players.has(socket.id)) {
      console.log('⚠️ Player already in game:', socket.id);
      socket.emit('error', { message: 'You are already in this game' });
      return;
    }
    
    // Add player to game
    gameSession.players.set(socket.id, { 
      ...player, 
      isGameMaster: false,
      attempts: 3,
      hasGuessed: false
    });
    
    // Update player's current game
    player.currentGame = sessionId;
    
    // Join socket room
    socket.join(sessionId);
    
    console.log(`✅ PLAYER JOINED SUCCESS - Game: ${sessionId}, Player: ${socket.id} (${player.username})`);
    console.log(`✅ Total players now: ${gameSession.players.size}`);
    
    // Broadcast to all in room
    broadcastToRoom(sessionId, 'playerJoined', {
      players: Array.from(gameSession.players.values()),
      playerCount: gameSession.players.size
    });
    
    // Send confirmation to joining player
    socket.emit('joinSuccess', {
      sessionId,
      players: Array.from(gameSession.players.values()),
      gameMaster: gameSession.gameMaster
    });
  });

  // Handle starting the game
  socket.on('startGame', (data) => {
    console.log('🚀 Start game request:', data);
    
    const { sessionId, question, answer } = data;
    const gameSession = gameSessions.get(sessionId);
    
    if (!gameSession) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Check if socket is the game master
    if (gameSession.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can start the game' });
      return;
    }
    
    // Check if enough players
    if (gameSession.players.size < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    // Validate question and answer
    if (!question || !answer) {
      socket.emit('error', { message: 'Question and answer are required' });
      return;
    }
    
    // Update game state
    gameSession.status = 'in-progress';
    gameSession.question = question;
    gameSession.answer = answer.toLowerCase().trim();
    gameSession.winner = null;
    gameSession.timer = 60;
    gameSession.startTime = Date.now();
    
    // Reset player attempts and flags
    gameSession.players.forEach(player => {
      player.attempts = 3;
      player.hasGuessed = false;
      player.isWinner = false;
    });
    
    // Broadcast game started
    broadcastToRoom(sessionId, 'gameStarted', {
      question,
      timer: gameSession.timer,
      attempts: 3
    });
    
    console.log(`🎬 Game ${sessionId} started with question: "${question}"`);
    
    // Start game timer
    startGameTimer(sessionId);
  });

  // Handle player guess
  socket.on('submitGuess', (data) => {
    console.log('🤔 Guess submitted:', data);
    
    const { sessionId, guess } = data;
    const gameSession = gameSessions.get(sessionId);
    const player = gameSession?.players.get(socket.id);
    
    if (!gameSession || !player) {
      socket.emit('error', { message: 'Game or player not found' });
      return;
    }
    
    if (gameSession.status !== 'in-progress') {
      socket.emit('error', { message: 'Game is not in progress' });
      return;
    }
    
    if (player.attempts <= 0 || player.hasGuessed) {
      socket.emit('error', { message: 'No attempts remaining' });
      return;
    }
    
    if (!guess || guess.trim() === '') {
      socket.emit('error', { message: 'Please enter a guess' });
      return;
    }
    
    // Check guess
    const isCorrect = guess.toLowerCase().trim() === gameSession.answer;
    player.attempts--;
    
    if (isCorrect) {
      player.hasGuessed = true;
      player.isWinner = true;
    }
    
    // Broadcast guess attempt
    broadcastToRoom(sessionId, 'guessAttempt', {
      playerId: socket.id,
      playerName: player.username,
      guess,
      isCorrect,
      attemptsLeft: player.attempts
    });
    
    if (isCorrect) {
      // Handle correct guess
      handleCorrectGuess(sessionId, socket.id);
    } else if (player.attempts === 0) {
      // Player out of attempts
      socket.emit('outOfAttempts', {});
      console.log(`❌ Player ${player.username} is out of attempts`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Player disconnected:', socket.id);
    const player = players.get(socket.id);
    
    if (player && player.currentGame) {
      handlePlayerLeave(socket.id, player.currentGame);
    }
    
    players.delete(socket.id);
  });

  // Request game state
  socket.on('getGameState', (data) => {
    const { sessionId } = data;
    const gameSession = gameSessions.get(sessionId);
    
    if (gameSession) {
      const gameMasterPlayer = gameSession.players.get(gameSession.gameMaster);
      socket.emit('gameState', {
        id: gameSession.id,
        gameMaster: gameSession.gameMaster,
        gameMasterName: gameMasterPlayer?.username,
        players: Array.from(gameSession.players.values()),
        status: gameSession.status,
        question: gameSession.question,
        timer: gameSession.timer,
        winner: gameSession.winner,
        winnerName: gameSession.winner ? gameSession.players.get(gameSession.winner)?.username : null,
        answer: gameSession.answer
      });
    } else {
      socket.emit('error', { message: 'Game not found' });
    }
  });

  // Handle player leaving intentionally
  socket.on('leaveGame', (data) => {
    const { sessionId } = data;
    handlePlayerLeave(socket.id, sessionId);
  });
});

// Game timer function
function startGameTimer(sessionId) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession) return;
  
  const timerInterval = setInterval(() => {
    if (gameSession.status !== 'in-progress') {
      clearInterval(timerInterval);
      return;
    }
    
    gameSession.timer--;
    
    // Broadcast timer update every second
    broadcastToRoom(sessionId, 'timerUpdate', {
      timer: gameSession.timer
    });
    
    // Time's up
    if (gameSession.timer <= 0) {
      clearInterval(timerInterval);
      console.log(`⏰ Time's up for game ${sessionId}`);
      endGame(sessionId, false);
    }
  }, 1000);
}

// Handle correct guess
function handleCorrectGuess(sessionId, winnerId) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession) return;
  
  gameSession.winner = winnerId;
  gameSession.status = 'ended';
  
  // Update winner's score
  const winner = players.get(winnerId);
  if (winner) {
    winner.score += 10;
  }
  
  console.log(`🏆 ${winner?.username} won game ${sessionId} with answer: ${gameSession.answer}`);
  
  // Broadcast winner
  broadcastToRoom(sessionId, 'gameEnded', {
    winner: winnerId,
    winnerName: winner?.username,
    answer: gameSession.answer,
    scores: Array.from(gameSession.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      score: players.get(p.id)?.score || 0
    }))
  });
  
  // Rotate game master after delay
  setTimeout(() => {
    rotateGameMaster(sessionId);
  }, 5000);
}

// End game (timeout)
function endGame(sessionId, hasWinner) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession) return;
  
  gameSession.status = 'ended';
  
  console.log(`🏁 Game ${sessionId} ended. Answer was: ${gameSession.answer}`);
  
  broadcastToRoom(sessionId, 'gameEnded', {
    winner: gameSession.winner,
    answer: gameSession.answer,
    scores: Array.from(gameSession.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      score: players.get(p.id)?.score || 0
    })),
    timeout: !hasWinner
  });
  
  // Rotate game master if no winner (timeout)
  if (!hasWinner) {
    setTimeout(() => {
      rotateGameMaster(sessionId);
    }, 5000);
  }
}

// Rotate game master - FIXED VERSION
function rotateGameMaster(sessionId) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession || gameSession.players.size === 0) return;
  
  console.log(`🔄 Rotating game master in session ${sessionId}`);
  
  // Get all player IDs
  const playerIds = Array.from(gameSession.players.keys());
  if (playerIds.length === 0) return;
  
  // Find current game master index
  const currentIndex = playerIds.indexOf(gameSession.gameMaster);
  
  // Calculate next game master
  let nextGameMasterId;
  if (currentIndex === -1) {
    // If current game master not found, pick first player
    nextGameMasterId = playerIds[0];
  } else {
    // Move to next player, wrap around if at end
    const nextIndex = (currentIndex + 1) % playerIds.length;
    nextGameMasterId = playerIds[nextIndex];
  }
  
  // Update game master
  gameSession.gameMaster = nextGameMasterId;
  
  // Get new game master's info
  const newGameMaster = gameSession.players.get(nextGameMasterId);
  
  console.log(`👑 New game master: ${nextGameMasterId} (${newGameMaster?.username})`);
  
  // Reset ALL player flags
  gameSession.players.forEach((player, id) => {
    player.isGameMaster = (id === nextGameMasterId);
    player.attempts = 3; // Reset attempts for new round
    player.hasGuessed = false; // Reset guess flag
    player.isWinner = false; // Reset winner flag
  });
  
  // Reset game state for new round
  gameSession.status = 'waiting';
  gameSession.question = null;
  gameSession.answer = null;
  gameSession.winner = null;
  gameSession.timer = 60;
  
  // Prepare scores array
  const scores = Array.from(gameSession.players.values()).map(p => ({
    id: p.id,
    username: p.username,
    score: players.get(p.id)?.score || 0
  }));
  
  // Broadcast next round with COMPLETE information
  broadcastToRoom(sessionId, 'nextRound', {
    gameMaster: nextGameMasterId,
    gameMasterName: newGameMaster?.username,
    players: Array.from(gameSession.players.values()),
    scores: scores,
    status: 'waiting',
    timer: 60
  });
  
  console.log(`🔄 Round reset for game ${sessionId}. New game master: ${newGameMaster?.username}`);
}

// Handle player leaving
function handlePlayerLeave(playerId, sessionId) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession) return;
  
  // Remove player from game
  const player = gameSession.players.get(playerId);
  gameSession.players.delete(playerId);
  
  // Update player's current game
  const playerObj = players.get(playerId);
  if (playerObj) {
    playerObj.currentGame = null;
  }
  
  console.log(`👋 Player ${playerId} (${player?.username}) left game ${sessionId}`);
  
  // If no players left, delete game
  if (gameSession.players.size === 0) {
    gameSessions.delete(sessionId);
    console.log(`🗑️ Game ${sessionId} deleted (no players left)`);
    return;
  }
  
  // If game master leaves, assign new one
  if (gameSession.gameMaster === playerId) {
    const playerIds = Array.from(gameSession.players.keys());
    if (playerIds.length > 0) {
      const newGameMaster = playerIds[0];
      gameSession.gameMaster = newGameMaster;
      
      // Update player flag
      const newMasterPlayer = gameSession.players.get(newGameMaster);
      if (newMasterPlayer) {
        newMasterPlayer.isGameMaster = true;
      }
      
      console.log(`👑 Game master reassigned to ${newGameMaster} (${newMasterPlayer?.username})`);
    }
  }
  
  // Broadcast player left
  broadcastToRoom(sessionId, 'playerLeft', {
    playerId,
    playerName: player?.username,
    players: Array.from(gameSession.players.values()),
    gameMaster: gameSession.gameMaster,
    scores: Array.from(gameSession.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      score: players.get(p.id)?.score || 0
    }))
  });
}

// Auto-cleanup empty games after 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, gameSession] of gameSessions) {
    if (gameSession.players.size === 0 && (now - gameSession.createdAt) > 300000) {
      console.log(`🧹 Cleaning up empty game: ${sessionId}`);
      gameSessions.delete(sessionId);
    }
  }
}, 60000); // Check every minute

// CRITICAL FIXES BELOW:

const PORT = process.env.PORT || 3001;

// FIX 1: Add '0.0.0.0' for Render deployment
// FIX 2: Use environment variables correctly in logs
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${frontendUrl}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check available at: /health`);
  console.log(`✅ API status at: /api/status`);
});