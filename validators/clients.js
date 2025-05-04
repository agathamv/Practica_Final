const { check, param } = require("express-validator"); 
const validateResults = require("../utils/handleValidators");
const { clientsModel } = require("../models"); 

const validatorCreateClient = [
    check("name").exists().withMessage("NAME_REQUIRED").notEmpty().withMessage("NAME_CANNOT_BE_EMPTY").isString(),
    check("cif").exists().withMessage("CIF_REQUIRED").notEmpty().withMessage("CIF_CANNOT_BE_EMPTY").isString(),
        
    check("address").optional().isObject().withMessage("ADDRESS_MUST_BE_OBJECT"),
    check("address.street").optional().isString(),
    check("address.number").optional().isString(), 
    check("address.postal").optional().isString(), 
    check("address.city").optional().isString(),
    check("address.province").optional().isString(),

    (req, res, next) => validateResults(req, res, next)
];

const validatorUpdateClient = [
    
    check("name").optional().notEmpty().withMessage("NAME_CANNOT_BE_EMPTY").isString(),
    check("cif").optional().notEmpty().withMessage("CIF_CANNOT_BE_EMPTY").isString(),
    check("address").optional().isObject().withMessage("ADDRESS_MUST_BE_OBJECT"),
    check("address.street").optional().isString(),
    check("address.number").optional().isString(),
    check("address.postal").optional().isString(),
    check("address.city").optional().isString(),
    check("address.province").optional().isString(),

    (req, res, next) => validateResults(req, res, next)
];


const validatorClientId = [
    param("id").exists().withMessage("CLIENT_ID_REQUIRED").isMongoId().withMessage("INVALID_CLIENT_ID_FORMAT"),

    (req, res, next) => validateResults(req, res, next)
];


module.exports = {validatorCreateClient,validatorUpdateClient,validatorClientId};