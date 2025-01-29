const express = require('express');
const Player = require('../models/Player');

const router = express.Router();

// Ajouter un joueur
router.post('/players', async (req, res) => {
  const { name } = req.body;
  const player = new Player({ name });
  await player.save();
  res.status(201).json(player);
});

// Obtenir tous les joueurs
router.get('/players', async (req, res) => {
  const players = await Player.find();
  res.json(players);
});

module.exports = router;