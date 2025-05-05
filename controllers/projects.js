// controllers/projects.js
const { matchedData } = require("express-validator");
const { projectsModel, clientsModel } = require("../models"); 
const { handleHttpError } = require("../utils/handleError");
const mongoose = require('mongoose'); 

/** Helper para verificar si el usuario es dueño del cliente */
const checkClientOwnership = async (userId, clientId) => {
    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) return false; 
    const client = await clientsModel.findOne({ _id: clientId, userId: userId });
    return !!client;
};


const createProjectCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const validatedData = matchedData(req, { includeOptionals: false });

        const clientOwned = await checkClientOwnership(userId, validatedData.clientId);
        if (!clientOwned) {
            return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        }

        if (validatedData.projectCode) {
            const existingProject = await projectsModel.findOne({
                userId,
                clientId: validatedData.clientId,
                projectCode: validatedData.projectCode
            });
            if (existingProject) {
                return handleHttpError(res, "PROJECT_CODE_ALREADY_EXISTS_FOR_CLIENT", 409);
            }
        }

        const projectData = { ...validatedData, userId };
        const createdProject = await projectsModel.create(projectData);
        

        res.status(201).json(createdProject);

    } catch (err) {
        console.error("CREATE PROJECT CTRL ERROR:", err);
        if (err.code === 11000) {
             handleHttpError(res, "PROJECT_IDENTIFIER_ALREADY_EXISTS_FOR_CLIENT", 409);
        } else {
             handleHttpError(res, "ERROR_CREATING_PROJECT", 500);
        }
    }
};


const getProjectsCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const projects = await projectsModel.find({ userId });
        res.status(200).json(projects);

    } catch (err) {
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500);
    }
};


const getProjectsByClientCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { client: clientId } = matchedData(req, { locations: ['params'] });
        
        const clientOwned = await checkClientOwnership(userId, clientId);
        if (!clientOwned) return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);

        const query = { userId, clientId };

        const projects = await projectsModel.find(query);
        res.status(200).json(projects);

    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500);
    }
};



const getProjectByIdSimpleCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        
        const project = await projectsModel.findOne({ _id: id, userId });
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);

        res.status(200).json(project);

    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500);
    }
};

/** Obtener Proyecto Único por Cliente y ID: GET /{client}/{id} */
const getProjectByClientAndIdCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { client: clientId, id: projectId } = matchedData(req, { locations: ['params'] });

        const project = await projectsModel.findOne({ _id: projectId, userId, clientId });

        if (!project) {
            const clientOwned = await checkClientOwnership(userId, clientId);
            return handleHttpError(res, clientOwned ? "PROJECT_NOT_FOUND_FOR_CLIENT" : "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", clientOwned ? 404 : 403);
        }

        res.status(200).json(project);

    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500); 
    }
};


const updateProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const updateData = matchedData(req, { includeOptionals: false }); // No incluir opcionales vacíos

        if (updateData.clientId) {
             const clientOwned = await checkClientOwnership(userId, updateData.clientId);
             if (!clientOwned) return handleHttpError(res, "NEW_CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        }

        if (updateData.projectCode || updateData.clientId) {
            const currentProject = await projectsModel.findById(id).select('userId clientId projectCode'); // Optimizar selección
            if(!currentProject || currentProject.userId.toString() !== userId) {
                return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
            }

            const checkClientId = updateData.clientId || currentProject.clientId;
            const checkProjectCode = updateData.projectCode === null ? null : (updateData.projectCode || currentProject.projectCode); // Manejar explícitamente null si se permite

            if(checkProjectCode) {
                const conflictingProject = await projectsModel.findOne({
                    _id: { $ne: id }, userId, clientId: checkClientId, projectCode: checkProjectCode
                });
                if (conflictingProject) return handleHttpError(res, "PROJECT_CODE_ALREADY_EXISTS_FOR_CLIENT", 409);
            }
        }

        const updatedProject = await projectsModel.findOneAndUpdate(
            { _id: id, userId }, { $set: updateData }, { new: true, runValidators: true }
        );


        if (!updatedProject) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED_TO_UPDATE", 404);

        
        res.status(200).json(updatedProject);

    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500);
    }
};


const deleteProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const hardDelete = req.query.hard === 'true';

        const project = await (hardDelete
             ? projectsModel.findOneWithDeleted({ _id: id, userId })
             : projectsModel.findOne({ _id: id, userId }) );
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);

    
        if (hardDelete) {
            await projectsModel.deleteOne({ _id: id });
            res.status(200).json({ status: "OK", message: "PROJECT_PERMANENTLY_DELETED" }); // Devolver Status OK
        } else {
            await project.delete();
            res.status(200).json({ status: "OK", message: "PROJECT_ARCHIVED_SOFT_DELETE" }); // Devolver Status OK
        }

    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500); 
    }
};

/** Archivar Proyecto (Duplicado?): DELETE /archive/{id} */
const archiveProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const project = await projectsModel.findOne({ _id: id, userId });
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        await project.delete();
        res.status(200).json({ status: "OK", message: "PROJECT_ARCHIVED" }); // Devolver Status OK
    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500); 
    }
};

const getArchivedProjectsCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const archivedProjects = await projectsModel.findDeleted({ userId });
        res.status(200).json(archivedProjects); 
    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500);
    }
};

const getArchivedProjectsByClientCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { client: clientId } = matchedData(req, { locations: ['params'] });
        const clientOwned = await checkClientOwnership(userId, clientId);
        if (!clientOwned) return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        const archivedProjects = await projectsModel.findDeleted({ userId, clientId });
        res.status(200).json(archivedProjects); 
    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500); 
    }
};


const restoreProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const projectToRestore = await projectsModel.findOneDeleted({ _id: id, userId });
        if (!projectToRestore) return handleHttpError(res, "ARCHIVED_PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        await projectToRestore.restore();
        res.status(200).json({message: "PROJECT_RESTORED_SUCCESSFULLY", project: projectToRestore }); // Devolver ACK
    } catch (err) { 
        console.error("GET PROJECTS CTRL ERROR:", err);
        handleHttpError(res, "ERROR_GETTING_PROJECTS", 500); 
    }
};


module.exports = {createProjectCtrl, getProjectsCtrl, getProjectsByClientCtrl, getProjectByIdSimpleCtrl, getProjectByClientAndIdCtrl, updateProjectCtrl, deleteProjectCtrl, archiveProjectCtrl, getArchivedProjectsCtrl, getArchivedProjectsByClientCtrl, restoreProjectCtrl};