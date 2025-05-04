const { check, param, query } = require("express-validator");
const validateResults = require("../utils/handleValidators"); 
const mongoose = require('mongoose');


const mongoIdValidator = (paramName = 'id') => [
    param(paramName)
        .exists().withMessage(`${paramName.toUpperCase()}_ID_REQUIRED`)
        .isMongoId().withMessage(`INVALID_${paramName.toUpperCase()}_ID_FORMAT`),
];

const validatorCreateProject = [
    check("name").exists().notEmpty().isString(),
    check("clientId").exists().withMessage("CLIENT_ID_REQUIRED").isMongoId().withMessage("INVALID_CLIENT_ID_FORMAT"),
    check("projectCode").optional().isString(),
    check("code").optional().isString(),
    check("address").optional().isObject(),
    check("address.street").optional().isString(),
    check("address.number").optional().isString(),
    check("address.postal").optional().isString(),
    check("address.city").optional().isString(),
    check("address.province").optional().isString(),
    check("begin").optional().isString(), 
    check("end").optional().isString(),   
    check("notes").optional().isString(),

    (req, res, next) => validateResults(req, res, next) 
];

const validatorUpdateProject = [
    
    check("name").optional().notEmpty().isString(),
    check("clientId").optional().isMongoId().withMessage("INVALID_CLIENT_ID_FORMAT"), // Permitir cambio de cliente?
    check("projectCode").optional().isString(),
    check("code").optional().isString(),
    check("address").optional().isObject(),
    check("address.street").optional().isString(),
    check("address.number").optional().isString(),
    check("address.postal").optional().isString(),
    check("address.city").optional().isString(),
    check("address.province").optional().isString(),
    check("begin").optional().isString(),
    check("end").optional().isString(),
    check("notes").optional().isString(),
    (req, res, next) => validateResults(req, res, next)
];

const validatorGetProjectsQuery = [
    query('sort').optional().isIn(['asc', 'desc']).withMessage('INVALID_SORT_VALUE'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorGetProjectsByClient = [
    ...mongoIdValidator('client'), // Desestructurar para incluir validación de 'client'
    query('sort').optional().isIn(['asc', 'desc']).withMessage('INVALID_SORT_VALUE'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorGetProjectByIdQuery = [
    ...mongoIdValidator('id'), // Desestructurar para incluir validación de 'id'
    query('prices').optional().isIn(['material', 'hours', 'all']).withMessage('INVALID_PRICES_VALUE'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorGetProjectByClientAndId = [
    ...mongoIdValidator('client'),
    ...mongoIdValidator('id'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorActivateProject = [
    ...mongoIdValidator('id'),
    check("active")
        .exists().withMessage('ACTIVE_STATUS_REQUIRED')
        .isBoolean().withMessage('ACTIVE_STATUS_MUST_BE_BOOLEAN'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorUpdatePrices = [
    ...mongoIdValidator('id'),
    check("prices").exists().isArray({ min: 1 }).withMessage('PRICES_ARRAY_REQUIRED_AND_NON_EMPTY'),
    check("prices.*.format").exists().isIn(['material', 'hours']).withMessage('INVALID_PRICE_FORMAT'),
    check("prices.*.unit").optional().isString(), 
    check("prices.*.concept").exists().notEmpty().isString(),
    check("prices.*.price").exists().isNumeric({ no_symbols: true }).toFloat().isFloat({ min: 0 }),
    (req, res, next) => validateResults(req, res, next)
];

const validatorUpdateAmount = [
    ...mongoIdValidator('id'),
    check("amount").exists().isNumeric({ no_symbols: true }).toFloat().isFloat({ min: 0 }),
    (req, res, next) => validateResults(req, res, next)
];

module.exports = {mongoIdValidator, validatorCreateProject, validatorUpdateProject, validatorGetProjectsQuery, validatorGetProjectsByClient, validatorGetProjectByIdQuery, validatorGetProjectByClientAndId, validatorActivateProject, validatorUpdatePrices, validatorUpdateAmount};