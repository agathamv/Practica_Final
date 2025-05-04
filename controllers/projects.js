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
        // Usar { includeOptionals: false } para no incluir campos opcionales vacíos (como address)
        // a menos que realmente se envíen en el body. Ajustar si se prefiere incluir objetos vacíos.
        const validatedData = matchedData(req, { includeOptionals: false });

        const clientOwned = await checkClientOwnership(userId, validatedData.clientId);
        if (!clientOwned) {
            return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        }

        // Verificar unicidad basado en el índice (userId, clientId, projectCode)
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
        // Devolver solo los campos especificados en el ejemplo de respuesta POST
        const response = {
            _id: createdProject._id,
            userId: createdProject.userId,
            clientId: createdProject.clientId,
            name: createdProject.name,
            code: createdProject.code, // Incluir si existe
            // projectCode: createdProject.projectCode, // Incluir si existe
            createdAt: createdProject.createdAt,
            updatedAt: createdProject.updatedAt
        };
        res.status(201).json(response);

    } catch (err) { /* ... manejo de errores como antes ... */ }
};

/** Obtener Todos los Proyectos del Usuario: GET / */
const getProjectsCtrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const { sort } = matchedData(req, { locations: ['query'], includeOptionals: true });

        const query = { userId };
        const sortOption = {};
        if (sort) sortOption.createdAt = sort === 'asc' ? 1 : -1;

        const projects = await projectsModel.find(query).sort(sortOption);
        res.status(200).json(projects); // Devuelve la lista completa

    } catch (err) { /* ... manejo de errores ... */ }
};

/** Obtener Proyectos por Cliente: GET /{client} */
const getProjectsByClientCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { client: clientId } = matchedData(req, { locations: ['params'] });
        const { sort } = matchedData(req, { locations: ['query'], includeOptionals: true });

        const clientOwned = await checkClientOwnership(userId, clientId);
        if (!clientOwned) return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);

        const query = { userId, clientId };
        const sortOption = {};
        if (sort) sortOption.createdAt = sort === 'asc' ? 1 : -1;

        const projects = await projectsModel.find(query).sort(sortOption);
        res.status(200).json(projects);

    } catch (err) { /* ... manejo de errores ... */ }
};

/** Obtener Proyecto Único (Simple): GET /one/{id} */
const getProjectByIdSimpleCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const { prices } = matchedData(req, { locations: ['query'], includeOptionals: true });

        const project = await projectsModel.findOne({ _id: id, userId });
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);

        let responseProject = project.toJSON(); // Usar toJSON para limpieza si está definido
        if (prices && prices !== 'all') {
             responseProject.unitPrices = project.unitPrices.filter(p => p.format === prices);
        }

        res.status(200).json(responseProject);

    } catch (err) { /* ... manejo de errores ... */ }
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

    } catch (err) { /* ... manejo de errores ... */ }
};

/** Actualizar Proyecto: PUT /{id} */
const updateProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const updateData = matchedData(req, { includeOptionals: false }); // No incluir opcionales vacíos

        if (updateData.clientId) {
             const clientOwned = await checkClientOwnership(userId, updateData.clientId);
             if (!clientOwned) return handleHttpError(res, "NEW_CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        }

        // Verificar unicidad si cambian campos relevantes
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

         // Devolver solo los campos especificados en el ejemplo de respuesta PUT
         const response = {
            _id: updatedProject._id,
            userId: updatedProject.userId,
            clientId: updatedProject.clientId,
            name: updatedProject.name,
            code: updatedProject.code,
            // projectCode: updatedProject.projectCode,
            createdAt: updatedProject.createdAt,
            updatedAt: updatedProject.updatedAt
        };
        res.status(200).json(response);

    } catch (err) { /* ... manejo de errores como antes ... */ }
};

