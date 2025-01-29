const socket = io();

const cells = document.querySelectorAll('.cell');
const status = document.getElementById('status');
const playerIdDisplay = document.getElementById('player-id-display');
const onlineControls = document.getElementById('online-controls');
const startGameBtn = document.getElementById('start-game-btn');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const sendMessageBtn = document.getElementById('send-message-btn');
const muteBtn = document.getElementById('mute-btn');
let mySymbol = '';
let currentPlayer = '';
let gameActive = true;

// Sons
const winSound = new Audio('sounds/win.mp3');
const loseSound = new Audio('sounds/lose.mp3');
const drawSound = new Audio('sounds/draw.mp3');
const backgroundMusic = new Audio('sounds/nn.mp3');

// Jouer la musique de fond en boucle
backgroundMusic.loop = true;
backgroundMusic.play();

// Gestion du bouton de coupure du son
let isMuted = false;
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  backgroundMusic.muted = isMuted;
  winSound.muted = isMuted;
  loseSound.muted = isMuted;
  drawSound.muted = isMuted;
  muteBtn.textContent = isMuted ? "🔈" : "🔇";
});

// Rejoindre la partie
startGameBtn.addEventListener('click', () => {
  const playerName = prompt('Entrez votre nom :');
  if (playerName) {
    socket.emit('joinGame', playerName);
    onlineControls.style.display = 'none';
  }
});

// Assigner le symbole (X ou O)
socket.on('assignSymbol', (symbol) => {
  mySymbol = symbol;
  playerIdDisplay.textContent = `Vous êtes ${mySymbol}.`;
});

// En attente d'un autre joueur
socket.on('waitingForPlayer', (message) => {
  status.textContent = message;
});

// Démarrer la partie
socket.on('startGame', (data) => {
  const { players, currentPlayer: serverCurrentPlayer } = data;
  currentPlayer = serverCurrentPlayer;
  status.textContent = `La partie commence ! Vous êtes ${mySymbol}.`;
  if (mySymbol === currentPlayer) {
    status.textContent += ' C\'est votre tour.';
  } else {
    status.textContent += ' En attente du joueur adverse...';
  }
});

// Mettre à jour le plateau de jeu
socket.on('updateBoard', (move) => {
  const { index, symbol } = move;
  cells[index].textContent = symbol;
});

// Changer de tour
socket.on('changeTurn', (data) => {
  const { currentPlayer: newCurrentPlayer, message } = data;
  currentPlayer = newCurrentPlayer;
  status.textContent = message;
  if (currentPlayer === mySymbol) {
    status.textContent += ' C\'est votre tour.';
  }
});

// Gérer la fin de la partie
socket.on('gameOver', (data) => {
  const { winner, message } = data;
  status.textContent = message;
  gameActive = false;

  if (winner === mySymbol) {
    winSound.play();
  } else if (winner) {
    loseSound.play();
  } else {
    drawSound.play();
  }
});

// Gérer les clics sur les cellules
cells.forEach((cell, index) => {
  cell.addEventListener('click', () => {
    if (gameActive && cell.textContent === '' && mySymbol === currentPlayer) {
      const move = { index, symbol: mySymbol };
      socket.emit('makeMove', move);
    }
  });
});

// Gérer la déconnexion d'un joueur
socket.on('playerDisconnected', (message) => {
  status.textContent = message;
  gameActive = false;
});

// Gérer une partie pleine
socket.on('gameFull', (message) => {
  status.textContent = message;
  gameActive = false;
});

// Gérer les messages de chat
socket.on('receiveMessage', (data) => {
  const { name, message } = data;
  const messageElement = document.createElement('div');
  messageElement.textContent = `${name}: ${message}`;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Faire défiler vers le bas
});

// Envoyer un message via le bouton
sendMessageBtn.addEventListener('click', () => {
  if (chatInput.value.trim() !== '') {
    socket.emit('sendMessage', chatInput.value.trim());
    chatInput.value = '';
  }
});


// Envoyer un message via la touche Entrée
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim() !== '') {
    socket.emit('sendMessage', chatInput.value.trim());
    chatInput.value = '';
  }
});