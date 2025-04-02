const {handleHttpError} = require("../utils/handleError")
const {verifyToken} = require("../utils/handleJwt")
const {usersModel} = require("../models")


const authMiddleware = async (req, res, next) => {
    try {
        if(!req.headers.authorization){
            handleHttpError(res, "NO_TOKEN_PROVIDED", 401)
            return
        }
        //Nos llega la palabra reservada Bearer y el token, asi que me quedo con la ultima parte
        const token = req.headers.authorization.split(" ").pop()
        //del token, miramos el payload (revisar verifyToken en handleJwt)
        const dataToken = await verifyToken(token)

        if(!dataToken._id){
            handleHttpError(res, "INVALID_TOKEN", 401)
            return
        }

        const user = await usersModel.findById(dataToken._id)
        req.user = user //inyecto al user en la peticion

        next()
        
    }catch(err){
        handleHttpError(res, "NOT_SESSION", 401)
    }
}



module.exports = {authMiddleware}