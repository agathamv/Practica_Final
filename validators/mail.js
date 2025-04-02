const {check} = require('express-validator');
const { validateResults } = require('../utils/handleValidators');

const validatorMail = [
    check("subject").exists().notEmpty(),
    check("text").exists().notEmpty(),
    check("to").exists().notEmpty(),
    check("from").exists().notEmpty(),
    
    (req, res, next) => {
        return validateResults(req, res, next)
    }
];

module.exports = { validatorMail }