const { matchedData } = require("express-validator");
const { encrypt, compare } = require("../utils/handlePassword");
const { usersModel } = require("../models");
const { tokenSign } = require("../utils/handleJwt");
const { handleHttpError } = require("../utils/handleError");
const { uploadToPinata } = require("../utils/handleUploadIPFS");

const crypto = require('crypto'); // Import crypto for token generation
const { sendEmail } = require('../utils/handleMails'); // Assuming email utility exists

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
        const user = await usersModel.findOneWithDeleted({ email: validatedData.email }).select('+password +status +deleted');

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


const forgotPasswordCtrl = async (req, res) => {
    try {
        const { email } = matchedData(req);
        const user = await usersModel.findOne({ email: email, status: true }); // Find active user

        if (!user) {
            console.log(`Password reset requested for non-existent or inactive email: ${email}`);
            return res.status(200).json({ message: "PASSWORD_RESET_LINK_SENT_IF_ACCOUNT_EXISTS" });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; 

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;
        await user.save();

        console.log(`Reset token generated and saved for user: ${user.email}`);

        
        const resetUrl = `'http://localhost:4000'}/reset-password?token=${resetToken}`;
        
        //No me funciona el email, lo simulo en consola
         // **** Log the URL to the Console Instead of Sending Email ****
         console.log("----- SIMULATED PASSWORD RESET EMAIL -----");
         console.log("To:", user.email);
         console.log("Reset URL:", resetUrl); // Log the full link
         console.log("Reset Token:", resetToken); // Log the token separately for easy copying
         console.log("------------------------------------------");
        
        // ---- codigo para enviar el email

         /*const emailOptions = {
            to: user.email,
            from: process.env.EMAIL || 'noreply@example.com', // Configure sender
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n This link expires in 1 hour.`
            // html: '...' // Optional HTML version
        };
        */

        res.status(200).json({ message: "PASSWORD_RESET_LINK_GENERATED_CHECK_CONSOLE_IF_EXISTS" });

        // ---- codigo para enviar el email
        /*
        try {
            await sendEmail(emailOptions);
            console.log(`Password reset email sent to ${user.email}`);
            
            
            await user.save(); // Save the token and expiry
            
            
            res.status(200).json({ message: "PASSWORD_RESET_LINK_SENT_IF_ACCOUNT_EXISTS" });
        } catch(emailError) {
             console.error("ERROR SENDING RESET EMAIL:", emailError);
             // Even if email fails, don't reveal it to the user potentially. Log it.
             // Maybe reset the token fields?
             //user.resetPasswordToken = undefined;
             //user.resetPasswordExpires = undefined;
             //await user.save();

             // Return generic error or the same success message? Let's return error here.
             handleHttpError(res, "ERROR_SENDING_RESET_EMAIL", 500);
        }
        */

    } catch (err) {
        console.error("FORGOT PASSWORD CTRL ERROR:", err);
        handleHttpError(res, "ERROR_PROCESSING_PASSWORD_RESET_REQUEST", 500);
    }
};


const resetPasswordCtrl = async (req, res) => {
    try {
        const { token, password } = matchedData(req);

        
        const user = await usersModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return handleHttpError(res, "PASSWORD_RESET_TOKEN_INVALID_OR_EXPIRED", 400); 
        }

        
        user.password = await encrypt(password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "PASSWORD_RESET_SUCCESSFUL" });

    } catch (err) {
        console.error("RESET PASSWORD CTRL ERROR:", err);
        handleHttpError(res, "ERROR_RESETTING_PASSWORD", 500);
    }
};



