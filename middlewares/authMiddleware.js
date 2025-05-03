const { handleHttpError } = require("../utils/handleError");
const { verifyToken } = require("../utils/handleJwt");
const { usersModel } = require("../models"); 

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return handleHttpError(res, "NO_TOKEN_PROVIDED_OR_INVALID_FORMAT", 401);
        }

        const token = authHeader.split(" ").pop(); 
        const decodedToken = verifyToken(token);

        if (!decodedToken || !decodedToken._id) {
            return handleHttpError(res, "INVALID_OR_EXPIRED_TOKEN", 401);
        }

       
        const user = await usersModel.findById(decodedToken._id);

        if (!user) {
            return handleHttpError(res, "USER_NOT_FOUND_FOR_TOKEN", 404);
        }

        if (user.deleted) { 
             return handleHttpError(res, "USER_ACCOUNT_DEACTIVATED", 403);
        }

        req.user = user; 
        
        next();

    } catch (err) {
        console.error("AUTH MIDDLEWARE ERROR:", err);
        handleHttpError(res, "NOT_AUTHORIZED_SESSION_ERROR", 401);
    }
};


const checkRole = (roles) => async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.role) {
            return handleHttpError(res, "USER_DATA_MISSING_FOR_ROLE_CHECK", 500);
        }

        if (!roles.includes(user.role)) {
            return handleHttpError(res, "USER_NOT_PERMITTED_FOR_RESOURCE", 403);
        }

        next();
    } catch (e) {
        console.error("CHECK ROLE MIDDLEWARE ERROR:", e);
        handleHttpError(res, "ERROR_CHECKING_PERMISSIONS", 500);
    }
};


module.exports = { authMiddleware, checkRole };