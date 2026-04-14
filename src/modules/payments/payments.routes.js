const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// 🛡️ Segurança máxima na área financeira
router.use(authMiddleware);

// Rota para registrar pagamento (Entrada no caixa)
router.post('/', paymentsController.registerPayment);

// Rota para tirar o extrato de um paciente
router.get('/patient/:patientId', paymentsController.getPatientFinancials);

module.exports = router;