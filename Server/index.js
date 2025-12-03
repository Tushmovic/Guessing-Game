// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Fix CORS - Allow both Vite (5173) and CRA (3000)
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

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
      attempts: 3
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

  // Handle joining a game
  socket.on('joinGame', (data) => {
    console.log('🎯 Join game request:', data);
    
    const { sessionId, username } = data;
    const gameSession = gameSessions.get(sessionId);
    const player = players.get(socket.id);
    
    if (!gameSession) {
      console.log('❌ Game not found:', sessionId);
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (gameSession.status !== 'waiting') {
      console.log('❌ Game already in progress:', sessionId);
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    if (gameSession.players.size >= gameSession.maxPlayers) {
      console.log('❌ Game is full:', sessionId);
      socket.emit('error', { message: 'Game is full' });
      return;
    }
    
    // Update player username if provided
    if (username) {
      player.username = username;
    }
    
    // Add player to game
    gameSession.players.set(socket.id, { 
      ...player, 
      isGameMaster: false,
      attempts: 3 
    });
    
    // Update player's current game
    player.currentGame = sessionId;
    
    // Join socket room
    socket.join(sessionId);
    
    // Broadcast to all in room
    broadcastToRoom(sessionId, 'playerJoined', {
      players: Array.from(gameSession.players.values()),
      playerCount: gameSession.players.size
    });
    
    console.log(`✅ Player ${socket.id} (${player.username}) joined game ${sessionId}`);
    
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
    
    // Reset player attempts
    gameSession.players.forEach(player => {
      player.attempts = 3;
      player.hasGuessed = false;
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
      socket.emit('gameState', {
        id: gameSession.id,
        gameMaster: gameSession.gameMaster,
        players: Array.from(gameSession.players.values()),
        status: gameSession.status,
        question: gameSession.question,
        timer: gameSession.timer,
        winner: gameSession.winner,
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

// Rotate game master
function rotateGameMaster(sessionId) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession) return;
  
  const playerIds = Array.from(gameSession.players.keys());
  if (playerIds.length === 0) return;
  
  const currentIndex = playerIds.indexOf(gameSession.gameMaster);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  
  gameSession.gameMaster = playerIds[nextIndex];
  
  // Update player flags
  gameSession.players.forEach((player, id) => {
    player.isGameMaster = (id === gameSession.gameMaster);
  });
  
  // Reset game for next round
  gameSession.status = 'waiting';
  gameSession.question = null;
  gameSession.answer = null;
  gameSession.winner = null;
  gameSession.timer = 60;
  
  console.log(`🔄 Game master rotated to ${gameSession.gameMaster} in game ${sessionId}`);
  
  broadcastToRoom(sessionId, 'nextRound', {
    gameMaster: gameSession.gameMaster,
    players: Array.from(gameSession.players.values())
  });
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
  
  // If game master leaves, assign new one
  if (gameSession.gameMaster === playerId && gameSession.players.size > 0) {
    const newGameMaster = Array.from(gameSession.players.keys())[0];
    gameSession.gameMaster = newGameMaster;
    
    // Update player flag
    const newMasterPlayer = gameSession.players.get(newGameMaster);
    if (newMasterPlayer) {
      newMasterPlayer.isGameMaster = true;
    }
  }
  
  console.log(`👋 Player ${playerId} left game ${sessionId}`);
  
  // If no players left, delete game
  if (gameSession.players.size === 0) {
    gameSessions.delete(sessionId);
    console.log(`🗑️ Game ${sessionId} deleted (no players left)`);
    return;
  }
  
  // Broadcast player left
  broadcastToRoom(sessionId, 'playerLeft', {
    playerId,
    players: Array.from(gameSession.players.values()),
    gameMaster: gameSession.gameMaster
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: http://localhost:3000, http://localhost:5173`);
});