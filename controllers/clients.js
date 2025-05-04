const { matchedData } = require("express-validator");
const { clientsModel } = require("../models");
const { handleHttpError } = require("../utils/handleError");


const createClientCtrl = async (req, res) => {
    try {

        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }

        const userId = req.user._id;
        const validatedData = matchedData(req);

    
        const existingClient = await clientsModel.findOne({
            userId: userId,
            cif: validatedData.cif
        });

        if (existingClient) {
            return handleHttpError(res, "CLIENT_CIF_ALREADY_EXISTS_FOR_USER", 409);
        }

        const newClientData = {
            ...validatedData,
            userId: userId
        };

        const createdClient = await clientsModel.create(newClientData);

        res.status(201).json(createdClient); 

    } catch (err) {
        console.error("CREATE CLIENT CTRL ERROR:", err);
        
        if (err.code === 11000 && err.keyPattern && err.keyPattern['userId'] && err.keyPattern['cif']) {
             handleHttpError(res, "CLIENT_CIF_ALREADY_EXISTS_FOR_USER", 409);
        } else {
             handleHttpError(res, "ERROR_CREATING_CLIENT", 500);
        }
    }
};



const getClientsCtrl = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }
        const userId = req.user._id;

        const clients = await clientsModel.find({ userId: userId });

        res.status(200).json(clients);

    } catch (err) {
        console.error("GET CLIENTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_CLIENTS", 500);
    }
};


const getClientByIdCtrl = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }
        const userId = req.user._id;
        
        const { id } = matchedData(req, { locations: ['params'] }); 

        const client = await clientsModel.findOne({ _id: id, userId: userId });

        if (!client) {
            return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        res.status(200).json(client);

    } catch (err) {
        console.error("GET CLIENT BY ID CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_CLIENT_BY_ID", 500);
    }
};



const updateClientCtrl = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const updateData = matchedData(req);

        
        if (updateData.cif) {
            const conflictingClient = await clientsModel.findOne({
                _id: { $ne: id }, 
                userId: userId,
                cif: updateData.cif
            });
            if (conflictingClient) {
                return handleHttpError(res, "CLIENT_CIF_ALREADY_EXISTS_FOR_USER", 409);
            }
        }

        
        const updatedClient = await clientsModel.findOneAndUpdate(
            { _id: id, userId: userId }, 
            { $set: updateData }, 
            { new: true, runValidators: true } 
        );


        if (!updatedClient) {
            return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        res.status(200).json(updatedClient);

    } catch (err) {
        console.error("UPDATE CLIENT CTRL ERROR:", err);
        
        if (err.code === 11000 && err.keyPattern && err.keyPattern['userId'] && err.keyPattern['cif']) {
             handleHttpError(res, "CLIENT_CIF_ALREADY_EXISTS_FOR_USER", 409);
        } else if (err.name === 'ValidationError') {
             handleHttpError(res, err.message, 422);
        }
        else {
             handleHttpError(res, "ERROR_UPDATING_CLIENT", 500);
        }
    }
};



const deleteClientCtrl = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] }); 
        const hardDelete = req.query.hard === 'true'; 

        const client = await (hardDelete
             ? clientsModel.findOneWithDeleted({ _id: id, userId: userId })
             : clientsModel.findOne({ _id: id, userId: userId }) );

        if (!client) {
            return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        if (hardDelete) {
            await clientsModel.deleteOne({ _id: id });
            res.status(200).json({ message: "CLIENT_PERMANENTLY_DELETED" });
        } else {
            await client.delete(); 
            res.status(200).json({ message: "CLIENT_ARCHIVED_SOFT_DELETE" });
        }

    } catch (err) {
        console.error("DELETE CLIENT CTRL ERROR:", err);
        handleHttpError(res, "ERROR_DELETING_CLIENT", 500);
    }
};


const getArchivedClientsCtrl = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }
        const userId = req.user._id;

        const archivedClients = await clientsModel.findDeleted({ userId: userId });

        res.status(200).json(archivedClients);

    } catch (err) {
        console.error("GET ARCHIVED CLIENTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_ARCHIVED_CLIENTS", 500);
    }
};



const restoreClientCtrl = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return handleHttpError(res, "USER_NOT_AUTHENTICATED", 401);
        }
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] }); 

        
        const clientToRestore = await clientsModel.findOneDeleted({ _id: id, userId: userId });

        if (!clientToRestore) {
            return handleHttpError(res, "ARCHIVED_CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        }

        
        await clientToRestore.restore();

        
        const restoredClient = await clientsModel.findById(id); 

        res.status(200).json({ message: "CLIENT_RESTORED_SUCCESSFULLY", client: restoredClient });

    } catch (err) {
        console.error("RESTORE CLIENT CTRL ERROR:", err);
        handleHttpError(res, "ERROR_RESTORING_CLIENT", 500);
    }
};


module.exports = {createClientCtrl, getClientsCtrl, getClientByIdCtrl, updateClientCtrl, deleteClientCtrl, getArchivedClientsCtrl, restoreClientCtrl};