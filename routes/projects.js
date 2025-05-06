// routes/projects.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware'); // Ajustar path

const {mongoIdValidator, validatorCreateProject, validatorUpdateProject, validatorGetProjectsQuery, validatorGetProjectsByClient, validatorGetProjectByIdQuery, validatorGetProjectByClientAndId} = require('../validators/projects'); 
const {createProjectCtrl, getProjectsCtrl, getProjectsByClientCtrl, getProjectByIdSimpleCtrl, getProjectByClientAndIdCtrl, updateProjectCtrl, deleteProjectCtrl, archiveProjectCtrl, getArchivedProjectsCtrl, getArchivedProjectsByClientCtrl, restoreProjectCtrl} = require('../controllers/projects');

router.use(authMiddleware);

/**
 * @openapi
 * /project/archive:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener todos los proyectos archivados del usuario
 *     description: Devuelve una lista de proyectos que han sido archivados (soft deleted) por el usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de proyectos archivados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/archive", getArchivedProjectsCtrl); // GET /api/project/archive


/**
 * @openapi
 * /project/archive/{client}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener proyectos archivados de un cliente específico
 *     description: Devuelve una lista de proyectos archivados (soft deleted) para un cliente específico del usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: client
 *         in: path
 *         required: true
 *         description: ID del cliente cuyos proyectos archivados se desean obtener.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Lista de proyectos archivados del cliente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '403':
 *         description: El cliente especificado no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación (formato de ID de cliente incorrecto).
 *         
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/archive/:client", mongoIdValidator('client'), getArchivedProjectsByClientCtrl); // GET /api/project/archive/:client

/**
 * @openapi
 * /project/archive/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Archivar un proyecto (Soft Delete)
 *     description: Marca un proyecto como archivado (soft delete). Este endpoint es específico para soft delete. Para borrado permanente usar DELETE /project/{id}?hard=true.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto a archivar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Proyecto archivado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse' # Devuelve { status: 'OK', message: '...' }
 *       '401':
 *         description: No autorizado.
 *       '404':
 *         description: Proyecto no encontrado.
 *       '422':
 *         description: Error de validación (formato de ID de proyecto incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */

router.delete("/archive/:id", mongoIdValidator('id'), archiveProjectCtrl); // DELETE /api/project/archive/:id (Soft Delete)

/**
 * @openapi
 * /project/restore/{id}:
 *   patch:
 *     tags:
 *       - Projects 
 *     summary: Restaurar un proyecto archivado
 *     description: Recupera un proyecto previamente archivado (soft deleted) si pertenece al usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto archivado a restaurar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Proyecto restaurado correctamente. Devuelve mensaje y el proyecto restaurado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "PROJECT_RESTORED_SUCCESSFULLY"
 *                 project:
 *                   $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '404':
 *         description: Proyecto archivado no encontrado o no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación (formato de ID de proyecto incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */

router.patch("/restore/:id", mongoIdValidator('id'), restoreProjectCtrl); // PATCH /api/project/restore/:id


/**
 * @openapi
 * /project/one/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener un proyecto específico por ID (versión /one)
 *     description: Devuelve los detalles de un proyecto específico si pertenece al usuario autenticado y está activo. Acepta query param 'prices'.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto a obtener.
 *         schema:
 *           type: string
 *           format: ObjectId
 *       - name: prices
 *         in: query
 *         required: false
 *         description: Filtrar precios (material, hours, all). No implementado en el controlador simplificado actual.
 *         schema:
 *           type: string
 *           enum: [material, hours, all]
 *     responses:
 *       '200':
 *         description: Detalles del proyecto.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '404':
 *         description: Proyecto no encontrado o no pertenece al usuario.
 *       '422':
 *         description: Error de validación (formato de ID de proyecto incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */


router.get("/one/:id", validatorGetProjectByIdQuery, getProjectByIdSimpleCtrl); // GET /api/project/one/:id (Validador incluye query)


/**
 * @openapi
 * /project:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Crear un nuevo proyecto
 *     description: Añade un nuevo proyecto asociado al usuario y cliente. Verifica unicidad de projectCode si se provee.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       '201':
 *         description: Proyecto creado. Devuelve el objeto proyecto completo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '403':
 *         description: El cliente especificado no pertenece al usuario.
 *       '409':
 *         description: Conflicto (projectCode ya existe).
 *       '422':
 *         description: Error de validación (formato de ID de cliente incorrecto o datos inválidos).
 *       '500':
 *         description: Error interno del servidor.
 */

router.post("/", validatorCreateProject, createProjectCtrl); // POST /api/project


