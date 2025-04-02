const {check} = require('express-validator');
const handleValidator = require('../utils/handleValidators.js');

const validatorCreateItem = [
    check("email").exists().notEmpty(),
    check("password").exists().notEmpty(),
    handleValidator
];

const validatorGetItem = [
    check("email").exists().notEmpty().isEmail().withMessage("Debe ser un email válido"),
    handleValidator
];


const validatorValidateCode = [
    check("code").exists().notEmpty().isLength({ min: 6, max: 6 }).withMessage("El código debe tener 6 dígitos."),
    handleValidator
]; 
module.exports = {validatorCreateItem, validatorGetItem, validatorValidateCode};
