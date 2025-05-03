const { check, validationResult } = require("express-validator");
const { usersModel } = require("../models");
const { handleHttpError } = require("../utils/handleError"); 
const validateResults = require("../utils/handleValidators");

const validatorRegister = [
    check("email").exists().notEmpty().isEmail()
        .custom(async (email = '') => { 
            const existingUser = await usersModel.findOne({ email: email, status: true });
            if (existingUser) {
                
                handleHttpError(409, "EMAIL_ALREADY_REGISTERED_AND_VERIFIED", { email });
            }
            return true; 
        }),

    check("password").exists().notEmpty().isLength({ min: 8}).withMessage("PASSWORD_MUST_BE_MIN_8_CHARS"),
        (req, res, next) => validateResults(req, res, next)
];

const validatorLogin = [
    check("email").exists().notEmpty().isEmail(),

    check("password").exists().notEmpty(),
        
    (req, res, next) => validateResults(req, res, next)
];

const validatorPersonalData = [
    check("nombre").notEmpty().withMessage("El nombre es obligatorio").isString(),
    check("apellidos").notEmpty().withMessage("Los apellidos son obligatorios").isString(),
    check("nif").matches(/^\d{8}[A-Z]$/).withMessage("El NIF debe tener 8 dígitos seguidos de una letra"), 

    (req, res, next) => validateResults(req, res, next)
];

const validatorCompany = [
    check("nombre").isString().withMessage("El nombre debe ser una cadena de texto"),
    check("cif").isString().withMessage("El CIF debe ser una cadena de texto"),
    check("direccion").isString().withMessage("La dirección debe ser una cadena de texto"),

    (req, res, next) => validateResults(req, res, next)
];

const validatorVerify = [
    check("code").exists().notEmpty().isLength({ min: 6, max: 6 }).withMessage("VERIFICATION_CODE_MUST_BE_6_DIGITS").isNumeric().withMessage("VERIFICATION_CODE_MUST_BE_NUMERIC"),

    (req, res, next) => validateResults(req, res, next)
];


module.exports = {validatorRegister, validatorLogin, validatorPersonalData, validatorCompany, validatorVerify};