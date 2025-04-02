const {handleHttpError} = require("../utils/handleError")
const {matchedData} = require("express-validator")
const {encrypt, compare} = require("../utils/handlePassword")
const {usersModel} = require("../models")
const {tokenSign, verifyToken} = require("../utils/handleJwt")


const registerCtrl = async (req, res) => {
    try {
        req = matchedData(req)
        const password = await encrypt(req.password)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
        const body = {...req, password, codigo: verificationCode}
        const dataUser = await usersModel.create(body)
        dataUser.set("password", undefined, {strict:false})

        const token = await tokenSign(dataUser);

        const response = {
            token,
            user: {
                email: dataUser.email,
                status: dataUser.status,
                role: dataUser.role,
                codigo: dataUser.codigo
            }
        };

        res.json(response)
    }catch(err){
        console.log(err)
        handleHttpError(res, "ERROR_REGISTER_USER")
    }
}

const loginCtrl = async (req, res) => {
    try {
        req = matchedData(req)
        const user = await usersModel.findOne({ email: req.email }).select("password name role email")
        if(!user){
            handleHttpError(res, "USER_NOT_EXISTS", 404)
            return
        }
        const hashPassword = user.password;
        const check = await compare(req.password, hashPassword)
        if(!check){
            handleHttpError(res, "INVALID_PASSWORD", 401)
            return
        }
        user.set("password", undefined, {strict:false}) //Si no queremos que se muestre el hash en la respuesta
        const data = {
            token: await tokenSign(user),
            user
        }
        res.send(data)
    }catch(err){
            console.log(err)
            handleHttpError(res, "ERROR_LOGIN_USER")
    }
}

const PersonalDataCtrl = async (req, res) => {
    try {
        // Validar y obtener datos del body
        const { nombre, apellidos, nif } = matchedData(req);

        // Obtener token desde headers
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return handleHttpError(res, "No se proporcionó token", 401);
        }

        // Extraer y verificar token
        const token = authHeader.split(" ")[1];
        const decoded = await verifyToken(token);

        if (!decoded || !decoded._id) {
            return handleHttpError(res, "Token inválido", 401);
        }

        // Buscar usuario y actualizarlo
        const user = await usersModel.findById(decoded._id);
        if (!user) {
            return handleHttpError(res, "Usuario no encontrado", 404);
        }

        user.nombre = nombre;
        user.apellidos = apellidos;
        user.nif = nif;
        await user.save();

        res.json({ message: "Datos actualizados correctamente", user });
    } catch (err) {
        console.error("Error en onboarding:", err);
        handleHttpError(res, "Error al actualizar los datos", 500);
    }
};

const companyCtrl = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return handleHttpError(res, "No se proporcionó token", 401);
        }

        const token = authHeader.split(" ")[1];
        const decoded = await verifyToken(token);

        if (!decoded || !decoded._id) {
            return handleHttpError(res, "Token inválido", 401);
        }

        const user = await usersModel.findById(decoded._id);
        if (!user) {
            return handleHttpError(res, "Usuario no encontrado", 404);
        }

        const { nombre, cif, direccion } = matchedData(req);

        if (user.role === "autonomo") {
            user.company = {
                nombre: user.nombre,
                cif: user.nif,
                direccion 
            };
        } else {
            user.company = { nombre, cif, direccion };
        }

        await user.save();

        res.json({ message: "Datos de la compañía actualizados", company: user.company });
    } catch (err) {
        console.error("Error en companyCtrl:", err);
        handleHttpError(res, "Error al actualizar los datos de la compañía", 500);
    }
};





module.exports = {registerCtrl, loginCtrl, PersonalDataCtrl, companyCtrl}