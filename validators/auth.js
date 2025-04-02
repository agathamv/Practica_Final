const { check } = require("express-validator")
const { usersModel } = require("../models");
const { handleHttpError } = require("../utils/handleError");
const validateResults = require("../utils/handleValidators")

const validatorRegister = [
    check("email").exists().notEmpty().isEmail().custom(async (email) => {
        const existingUser = await usersModel.findOne({ email, status: true }); // Solo emails verificados
        if (existingUser) {
            handleHttpError(res, "El email ya está registrado y verificado", 409);
            throw error;
        }
    }),
    check("password").exists().notEmpty().isLength( {min:8, max: 16} ),
    (req, res, next) => {
        return validateResults(req, res, next)
    }
]

const validatorLogin = [
    check("email").exists().notEmpty().isEmail(),
    check("password").exists().notEmpty().isLength( {min:8, max: 16} ),
    (req, res, next) => {
        return validateResults(req, res, next)
    }
]

const validatorPersonalData = [
    check("nombre").notEmpty().withMessage("El nombre es obligatorio"),
    check("apellidos").notEmpty().withMessage("Los apellidos son obligatorios"),
    check("nif").matches(/^\d{8}[A-Z]$/).withMessage("El NIF debe tener 8 dígitos seguidos de una letra"),
    (req, res, next) => validateResults(req, res, next)
];

const validatorCompany = [
    check("nombre").optional().isString().withMessage("El nombre debe ser una cadena de texto"),
    check("cif").optional().isString().withMessage("El CIF debe ser una cadena de texto"),
    check("direccion").optional().isString().withMessage("La dirección debe ser una cadena de texto"),
];

module.exports = { validatorRegister, validatorLogin, validatorPersonalData, validatorCompany}