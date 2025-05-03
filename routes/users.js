const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware'); // Check path
const { uploadMiddlewareMemory } = require('../utils/handleStorage'); // Check path

const {validatorRegister, validatorLogin, validatorVerify, validatorUpdatePersonal, validatorCompany} = require('../validators/users'); // Check path

const { registerCtrl, loginCtrl, verifyEmailCtrl, updatePersonalCtrl, updateCompanyCtrl, updateLogoCtrl, getMyProfileCtrl, deleteMyAccountCtrl} = require('../controllers/users'); // Check path



router.post("/register", validatorRegister, registerCtrl);


router.post("/login", validatorLogin, loginCtrl);


router.put("/validation", authMiddleware, validatorVerify, verifyEmailCtrl);



router.put("/personal", authMiddleware, validatorUpdatePersonal, updatePersonalCtrl);


router.patch("/company", authMiddleware, validatorCompany, updateCompanyCtrl);


router.patch("/logo",
    authMiddleware,
    uploadMiddlewareMemory.single("logo"), 
    updateLogoCtrl
);

router.get("/me", authMiddleware, getMyProfileCtrl);

router.delete("/me", authMiddleware, deleteMyAccountCtrl);


module.exports = router;