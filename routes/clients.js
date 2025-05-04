
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');


const {validatorCreateClient, validatorUpdateClient, validatorClientId} = require('../validators/clients');


const {createClientCtrl, getClientsCtrl, getClientByIdCtrl, updateClientCtrl, deleteClientCtrl, getArchivedClientsCtrl, restoreClientCtrl} = require('../controllers/clients'); // Adjust path


router.use(authMiddleware);


router.get("/archived", getArchivedClientsCtrl);

router.post("/", validatorCreateClient, createClientCtrl);

router.get("/", getClientsCtrl);

router.get("/:id", validatorClientId, getClientByIdCtrl);

router.put("/:id", validatorClientId, validatorUpdateClient, updateClientCtrl);

router.delete("/:id", validatorClientId, deleteClientCtrl);

router.patch("/:id/restore", validatorClientId, restoreClientCtrl);


module.exports = router;