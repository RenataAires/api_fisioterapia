const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware, verificarRole } = require('../../middlewares/auth.middleware');

router.post('/register', authMiddleware, verificarRole(['admin']), authController.register);

router.post('/login', authController.login);

module.exports = router;