/**
 * @openapi
 * /project:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener todos los proyectos activos del usuario
 *     description: Devuelve una lista de proyectos activos del usuario autenticado. Acepta query param 'sort'.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sort
 *         in: query
 *         required: false
 *         description: Ordenar resultados (asc/desc por fecha de creación).
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       '200':
 *         description: Lista de proyectos activos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '422':
 *         description: Error de validación (formato de ID de cliente incorrecto o datos inválidos).
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/", validatorGetProjectsQuery, getProjectsCtrl);  // GET /api/project (Validador incluye query)


/**
 * @openapi
 * /project/{client}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener proyectos activos de un cliente específico
 *     description: Devuelve los proyectos activos para un cliente específico del usuario autenticado. Acepta query param 'sort'.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: client
 *         in: path
 *         required: true
 *         description: ID del cliente.
 *         schema:
 *           type: string
 *           format: ObjectId
 *       - name: sort
 *         in: query
 *         required: false
 *         description: Ordenar resultados (asc/desc por fecha de creación).
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       '200':
 *         description: Lista de proyectos activos del cliente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '403':
 *         description: El cliente especificado no pertenece al usuario.
 *       '422':
 *         description: Error de validación (formato de ID de cliente incorrecto o datos inválidos).
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/:client", validatorGetProjectsByClient, getProjectsByClientCtrl); // GET /api/project/:client (Validador incluye query y path)



/**
 * @openapi
 * /project/{client}/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener un proyecto específico por cliente y ID de proyecto
 *     description: Devuelve los detalles de un proyecto específico si pertenece al cliente y usuario autenticados.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: client
 *         in: path
 *         required: true
 *         description: ID del cliente.
 *         schema:
 *           type: string
 *           format: ObjectId
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Detalles del proyecto.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '403':
 *         description: El cliente especificado no pertenece al usuario.
 *       '404':
 *         description: Proyecto no encontrado para ese cliente o el cliente no pertenece al usuario.
    *      
 *       '422':
 *         description: Error de validación (formato de ID de cliente o proyecto incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/:client/:id", validatorGetProjectByClientAndId, getProjectByClientAndIdCtrl); // GET /api/project/:client/:id (Validador incluye path)


/**
 * @openapi
 * /project/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener un proyecto específico por ID (versión base)
 *     description: Devuelve los detalles de un proyecto específico si pertenece al usuario autenticado y está activo. (Funcionalmente igual a /one/{id}).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto a obtener.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Detalles del proyecto.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '404':
 *         description: Proyecto no encontrado o no pertenece al usuario.
 *       '422':
 *         description: Error de validación (formato de ID de proyecto incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/:id", mongoIdValidator('id'), getProjectByIdSimpleCtrl); // GET /api/project/:id


/**
 * @openapi
 * /project/{id}:
 *   put:
 *     tags:
 *       - Projects
 *     summary: Actualizar un proyecto existente
 *     description: Actualiza datos de un proyecto específico. Verifica unicidad de projectCode si se cambia.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto a actualizar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput' # Campos opcionales en la actualización
 *     responses:
 *       '200':
 *         description: Proyecto actualizado. Devuelve el objeto actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado.
 *       '403':
 *         description: El cliente especificado no pertenece al usuario.
 *       '404':
 *         description: Proyecto no encontrado o no pertenece al usuario.
 *       '409':
 *         description: Conflicto (projectCode ya existe).
 *       '422':
 *         description: Error de validación (formato de ID de proyecto incorrecto o datos inválidos).
 *       '500':
 *         description: Error interno del servidor.
 */

router.put("/:id", mongoIdValidator('id'), validatorUpdateProject, updateProjectCtrl); // PUT /api/project/:id


/**
 * @openapi
 * /project/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Eliminar (Archivar o Borrar) un proyecto
 *     description: Archiva (soft delete) por defecto. Con '?hard=true' realiza borrado físico (hard delete).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del proyecto a eliminar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *       - $ref: '#/components/parameters/HardDeleteQueryParam' # Parámetro opcional hard=true
 *     responses:
 *       '200':
 *         description: Proyecto archivado o eliminado permanentemente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse' # Devuelve { status: 'OK', message: '...' }
 *       '401':
 *         description: No autorizado.
 *       '404':
 *         description: Proyecto no encontrado o no pertenece al usuario.
 *       '422':
 *         description: Error de validación (formato de ID de proyecto incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */

router.delete("/:id", mongoIdValidator('id'), deleteProjectCtrl); // DELETE /api/project/:id (Soft/Hard)


module.exports = router;