/** Eliminar Proyecto: DELETE /{id} */
const deleteProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const hardDelete = req.query.hard === 'true';

        const project = await (hardDelete
             ? projectsModel.findOneWithDeleted({ _id: id, userId })
             : projectsModel.findOne({ _id: id, userId }) );
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);

        // Lógica de bloqueo (ej. nota firmada) iría aquí
        // if (project.isLocked) return handleHttpError(res, "...", 403);

        if (hardDelete) {
            await projectsModel.deleteOne({ _id: id });
            res.status(200).json({ status: "OK", message: "PROJECT_PERMANENTLY_DELETED" }); // Devolver Status OK
        } else {
            await project.delete();
            res.status(200).json({ status: "OK", message: "PROJECT_ARCHIVED_SOFT_DELETE" }); // Devolver Status OK
        }

    } catch (err) { /* ... manejo de errores ... */ }
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
    } catch (err) { /* ... manejo de errores ... */ }
};

/** Obtener Proyectos Archivados (Usuario): GET /archive */
const getArchivedProjectsCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const archivedProjects = await projectsModel.findDeleted({ userId });
        res.status(200).json(archivedProjects); // Devolver lista
    } catch (err) { /* ... manejo de errores ... */ }
};

/** Obtener Proyectos Archivados (Cliente): GET /archive/{client} */
const getArchivedProjectsByClientCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { client: clientId } = matchedData(req, { locations: ['params'] });
        const clientOwned = await checkClientOwnership(userId, clientId);
        if (!clientOwned) return handleHttpError(res, "CLIENT_NOT_FOUND_OR_NOT_AUTHORIZED", 403);
        const archivedProjects = await projectsModel.findDeleted({ userId, clientId });
        res.status(200).json(archivedProjects); // Devolver lista
    } catch (err) { /* ... manejo de errores ... */ }
};

/** Restaurar Proyecto Archivado: PATCH /restore/{id} */
const restoreProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const projectToRestore = await projectsModel.findOneDeleted({ _id: id, userId });
        if (!projectToRestore) return handleHttpError(res, "ARCHIVED_PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        await projectToRestore.restore();
        res.status(200).json({ acknowledged: true }); // Devolver ACK
    } catch (err) { /* ... manejo de errores ... */ }
};

/** Activar/Desactivar Proyecto: PATCH /activate/{id} */
const activateProjectCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const { active } = matchedData(req); // Obtener boolean 'active'
        const project = await projectsModel.findOneAndUpdate(
            { _id: id, userId },
            { $set: { isActive: active } },
            { new: true, runValidators: true }
        );
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        res.status(200).json({ acknowledged: true }); // Devolver ACK
    } catch (err) { /* ... manejo de errores (validación) ... */ }
};

/** Actualizar Precios Proyecto: PATCH /prices/{id} */
const updatePricesCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const { prices } = matchedData(req); // Array validado de precios
        const project = await projectsModel.findOneAndUpdate(
            { _id: id, userId },
            { $set: { unitPrices: prices } },
            { new: true, runValidators: true }
        );
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        res.status(200).json({ acknowledged: true }); // Devolver ACK
    } catch (err) { /* ... manejo de errores (validación) ... */ }
};

/** Actualizar Monto Proyecto: PATCH /amount/{id} */
const updateAmountCtrl = async (req, res) => {
     try {
        const userId = req.user._id;
        const { id } = matchedData(req, { locations: ['params'] });
        const { amount } = matchedData(req); // Monto validado
        const project = await projectsModel.findOneAndUpdate(
            { _id: id, userId },
            { $set: { amount: amount } },
            { new: true, runValidators: true }
        );
        if (!project) return handleHttpError(res, "PROJECT_NOT_FOUND_OR_NOT_AUTHORIZED", 404);
        res.status(200).json({ acknowledged: true }); // Devolver ACK
    } catch (err) { /* ... manejo de errores (validación) ... */ }
};


module.exports = {createProjectCtrl, getProjectsCtrl, getProjectsByClientCtrl, getProjectByIdSimpleCtrl, getProjectByClientAndIdCtrl, updateProjectCtrl, deleteProjectCtrl, archiveProjectCtrl, getArchivedProjectsCtrl, getArchivedProjectsByClientCtrl, restoreProjectCtrl, activateProjectCtrl, updatePricesCtrl, updateAmountCtrl};