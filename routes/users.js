const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware'); // Check path
const { uploadMiddlewareMemory } = require('../utils/handleStorage'); // Check path

const {validatorRegister, validatorLogin, validatorVerify, validatorUpdatePersonal, validatorCompany, validatorForgotPassword, validatorResetPassword, validatorInvite, validatorAcceptInvitation} = require('../validators/users'); 

const { registerCtrl, loginCtrl, verifyEmailCtrl, updatePersonalCtrl, updateCompanyCtrl, updateLogoCtrl, getMyProfileCtrl, deleteMyAccountCtrl, forgotPasswordCtrl, resetPasswordCtrl, inviteGuestCtrl, acceptInvitationCtrl} = require('../controllers/users'); 



router.post("/register", validatorRegister, registerCtrl);

router.post("/login", validatorLogin, loginCtrl);

router.put("/validation", authMiddleware, validatorVerify, verifyEmailCtrl);



router.put("/personal", authMiddleware, validatorUpdatePersonal, updatePersonalCtrl);

router.patch("/company", authMiddleware, validatorCompany, updateCompanyCtrl);

router.patch("/logo", authMiddleware, uploadMiddlewareMemory.single("logo"), updateLogoCtrl);

router.get("/me", authMiddleware, getMyProfileCtrl);

router.delete("/me", authMiddleware, deleteMyAccountCtrl);


router.post("/forgot-password", validatorForgotPassword, forgotPasswordCtrl);

router.post("/reset-password", validatorResetPassword, resetPasswordCtrl);


router.post("/invite", authMiddleware, validatorInvite, inviteGuestCtrl); // Invite requires login

router.post("/accept-invitation", validatorAcceptInvitation, acceptInvitationCtrl);

module.exports = router;