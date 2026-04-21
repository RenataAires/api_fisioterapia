const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../../middlewares/validate.middleware');
const patientsController = require('./patients.controller');
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware);

// Validações de cadastro
const patientValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2 }).withMessage('Nome muito curto'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Telefone é obrigatório'),
  body('address')
    .trim()
    .notEmpty().withMessage('Endereço é obrigatório'),
];

router.post('/', patientsController.createPatient);

router.get('/', patientsController.getAllPatients);

router.get('/:id', patientsController.getPatientById);

router.put('/:id', patientsController.updatePatient);

router.delete('/:id', patientsController.deletePatient);

module.exports = router;