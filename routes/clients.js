
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');


const {validatorCreateClient, validatorUpdateClient, validatorClientId} = require('../validators/clients');


const {createClientCtrl, getClientsCtrl, getClientByIdCtrl, updateClientCtrl, deleteClientCtrl, getArchivedClientsCtrl, restoreClientCtrl} = require('../controllers/clients'); // Adjust path


router.use(authMiddleware);

/**
 * @openapi
 * /client/archived:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Obtener clientes archivados
 *     description: Devuelve una lista de todos los clientes que han sido archivados (soft deleted) por el usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de clientes archivados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Client' # Devuelve objetos Client completos (incluyendo deleted:true, deletedAt)
 *       '401':
 *         description: Usuario no autenticado.
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/archived", getArchivedClientsCtrl);

/**
 * @openapi
 * /client:
 *   post:
 *     tags:
 *       - Clients
 *     summary: Crear un nuevo cliente
 *     description: Añade un nuevo cliente asociado al usuario autenticado. Verifica que el CIF no esté duplicado para este usuario.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput' # Schema para la entrada
 *     responses:
 *       '201':
 *         description: Cliente creado exitosamente. Devuelve el objeto del cliente creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client' # Devuelve el objeto Client completo
 *       '401':
 *         description: Usuario no autenticado.
 *       '409':
 *         description: Conflicto, el CIF del cliente ya existe para este usuario.
 *       '422':
 *          description: Error de validación, el cuerpo de la solicitud no es válido.
 *       '500':
 *          description: Error interno del servidor.
 */

router.post("/", validatorCreateClient, createClientCtrl);

/**
 * @openapi
 * /client:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Obtener todos los clientes activos
 *     description: Devuelve una lista de todos los clientes activos (no archivados) asociados al usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de clientes activos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Client'
 *       '401':
 *          description: Usuario no autenticado.
 *       '500':
 *          description: Error interno del servidor.
 */

router.get("/", getClientsCtrl);

/**
 * @openapi
 * /client/{id}:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Obtener un cliente específico por ID
 *     description: Devuelve los detalles de un cliente específico si pertenece al usuario autenticado y no está archivado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente a obtener.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Detalles del cliente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       '401':
 *         description: Usuario no autenticado.
 *       '404':
 *         description: Cliente no encontrado o no pertenece al usuario.
 *       '422':
 *         description: Error de validación (formato de ID incorrecto).
 *       '500':
 *         description: Error interno del servidor.
 */

router.get("/:id", validatorClientId, getClientByIdCtrl);

/**
 * @openapi
 * /client/{id}:
 *   put:
 *     tags:
 *       - Clients
 *     summary: Actualizar un cliente existente
 *     description: Actualiza los datos de un cliente específico (nombre, CIF, dirección, etc.) si pertenece al usuario autenticado. Verifica unicidad del CIF si se modifica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente a actualizar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput' # Los campos son opcionales aquí, pero el schema base sirve
 *     responses:
 *       '200':
 *         description: Cliente actualizado correctamente. Devuelve el objeto cliente actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       '401':
 *          description: Usuario no autenticado.
 *       '404':
 *         description: Cliente no encontrado o no pertenece al usuario.
 *        
 *       '409':
 *         description: Conflicto, el nuevo CIF ya existe para otro cliente de este usuario.
 *         
 *       '422':
 *         description: Error de validación en los datos de entrada o ID.
 *         
 *       '500':
 *         description: Error interno del servidor.
 */

router.put("/:id", validatorClientId, validatorUpdateClient, updateClientCtrl);

/**
 * @openapi
 * /client/{id}:
 *   delete:
 *     tags:
 *       - Clients
 *     summary: Eliminar (Archivar o Borrar) un cliente
 *     description: Archiva (soft delete) un cliente por defecto. Si se añade el parámetro de query '?hard=true', realiza un borrado físico (hard delete). Solo afecta a clientes del usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente a eliminar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *       - $ref: '#/components/parameters/HardDeleteQueryParam' # Parámetro opcional hard=true
 *     responses:
 *       '200':
 *         description: Cliente archivado o eliminado permanentemente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "CLIENT_ARCHIVED_SOFT_DELETE" # o CLIENT_PERMANENTLY_DELETED
 *       '401':
 *         description: Usuario no autenticado.
 *       '404':
 *         description: Cliente no encontrado o no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación (formato de ID incorrecto).
 *        
 *       '500':
 *         description: Error interno del servidor.
 */

router.delete("/:id", validatorClientId, deleteClientCtrl);

/**
 * @openapi
 * /client/{id}/restore:
 *   patch:
 *     tags:
 *       - Clients
 *     summary: Restaurar un cliente archivado
 *     description: Recupera un cliente previamente archivado (soft deleted) si pertenece al usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del cliente archivado a restaurar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Cliente restaurado correctamente. Devuelve mensaje y el cliente restaurado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "CLIENT_RESTORED_SUCCESSFULLY"
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       '401':
 *         description: Usuario no autenticado.
 *       '404':
 *         description: Cliente archivado no encontrado o no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación (formato de ID incorrecto).
 *         
 *       '500':
 *         description: Error interno del servidor.
 */

router.patch("/:id/restore", validatorClientId, restoreClientCtrl);


module.exports = router;
