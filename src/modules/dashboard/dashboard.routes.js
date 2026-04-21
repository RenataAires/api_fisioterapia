const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const dashboardController = require('./dashboard.controller');

const router = Router();

// Todas as rotas do dashboard exigem autenticação
router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);
router.get('/today', dashboardController.getToday);

module.exports = router;