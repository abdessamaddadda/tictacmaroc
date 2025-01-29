const express = require('express');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier "client"
app.use(express.static(path.join(__dirname, '../client')));

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/tic-tac-toe', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes d'authentification
app.use('/api/auth', authRoutes);

// Gestion des connexions Socket.io
let players = [];
let currentPlayer = 'X';
let gameState = ['', '', '', '', '', '', '', '', ''];

const winningConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Lignes
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colonnes
  [0, 4, 8], [2, 4, 6]             // Diagonales
];

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Ajouter un joueur
  socket.on('joinGame', (playerName) => {
    if (players.length < 2) {
      const symbol = players.length === 0 ? 'X' : 'O';
      players.push({ id: socket.id, name: playerName, symbol });
      socket.emit('assignSymbol', symbol);

      if (players.length === 2) {
        io.emit('startGame', { players, currentPlayer });
      } else {
        socket.emit('waitingForPlayer', 'En attente d\'un autre joueur...');
      }
    } else {
      socket.emit('gameFull', 'La partie est pleine. Rejoignez une autre partie.');
    }
  });

  // Gérer les mouvements
  socket.on('makeMove', (move) => {
    if (move.symbol === currentPlayer && gameState[move.index] === '') {
      gameState[move.index] = move.symbol;
      io.emit('updateBoard', move);

      const winner = checkForWinner();
      if (winner) {
        io.emit('gameOver', { winner, message: `Le joueur ${winner} a gagné !` });
        updateScore(winner);
        resetGame();
      } else if (gameState.every(cell => cell !== '')) {
        io.emit('gameOver', { winner: null, message: 'Match nul !' });
        resetGame();
      } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        io.emit('changeTurn', { currentPlayer, message: `C'est au tour de ${currentPlayer}.` });
      }
    }
  });

  // Gérer les messages de chat
  socket.on('sendMessage', (message) => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      io.emit('receiveMessage', { name: player.name, message });
    }
  });

  // Gérer la déconnexion
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    players = players.filter(player => player.id !== socket.id);
    io.emit('playerDisconnected', 'L\'autre joueur s\'est déconnecté. La partie est terminée.');
    resetGame();
  });
});

// Vérifier s'il y a un gagnant
function checkForWinner() {
  for (let condition of winningConditions) {
    const [a, b, c] = condition;
    if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
      return gameState[a];
    }
  }
  return null;
}

// Mettre à jour le score du gagnant
async function updateScore(winnerSymbol) {
  const winner = players.find(player => player.symbol === winnerSymbol);
  if (winner) {
    const user = await User.findOne({ username: winner.name });
    if (user) {
      user.score += 1;
      await user.save();
      io.emit('updateScore', { username: winner.name, score: user.score });
    }
  }
}

// Réinitialiser le jeu
function resetGame() {
  gameState = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  players = [];
}

// Définir le port sur 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});