
const { check } = require("express-validator");
const { usersModel } = require("../models");
const validateResults = require("../utils/handleValidators");

const validatorRegister = [
    check("email")
        .exists().withMessage("EMAIL_REQUIRED")
        .notEmpty().withMessage("EMAIL_CANNOT_BE_EMPTY")
        .isEmail().withMessage("EMAIL_INVALID_FORMAT")
        .custom(async (email = '') => {
            const existingVerifiedUser = await usersModel.findOne({ email: email, status: true });
            if (existingVerifiedUser) {
                throw new Error("EMAIL_ALREADY_REGISTERED_AND_VERIFIED"); 
            }
            return true;
        }),
    check("password")
        .exists().withMessage("PASSWORD_REQUIRED")
        .isLength({ min: 8 }).withMessage("PASSWORD_MIN_8_CHARS"), 
    (req, res, next) => validateResults(req, res, next)
];

const validatorLogin = [
    check("email")
        .exists().withMessage("EMAIL_REQUIRED")
        .isEmail().withMessage("EMAIL_INVALID_FORMAT"),
    check("password")
        .exists().withMessage("PASSWORD_REQUIRED")
        .notEmpty().withMessage("PASSWORD_CANNOT_BE_EMPTY"),
    (req, res, next) => validateResults(req, res, next)
];

const validatorVerify = [
    check("code")
        .exists().withMessage("CODE_REQUIRED")
        .isLength({ min: 6, max: 6 }).withMessage("VERIFICATION_CODE_MUST_BE_6_DIGITS")
        .isNumeric().withMessage("VERIFICATION_CODE_MUST_BE_NUMERIC"),
    (req, res, next) => validateResults(req, res, next)
];

const validatorUpdatePersonal = [
    check("nombre") 
        .exists().withMessage("NAME_REQUIRED")
        .notEmpty().withMessage("NAME_CANNOT_BE_EMPTY")
        .isString(),
    check("apellidos")
        .exists().withMessage("SURNAMES_REQUIRED")
        .notEmpty().withMessage("SURNAMES_CANNOT_BE_EMPTY")
        .isString(),
    check("nif")
        .exists().withMessage("NIF_REQUIRED")
        .matches(/^\d{8}[A-Z]$/).withMessage("NIF_INVALID_FORMAT"),
    (req, res, next) => validateResults(req, res, next)
];

const validatorCompany = [
    check("company").exists().withMessage("COMPANY_OBJECT_REQUIRED"),
    check("company.name")
        .optional().isString().withMessage("COMPANY_NAME_MUST_BE_STRING"),
    check("company.cif")
        .optional().isString().withMessage("COMPANY_CIF_MUST_BE_STRING"), 
    check("company.street").optional().isString(),
    check("company.number").optional().isString(), 
    check("company.postal").optional().isPostalCode('ES').withMessage("COMPANY_POSTAL_INVALID"), 
    check("company.city").optional().isString(),
    check("company.province").optional().isString(),
    (req, res, next) => validateResults(req, res, next)
];

const validatorForgotPassword = [
    check("email")
        .exists().withMessage("EMAIL_REQUIRED")
        .isEmail().withMessage("EMAIL_INVALID_FORMAT"),
    (req, res, next) => validateResults(req, res, next)
];

const validatorResetPassword = [
    check("token") // Assuming token is in the body for this example
        .exists().withMessage("TOKEN_REQUIRED")
        .notEmpty().withMessage("TOKEN_CANNOT_BE_EMPTY")
        .isHexadecimal().withMessage("TOKEN_INVALID_FORMAT") // Basic check
        .isLength({ min: 40, max: 40 }).withMessage("TOKEN_INVALID_LENGTH"), // Based on crypto.randomBytes(20)
    check("password")
        .exists().withMessage("PASSWORD_REQUIRED")
        .isLength({ min: 8 }).withMessage("PASSWORD_MIN_8_CHARS"),
    (req, res, next) => validateResults(req, res, next)
];

const validatorInvite = [
    check("email") // Email of the person being invited
        .exists().withMessage("EMAIL_REQUIRED")
        .isEmail().withMessage("EMAIL_INVALID_FORMAT")
        .custom(async (email = '') => {
            // Check if invitee email already exists and is active
            const existingUser = await usersModel.findOne({ email: email /*, status: true */ }); // Check if email exists at all for now
            if (existingUser) {
                // Decide how to handle: Error? Allow re-invite?
                throw new Error("EMAIL_ALREADY_REGISTERED");
            }
            return true;
        }),
    (req, res, next) => validateResults(req, res, next)
];

const validatorAcceptInvitation = [
    check("token") // Assuming token is in the body
        .exists().withMessage("TOKEN_REQUIRED")
        .notEmpty().withMessage("TOKEN_CANNOT_BE_EMPTY")
        .isHexadecimal().withMessage("TOKEN_INVALID_FORMAT")
        .isLength({ min: 40, max: 40 }).withMessage("TOKEN_INVALID_LENGTH"),
    check("password")
        .exists().withMessage("PASSWORD_REQUIRED")
        .isLength({ min: 8 }).withMessage("PASSWORD_MIN_8_CHARS"),
    check("name").optional().isString().notEmpty(), // Optional: Allow setting name on accept
    check("surnames").optional().isString().notEmpty(), // Optional: Allow setting surnames on accept
    (req, res, next) => validateResults(req, res, next)
];

module.exports = {
    validatorRegister,
    validatorLogin,
    validatorVerify,
    validatorUpdatePersonal,
    validatorCompany,
    validatorForgotPassword,
    validatorResetPassword,
    validatorInvite,
    validatorAcceptInvitation
};