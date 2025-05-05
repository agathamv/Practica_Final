const { matchedData } = require("express-validator");
const { deliveryNotesModel, projectsModel} = require("../models");
const { handleHttpError } = require("../utils/handleError");
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { uploadToPinata } = require('../utils/handleUploadIPFS');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const checkProjectOwnership = async (userId, projectId) => {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return false;
    const project = await projectsModel.findOne({ _id: projectId, userId: userId });
    return !!project;
};



const createDeliveryNoteCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const validatedData = matchedData(req);

        const projectOwned = await checkProjectOwnership(userId, validatedData.projectId);
        if (!projectOwned) {
            return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        }

        const deliveryNoteData = { ...validatedData, userId };

        const createdNote = await deliveryNotesModel.create(deliveryNoteData);

        const response = {
             _id: createdNote._id, userId, clientId: createdNote.clientId,
             projectId: createdNote.projectId, format: createdNote.format,
             hours: createdNote.hours, quantity: createdNote.quantity,
             description: createdNote.description, workdate: createdNote.workdate,
             pending: createdNote.pending,
             createdAt: createdNote.createdAt, updatedAt: createdNote.updatedAt
        };
        Object.keys(response).forEach(key => response[key] === undefined && delete response[key]);
        res.status(201).json(response);

    } catch (err) {
        console.error("CREATE DELIVERY NOTE CTRL ERROR:", err);
        handleHttpError(res, "ERROR_CREATING_DELIVERY_NOTE", 500);
    }
};

const getDeliveryNotesCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const deliveryNotes = await deliveryNotesModel.find({ userId });
        res.status(200).json(deliveryNotes);
    } catch (err) {
        console.error("GET DELIVERY NOTES CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_DELIVERY_NOTES", 500);
    }
};



const getDeliveryNoteByIdCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });

        const deliveryNote = await deliveryNotesModel.findOne({ _id: id, userId })
            .populate('userId', 'nombre apellidos email company')
            .populate('clientId', 'name cif address') 
            .populate('projectId', 'name projectCode code address');

        if (!deliveryNote) {
            return handleHttpError(res, "DELIVERY_NOTE_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        res.status(200).json(deliveryNote);

    } catch (err) {
        console.error("GET DELIVERY NOTE BY ID CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_DELIVERY_NOTE", 500);
    }
};



const deleteDeliveryNoteCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        
        const hardDelete = req.query.hard === 'true';

        if (!hardDelete) {
            return handleHttpError(res, "SOFT_DELETE_NOT_SUPPORTED_USE_HARD_DELETE", 400);
        }

        const note = await deliveryNotesModel.findOneWithDeleted({ _id: id, userId: userId });

        if (!note) {
            return handleHttpError(res, "DELIVERY_NOTE_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        if (note.isSigned) {
             return handleHttpError(res, "DELIVERY_NOTE_SIGNED_CANNOT_BE_DELETED", 403); // 403 Forbidden
        }

        await deliveryNotesModel.deleteOne({ _id: id });
        res.status(200).json({ status: "OK", message: "DELIVERY_NOTE_PERMANENTLY_DELETED" });


    } catch (err) {
        console.error("DELETE DELIVERY NOTE CTRL ERROR:", err);
        handleHttpError(res, "ERROR_DELETING_DELIVERY_NOTE", 500);
    }
};


const downloadPdfCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });

        const note = await deliveryNotesModel.findOne({ _id: id, userId })
            .populate('userId', 'nombre apellidos email company')
            .populate('clientId', 'name cif address')
            .populate('projectId', 'name projectCode code');

        if (!note) {
            return handleHttpError(res, "DELIVERY_NOTE_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        const pdfDir = path.join(__dirname, '..', 'generated_pdfs');

        const pdfFileName = `delivery_note_${note._id}.pdf`;
        const pdfFilePath = path.join(pdfDir, pdfFileName);

        if (!fs.existsSync(pdfDir)){
            fs.mkdirSync(pdfDir, { recursive: true }); 
            console.log(`Created directory: ${pdfDir}`);
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        const writeStream = fs.createWriteStream(pdfFilePath);
        doc.pipe(writeStream);


        doc.fontSize(20).text(`Delivery Note / Albarán #${note._id}`, { align: 'center' }).moveDown();

        
        doc.fontSize(12).text('From / Emisor:', { underline: true });
        doc.text(`User: ${note.userId?.nombre || ''} ${note.userId?.apellidos || ''} (${note.userId?.email || ''})`);
        if (note.userId?.company) doc.text(`Company: ${note.userId.company.nombre || ''} (CIF: ${note.userId.company.cif || ''})`);

        doc.moveDown();
        
        
        doc.text('To / Cliente:', { underline: true });
        doc.text(`Client: ${note.clientId?.name || 'N/A'} (CIF: ${note.clientId?.cif || 'N/A'})`);
        if (note.clientId?.address) {
            const addr = note.clientId.address;
            doc.text(`Address: ${addr.street || ''} ${addr.number || ''}, ${addr.postal || ''} ${addr.city || ''}, ${addr.province || ''}`);
        }
        doc.moveDown();
        
        

        doc.text('Project / Proyecto:', { underline: true });
        doc.text(`Name: ${note.projectId?.name || 'N/A'}`);
        doc.text(`Code: ${note.projectId?.projectCode || note.projectId?.code || 'N/A'}`);
        doc.moveDown();
        


        doc.text('Details / Detalles:', { underline: true });
        doc.text(`Date / Fecha: ${note.workdate.toLocaleDateString()}`);
        doc.text(`Format: ${note.format}`);
        
        doc.text(`Observations: ${note.observations || ''}`);
        doc.moveDown();

        
        doc.text('Signature / Firma:', { underline: true });
        if (note.isSigned && note.sign) {
            try {
                console.log(`Fetching signature image from: ${note.sign}`);
                const response = await fetch(note.sign);
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                const imageBuffer = await response.buffer();
                // Embed the image - Adjust width/height/position as needed
                doc.image(imageBuffer, { fit: [150, 75], align: 'left' }); // Example size/alignment
                doc.moveDown(4); // Add space after image
            } catch (imgError) {
                console.error("Failed to fetch/embed signature image:", imgError);
                doc.text('(Signature image could not be loaded)'); // Fallback text
            }

        } else {
            doc.text('_________________________');
            doc.text(`Received By / Recibido por: ${note.observerName || ''} (NIF: ${note.observerNif || ''})`);
        }

        
        doc.end();

         writeStream.on('finish', () => {
            console.log(`PDF saved successfully to: ${pdfFilePath}`);
            res.status(200).json({
                message: "PDF_GENERATED_AND_SAVED_SUCCESSFULLY",
                filePath: pdfFilePath
            });
        });

        
        writeStream.on('error', (fileErr) => {
            console.error("ERROR WRITING PDF TO FILE:", fileErr);
            handleHttpError(res, "ERROR_SAVING_PDF_TO_FILE", 500);
        });

    } catch (err) {
        console.error("DOWNLOAD PDF CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GENERATING_PDF", 500);
    }
};



const signDeliveryNoteCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });

        if (!req.file) {
            return handleHttpError(res, "SIGNATURE_IMAGE_FILE_REQUIRED", 400);
        }
        const note = await deliveryNotesModel.findOne({ _id: id, userId: userId, isSigned: false });

        if (!note) {
            return handleHttpError(res, "DELIVERY_NOTE_NOT_FOUND_OR_ALREADY_SIGNED", 404);
        }

        let signatureIpfsUrl = null;
        try {
            const signatureBuffer = req.file.buffer; 
            const fileName = `signature_${id}_${Date.now()}_${req.file.originalname}`; // Create unique filename

            console.log(`Uploading signature file [${req.file.originalname}] for ${id} to IPFS...`);
            const ipfsResponse = await uploadToPinata(signatureBuffer, fileName);

            if (!ipfsResponse || !ipfsResponse.IpfsHash) {
                 throw new Error("IPFS upload failed or did not return hash.");
            }

            signatureIpfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResponse.IpfsHash}`; // Adjust gateway if needed
            console.log(`Signature uploaded to IPFS: ${signatureIpfsUrl}`);

        } catch (uploadError) {
            console.error("SIGNATURE IPFS UPLOAD ERROR:", uploadError);
            return handleHttpError(res, "ERROR_UPLOADING_SIGNATURE", 500);
        }

        note.sign = signatureIpfsUrl;
        note.isSigned = true;
        await note.save();

        res.status(200).json({
             message: "DELIVERY_NOTE_SIGNED_SUCCESSFULLY",
             signUrl: note.sign // Return the IPFS URL
        });

    } catch (err) {
        console.error("SIGN DELIVERY NOTE CTRL ERROR:", err);
        handleHttpError(res, "ERROR_SIGNING_DELIVERY_NOTE", 500);
    }
};



module.exports = { createDeliveryNoteCtrl, getDeliveryNotesCtrl, getDeliveryNoteByIdCtrl, deleteDeliveryNoteCtrl, downloadPdfCtrl, signDeliveryNoteCtrl};