const inviteGuestCtrl = async (req, res) => {
    try {
        const { email: inviteeEmail } = matchedData(req); 
        const inviter = req.user; 

        
        if (!inviter.company || !inviter.company.cif) { 
            return handleHttpError(res, "INVITER_MUST_HAVE_COMPANY_INFO_TO_INVITE", 403);
        }

        const existingUser = await usersModel.findOne({ email: inviteeEmail });
        if (existingUser) {
             return handleHttpError(res, "EMAIL_ALREADY_REGISTERED", 409); 
        }

        const inviteToken = crypto.randomBytes(20).toString('hex');
        const inviteTokenExpires = Date.now() + (3 * 24 * 3600000);

        const guestUser = new usersModel({
            email: inviteeEmail,
            status: false, 
            role: 'invitado',
            company: inviter.company, 
            invitationToken: inviteToken,
            invitationExpires: inviteTokenExpires,
            invitedBy: inviter._id 
        });

        await guestUser.save();

        
        const acceptUrl = `'http://localhost:3000'}/accept-invitation?token=${inviteToken}`;
        
        console.log("----- SIMULATED INVITATION EMAIL -----");
        console.log("To:", inviteeEmail);
        console.log("From:", inviter.email);
        console.log("Accept URL:", acceptUrl);
        console.log("Invite Token:", inviteToken);
        console.log("--------------------------------------");

        // ---- codigo para enviar el email

        /*
        const emailOptions = {
            to: inviteeEmail,
            from: process.env.EMAIL_FROM || 'noreply@example.com',
            subject: `Invitation to join ${inviter.company.nombre || 'the team'}`,
            text: `You have been invited by ${inviter.nombre || inviter.email} to join ${inviter.company.nombre || 'their team'} as a guest.\n\nPlease click on the following link to accept the invitation and set up your account:\n\n${acceptUrl}\n\nIf you did not expect this invitation, please ignore this email.\nThis link expires in 3 days.`
            // html: '...'
        };

         try {
            await sendEmail(emailOptions);
            console.log(`Invitation email sent to ${inviteeEmail}`);
             res.status(200).json({ message: "INVITATION_SENT_SUCCESSFULLY" });
        } catch(emailError) {
             console.error("ERROR SENDING INVITATION EMAIL:", emailError);
             // Important: If email fails, should we delete the guest user created?
             try { await usersModel.deleteOne({ _id: guestUser._id }); } catch (delErr) {} // Attempt cleanup
             handleHttpError(res, "ERROR_SENDING_INVITATION_EMAIL", 500);
        }
        */

        res.status(200).json({ message: "INVITATION_GENERATED_CHECK_CONSOLE" });

    } catch (err) {
        console.error("INVITE GUEST CTRL ERROR:", err);
         if (err.code === 11000) { 
            handleHttpError(res, "EMAIL_ALREADY_REGISTERED", 409);
         } else {
            handleHttpError(res, "ERROR_PROCESSING_INVITATION", 500);
         }
    }
};



const acceptInvitationCtrl = async (req, res) => {
    try {
        const { token, password, name, surnames } = matchedData(req); 
        const guestUser = await usersModel.findOne({
            invitationToken: token,
            invitationExpires: { $gt: Date.now() }
        }).select('+invitationToken +invitationExpires'); 

        if (!guestUser) {
            return handleHttpError(res, "INVITATION_TOKEN_INVALID_OR_EXPIRED", 400);
        }

        guestUser.password = await encrypt(password);
        guestUser.status = true; 
        
        if (name) guestUser.nombre = name;
        if (surnames) guestUser.apellidos = surnames;

        
        guestUser.invitationToken = undefined;
        guestUser.invitationExpires = undefined;

        await guestUser.save();

        
        const jwtToken = tokenSign({ _id: guestUser._id, role: guestUser.role });

        res.status(200).json({
             message: "INVITATION_ACCEPTED_SUCCESSFULLY",
             token: jwtToken, 
             user: guestUser.toJSON() 
        });

    } catch (err) {
        console.error("ACCEPT INVITATION CTRL ERROR:", err);
        handleHttpError(res, "ERROR_ACCEPTING_INVITATION", 500);
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
    deleteMyAccountCtrl,
    forgotPasswordCtrl,
    resetPasswordCtrl,
    inviteGuestCtrl,
    acceptInvitationCtrl  
};