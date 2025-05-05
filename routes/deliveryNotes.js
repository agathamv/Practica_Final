const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadMiddlewareMemory } = require('../utils/handleStorage');

const {mongoIdValidator, validatorCreateDeliveryNote} = require('../validators/deliveryNotes');


const {createDeliveryNoteCtrl, getDeliveryNotesCtrl, getDeliveryNoteByIdCtrl, deleteDeliveryNoteCtrl, downloadPdfCtrl, signDeliveryNoteCtrl} = require('../controllers/deliveryNotes'); // Adjust path


router.use(authMiddleware);


router.get("/pdf/:id", mongoIdValidator('id'), downloadPdfCtrl);

router.patch("/sign/:id", mongoIdValidator('id'), uploadMiddlewareMemory.single('sign'), signDeliveryNoteCtrl);
router.post("/", validatorCreateDeliveryNote, createDeliveryNoteCtrl);
router.get("/", getDeliveryNotesCtrl);
router.get("/:id", mongoIdValidator('id'), getDeliveryNoteByIdCtrl);

router.delete("/:id", mongoIdValidator('id'), deleteDeliveryNoteCtrl);

module.exports = router;