const { matchedData } = require("express-validator");
const UserModel = require('../models/users.js');
const bcrypt = require("bcrypt");
const { handleHttpError } = require("../utils/handleError");
const { usersModel } = require("../models");
const { verifyToken, tokenSign } = require("../utils/handleJwt");
const { uploadMiddlewareMemory } = require("../utils/handleStorage");
const { uploadToPinata } = require("../utils/handleUploadIPFS");

const getItem = async (req, res) => {
    try {
        const { email } = matchedData(req);
        const data = await UserModel.findOne({email: email });
        if (!data) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(data);
    } catch (err) {
        console.error("Error en getItem:", err);
        handleHttpError(res, "Error en la obtención del usuario", 500);
    }
};

const getUserCtrl = async (req, res) => {
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

        const user = await UserModel.findById(decoded._id).select("-password");
        if (!user) {
            return handleHttpError(res, "Usuario no encontrado", 404);
        }

        res.json(user);
    } catch (err) {
        console.error("Error en getUserCtrl:", err);
        handleHttpError(res, "Error al obtener el usuario", 500);
    }
};



const getItems = async (req, res) => {
    try {
        const users = await usersModel.find();

        const data = await Promise.all(users.map(async (user) => {
            const token = await tokenSign(user);
            return {
                email: user.email,
                status: user.status,
                role: user.role,
                codigo: user.codigo,
                token,
                deleted: user.deleted,
            };
        }));

        res.json(data);
    } catch (err) {
        console.error("Error en getItems:", err);
        handleHttpError(res, "Error en la obtención de los usuarios", 500);
    }
};
/*

const getItems = async (req, res) => {
    try {
        const data = await usersModel.find();
        res.json(data);
    } catch (err) {
        console.error("Error en getItems:", err);
        handleHttpError(res, "Error en la obtención de los usuarios", 500);
    }
};
*/


const createItem = async (req, res) => {
    try{
        const body = matchedData(req);
        const hashedPassword = await bcrypt.hash(body.password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000);

        const data = new UserModel({
            email: body.email,
            password: hashedPassword,
            codigo: verificationCode,
            intentos: 3,
            status: false,
            role: "user"
        });

        await data.save();

        res.json(data);
    }catch(err){
        console.error("Error en createItem:", err);
        res.status(500).json({ error: "Error al crear el usuario"}); 
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { code } = matchedData(req);
        const authHeader = req.headers.authorization;
        
        // Verificar si el header de autorización está presente
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return handleHttpError(res, "No se proporcionó token o formato incorrecto", 401);
        }
        
        const token = authHeader.split(" ")[1]; // Extraer el token
        const decoded = await verifyToken(token); // Verificar el token
        
        // Verificar si el token es válido y contiene el _id
        if (!decoded || !decoded._id) {
            return handleHttpError(res, "Token inválido", 401);
        }
        
        // Buscar al usuario en la base de datos usando el _id del token
        const user = await usersModel.findById(decoded._id);
        if (!user) {
            return handleHttpError(res, "Usuario no encontrado", 404);
        }
        
        // Verificar que el código del usuario coincida con el código proporcionado
        if (user.codigo !== code) {
            return handleHttpError(res, "Código incorrecto", 400);
        }
        
        // Cambiar el estado del usuario a "verificado"
        user.status = true;
        await user.save();
        
        // Responder con éxito
        res.json({ message: "Email verificado correctamente" });
    } catch (err) {
        console.error("Error en verifyEmail:", err);
        handleHttpError(res, "Error al verificar el email", 500);
    }
};


const updateLogoCtrl = async (req, res) => {
    try {
        uploadMiddlewareMemory.single("logo")(req, res, async (err) => {
            if (err) {
                return handleHttpError(res, "Error al subir la imagen: " + err.message, 400);
            }

            if (!req.file) {
                return handleHttpError(res, "No se proporcionó una imagen", 400);
            }

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

            // Subir a IPFS
            const ipfsResponse = await uploadToPinata(req.file.buffer, req.file.originalname);
            const logoUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResponse.IpfsHash}`;

            // Guardar URL en la base de datos
            user.logo = logoUrl;
            await user.save();

            res.json({ message: "Logo actualizado correctamente", logoUrl: user.logo });
        });
    } catch (err) {
        console.error("Error en updateLogoCtrl:", err);
        handleHttpError(res, "Error al actualizar el logo", 500);
    }
};

const updateItem =  async (req, res) => {
    
    const email = req.params.email;
    const data = await UserModel.findOneAndReplace(
        {email}, 
        req.body, {returnDocument: 'after'});
    res.json(data)
}

/*const deleteItem = async (req, res) => {
    const data = await UserModel.findOneAndDelete({email: req.params.email})
    res.json(data)
}*/


const deleteItem = async (req, res) => {
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

        const user = await UserModel.findById(decoded._id);
        if (!user) {
            return handleHttpError(res, "Usuario no encontrado", 404);
        }

        const softDelete = req.query.soft !== "false"; // Soft delete por defecto
        if (softDelete) {
            user.deleted = true;
            await user.save();
            return res.json({ message: "Usuario marcado como eliminado (soft delete)" });
        } else {
            await UserModel.findByIdAndDelete(decoded._id);
            return res.json({ message: "Usuario eliminado definitivamente (hard delete)" });
        }

    } catch (err) {
        console.error("Error en deleteUserCtrl:", err);
        handleHttpError(res, "Error al eliminar el usuario", 500);
    }
};



module.exports = {getItem, getItems, verifyEmail, updateItem, createItem, deleteItem, updateLogoCtrl, getUserCtrl }