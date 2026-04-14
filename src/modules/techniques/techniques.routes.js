const express = require('express');
const router = express.Router();
const techniquesController = require('./techniques.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Protegendo a rota (apenas usuários logados podem ver o cardápio)
router.use(authMiddleware);

// Rota GET simples para buscar a lista
router.get('/', techniquesController.getAllTechniques);

module.exports = router;