const express = require('express');
const router = express.Router();
const sessionsController = require('./sessions.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// 🛡️ Segurança: Ninguém mexe nas sessões sem estar logado
router.use(authMiddleware);


router.post('/',                  sessionsController.createSession);
router.post('/schedule',          sessionsController.scheduleSession);
router.get('/week',               sessionsController.getByWeek);     
router.get('/patient/:patientId', sessionsController.getPatientSessions);
router.get('/:id',                sessionsController.getSessionById);  // 
router.put('/:id/cancel',       sessionsController.cancelSession);
router.patch('/:id/sign', sessionsController.signSession);
router.put('/:id', sessionsController.updateSession);
router.delete('/:id',             sessionsController.deleteSession);

module.exports = router;