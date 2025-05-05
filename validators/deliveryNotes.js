const { check, param } = require("express-validator");
const validateResults = require("../utils/handleValidators");
const mongoose = require('mongoose');


const mongoIdValidator = (paramName = 'id') => [
    param(paramName)
        .exists().withMessage(`${paramName.toUpperCase()}_ID_REQUIRED`)
        .isMongoId().withMessage(`INVALID_${paramName.toUpperCase()}_ID_FORMAT`),
];


const validatorCreateDeliveryNote = [
    check("clientId").exists().isMongoId(),
    check("projectId").exists().isMongoId(),
    check("format").exists().isIn(['hours', 'material']).withMessage("INVALID_FORMAT"),
    check("workdate").exists().isISO8601().toDate().withMessage('INVALID_WORKDATE_FORMAT'),

    
    check("hours")
        .if(check("format").equals("hours"))
        .exists().withMessage("HOURS_REQUIRED_FOR_HOURS_FORMAT")
        .isNumeric({ no_symbols: true }).toFloat().isFloat({ min: 0.1 }), // Min 0.1?
    check("quantity")
        .if(check("format").equals("material"))
        .exists().withMessage("QUANTITY_REQUIRED_FOR_MATERIAL_FORMAT")
        .isNumeric({ no_symbols: true }).toFloat().isFloat({ min: 0 }),
    check("description") // Description required for both simple formats?
        .exists().withMessage("DESCRIPTION_REQUIRED")
        .notEmpty().isString().trim(),

    (req, res, next) => validateResults(req, res, next)
];




module.exports = {
    mongoIdValidator,
    validatorCreateDeliveryNote,
};