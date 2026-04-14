const express = require('express');
const router = express.Router();
const treatmentPlansController = require('./treatment_plans.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// 🛡️ Segurança ativada
router.use(authMiddleware);

// Rota para criar o plano
router.post('/', treatmentPlansController.createPlan);

router.get('/:id/progress', treatmentPlansController.getPlanProgress);

module.exports = router;