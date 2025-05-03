const { matchedData } = require("express-validator");
const { encrypt, compare } = require("../utils/handlePassword");
const { usersModel } = require("../models");
const { tokenSign } = require("../utils/handleJwt");
const { handleHttpError } = require("../utils/handleError");
const { uploadToPinata } = require("../utils/handleUploadIPFS");


const registerCtrl = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const password = await encrypt(validatedData.password);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const body = {
            email: validatedData.email,
            password,
            codigo: verificationCode,
            status: false, 
            role: 'user'
        };

        let newUser = await usersModel.create(body);

        console.log(`Verification code for ${newUser.email}: ${verificationCode}`);

       const token = tokenSign({ _id: newUser._id, role: newUser.role });

        const userForResponse = {
             _id: newUser._id,
             email: newUser.email,
             status: newUser.status, 
             role: newUser.role
        };

        res.status(201).json({ 
             token,
             user: userForResponse
        });

    } catch (err) {
        console.error("REGISTER CTRL ERROR:", err);
        if (err.code === 11000) { 
            handleHttpError(res, "EMAIL_ALREADY_EXISTS", 409);
        } else if (err.message === "EMAIL_ALREADY_REGISTERED_AND_VERIFIED") { // Custom validator error
             handleHttpError(res, err.message, 409);
        }
        else {
            handleHttpError(res, "ERROR_REGISTER_USER", 500);
        }
    }
};


const loginCtrl = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const user = await usersModel.findOne({ email: validatedData.email })
                                     .select('+password +status');

        if (!user) {
            return handleHttpError(res, "USER_NOT_FOUND", 404); 
        }

        if (!user.status) {
             return handleHttpError(res, "USER_NOT_VALIDATED", 401); 
        }

         if (user.deleted) {
             return handleHttpError(res, "USER_ACCOUNT_INACTIVE", 401); 
         }

        const hashPassword = user.password;
        const check = await compare(validatedData.password, hashPassword);

        if (!check) {
            return handleHttpError(res, "USER_NOT_FOUND", 404); 
        }

        const token = tokenSign({ _id: user._id, role: user.role });

        const userForResponse = {
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.nombre || null 
        };

        res.status(200).json({
            token,
            user: userForResponse
        });

    } catch (err) {
        console.error("LOGIN CTRL ERROR:", err);
        handleHttpError(res, "ERROR_LOGIN_USER", 500);
    }
};


const verifyEmailCtrl = async (req, res) => {
    try {
        const { code } = matchedData(req);
        const user = req.user; 

        const userToVerify = await usersModel.findById(user._id).select('+codigo +status');

        if (!userToVerify) {
             return handleHttpError(res, "USER_NOT_FOUND", 404);
        }

        if (userToVerify.status) {
            
            return res.status(200).json({ acknowledged: true, message: "EMAIL_ALREADY_VERIFIED" });
        }

        if (userToVerify.codigo !== code.toString()) {
           
            return handleHttpError(res, "INVALID_VERIFICATION_CODE", 422);
        }

        userToVerify.status = true;
        userToVerify.codigo = undefined; 
        await userToVerify.save();

        
        res.status(200).json({ acknowledged: true });

    } catch (err) {
        console.error("VERIFY EMAIL CTRL ERROR:", err);
        handleHttpError(res, "ERROR_VERIFYING_EMAIL", 500);
    }
};


const updatePersonalCtrl = async (req, res) => {
    try {
        const validatedData = matchedData(req);
        const user = req.user; 

        user.nombre = validatedData.nombre;       
        user.apellidos = validatedData.apellidos; 
        user.nif = validatedData.nif;

        await user.save();

        const userForResponse = {
             _id: user._id,
             email: user.email,
             status: user.status, 
             role: user.role,
             createdAt: user.createdAt,
             updatedAt: user.updatedAt,
             name: user.nombre, 
             nif: user.nif,
             surnames: user.apellidos 
             
        };


        res.status(200).json(userForResponse);

    } catch (err) {
        console.error("UPDATE PERSONAL CTRL ERROR:", err);
        handleHttpError(res, "ERROR_UPDATING_PERSONAL_DATA", 500);
    }
};


const updateCompanyCtrl = async (req, res) => {
    try {
        const companyData = req.body.company; 
        const user = req.user; 

        if (user.role === 'autonomo') {
            user.company = {
                nombre: user.nombre,
                cif: user.nif,
                street: companyData?.street,
                number: companyData?.number,
                postal: companyData?.postal,
                city: companyData?.city,
                province: companyData?.province
            };
        } else {
            if (!user.company) user.company = {};

            Object.assign(user.company, companyData);
        }

        await user.save();

        res.status(200).json({ acknowledged: true });

    } catch (err) {
        console.error("UPDATE COMPANY CTRL ERROR:", err);
        if (err.code === 11000 && err.keyPattern && err.keyPattern['company.cif']) {
             handleHttpError(res, "COMPANY_CIF_ALREADY_EXISTS", 409); // Match spec error
        } else {
            handleHttpError(res, "ERROR_UPDATING_COMPANY_DATA", 500);
        }
    }
};

const updateLogoCtrl = async (req, res) => {
    try {
        const user = req.user;

        if (!req.file) {
            return handleHttpError(res, "NO_LOGO_IMAGE_PROVIDED", 400); // Use 400 Bad Request
        }

        const ipfsResponse = await uploadToPinata(req.file.buffer, req.file.originalname);
        if (!ipfsResponse || !ipfsResponse.IpfsHash) {
             throw new Error("Failed to upload image to IPFS/Pinata"); // Triggers 500
        }
        const logoUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResponse.IpfsHash}`;

        user.logo = logoUrl;
        await user.save();

        res.status(200).json({ status: "OK", logoUrl: user.logo }); // Adjusted response

    } catch (err) {
        console.error("UPDATE LOGO CTRL ERROR:", err);
        handleHttpError(res, "ERROR_UPDATING_LOGO", 500);
    }
};


const getMyProfileCtrl = async (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (err) {
        console.error("GET PROFILE CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_USER_PROFILE", 500);
    }
};


const deleteMyAccountCtrl = async (req, res) => {
     try {
        const user = req.user;
        const softDelete = req.query.soft !== "false"; 

        if (softDelete) {
            await user.delete(); 
            res.status(200).json({ message: "USER_ACCOUNT_DEACTIVATED" });
        } else {
            await usersModel.findByIdAndDelete(user._id);
            res.status(200).json({ message: "USER_ACCOUNT_PERMANENTLY_DELETED" });
        }
    } catch (err) {
        console.error("DELETE ACCOUNT CTRL ERROR:", err);
        handleHttpError(res, "ERROR_DELETING_USER", 500);
    }
};


module.exports = {
    registerCtrl,
    loginCtrl,
    verifyEmailCtrl,
    updatePersonalCtrl, 
    updateCompanyCtrl,
    updateLogoCtrl,
    getMyProfileCtrl,     
    deleteMyAccountCtrl  
};