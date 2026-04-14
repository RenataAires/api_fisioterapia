const express = require('express');
const router = express.Router();
const goalsController = require('./goals.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);
router.get('/', goalsController.getAllGoals);


module.exports = router;