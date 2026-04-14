const express = require('express');
const router = express.Router();
const sessionsController = require('./sessions.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// 🛡️ Segurança: Ninguém mexe nas sessões sem estar logado
router.use(authMiddleware);

// Rota para registrar uma sessão
router.post('/', sessionsController.createSession);

// Rota para ver o histórico de um paciente específico
router.get('/patient/:patientId', sessionsController.getPatientSessions);

module.exports = router;