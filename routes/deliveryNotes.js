const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadMiddlewareMemory } = require('../utils/handleStorage');

const {mongoIdValidator, validatorCreateDeliveryNote} = require('../validators/deliveryNotes');


const {createDeliveryNoteCtrl, getDeliveryNotesCtrl, getDeliveryNoteByIdCtrl, deleteDeliveryNoteCtrl, downloadPdfCtrl, signDeliveryNoteCtrl} = require('../controllers/deliveryNotes'); // Adjust path


router.use(authMiddleware);


/**
 * @openapi
 * /deliverynote/pdf/{id}:
 *   get:
 *     tags:
 *       - Delivery Notes
 *     summary: Generar y guardar PDF de albarán
 *     description: Genera un archivo PDF para un albarán específico (si pertenece al usuario) y lo guarda en el sistema de archivos del servidor. Devuelve la ruta del archivo guardado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del albarán para generar el PDF.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: PDF generado y guardado en el servidor exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "PDF_GENERATED_AND_SAVED_SUCCESSFULLY"
 *                 filePath:
 *                   type: string
 *                   description: Ruta absoluta del archivo PDF en el servidor.
 *                   example: "/app/generated_pdfs/delivery_note_68....pdf"
 *       # Nota: Esta ruta ya no envía el PDF como descarga directa
 *       # '200':
 *       #   description: OK. Devuelve el archivo PDF como stream.
 *       #   content:
 *       #     application/pdf:
 *       #       schema:
 *       #         type: string
 *       #         format: binary
 *       '401':
 *         description: No autorizado. El token de acceso no es válido o ha expirado.
 *       '404':
 *         description: Albarán no encontrado o no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación. El ID proporcionado no es un ObjectId válido.
 *       '500':
 *         description: Error interno al generar o guardar el PDF.
 *         
 */

router.get("/pdf/:id", mongoIdValidator('id'), downloadPdfCtrl);


/**
 * @openapi
 * /deliverynote/sign/{id}:
 *   patch:
 *     tags:
 *       - Delivery Notes
 *     summary: Firmar un albarán (Subir firma a IPFS)
 *     description: Sube una imagen de firma (enviada como archivo 'sign'), la guarda en IPFS, actualiza el albarán marcándolo como firmado y guarda la URL de IPFS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del albarán a firmar (no debe estar firmado previamente).
 *         schema:
 *           type: string
 *           format: ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               sign: # Nombre del campo del archivo
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen de la firma (PNG, JPG, etc.).
 *             required:
 *               - sign
 *     responses:
 *       '200':
 *         description: Albarán firmado y firma subida a IPFS correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "DELIVERY_NOTE_SIGNED_SUCCESSFULLY"
 *                 signUrl:
 *                   type: string
 *                   format: url
 *                   description: URL de la firma almacenada en IPFS.
 *                   example: "https://gateway.pinata.cloud/ipfs/Qm..."
 *       '400':
 *         description: No se proporcionó archivo de firma.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: No autorizado. El token de acceso no es válido o ha expirado.
 *       '404':
 *         description: Albarán no encontrado, no pertenece al usuario o ya estaba firmado.
 *         
 *       '422':
 *         description: Error de validación. El ID proporcionado no es un ObjectId válido.
 *       '500':
 *         description: Error interno del servidor 
 *         
 */

router.patch("/sign/:id", mongoIdValidator('id'), uploadMiddlewareMemory.single('sign'), signDeliveryNoteCtrl);


/**
 * @openapi
 * /deliverynote:
 *   post:
 *     tags:
 *       - Delivery Notes
 *     summary: Crear un nuevo albarán simple (Horas o Material)
 *     description: Añade un nuevo albarán asociado a un usuario, cliente y proyecto existentes. Requiere especificar formato 'hours' o 'material' y los campos correspondientes.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryNoteInput' # Schema para creación simple
 *     responses:
 *       '201':
 *         description: Albarán creado exitosamente. Devuelve el objeto creado con datos básicos.
 *         content:
 *           application/json:
 *             schema:
 *               # La respuesta del controlador devuelve un objeto formateado
 *               type: object
 *               properties:
 *                 _id: { type: string, format: ObjectId }
 *                 userId: { type: string, format: ObjectId }
 *                 clientId: { type: string, format: ObjectId }
 *                 projectId: { type: string, format: ObjectId }
 *                 format: { type: string, enum: ['hours', 'material'] }
 *                 hours: { type: 'number', nullable: true }
 *                 quantity: { type: 'number', nullable: true }
 *                 description: { type: 'string', nullable: true }
 *                 workdate: { type: 'string', format: 'date-time' }
 *                 pending: { type: 'boolean' }
 *                 createdAt: { type: 'string', format: 'date-time' }
 *                 updatedAt: { type: 'string', format: 'date-time' }
 *       '401':
 *         description: No autorizado. El token de acceso no es válido o ha expirado.
 *       '403':
 *         description: Prohibido (El proyecto especificado no pertenece al usuario).
 *         
 *       '422':
 *         description: Error de validación. El cuerpo de la solicitud no cumple con el esquema esperado.
 *       '500':
 *         description: Error interno del servidor 
 */

router.post("/", validatorCreateDeliveryNote, createDeliveryNoteCtrl);


/**
 * @openapi
 * /deliverynote:
 *   get:
 *     tags:
 *       - Delivery Notes
 *     summary: Obtener todos los albaranes activos del usuario
 *     description: Devuelve una lista de todos los albaranes activos (no archivados) asociados al usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de albaranes activos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeliveryNote' # Usa el schema completo de albarán
 *       '401':
 *         description: No autorizado. El token de acceso no es válido o ha expirado.
 *       '500':
 *         description: Error interno del servidor 
 */

router.get("/", getDeliveryNotesCtrl);



/**
 * @openapi
 * /deliverynote/{id}:
 *   get:
 *     tags:
 *       - Delivery Notes
 *     summary: Obtener un albarán específico por ID
 *     description: Devuelve los detalles completos de un albarán, incluyendo datos poblados del usuario, cliente y proyecto asociados, si pertenece al usuario autenticado y está activo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del albarán a obtener.
 *         schema:
 *           type: string
 *           format: ObjectId
 *     responses:
 *       '200':
 *         description: Detalles del albarán con datos relacionados poblados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryNote' # El controlador popula y devuelve el objeto completo
 *               # Añadir descripción sobre campos poblados si es necesario
 *       '401':
 *         description: No autorizado. El token de acceso no es válido o ha expirado.
 *       '404':
 *         description: Albarán no encontrado o no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación (formato de ID incorrecto).
 *         
 *       '500':
 *         description: Error interno del servidor
 */

router.get("/:id", mongoIdValidator('id'), getDeliveryNoteByIdCtrl);


/**
 * @openapi
 * /deliverynote/{id}:
 *   delete:
 *     tags:
 *       - Delivery Notes
 *     summary: Eliminar un albarán (Solo Hard Delete si no está firmado)
 *     description: Realiza un borrado físico (hard delete) de un albarán si se especifica '?hard=true'. Falla si el albarán está firmado. El borrado suave (archivado) no está soportado en este endpoint según la corrección.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del albarán a eliminar.
 *         schema:
 *           type: string
 *           format: ObjectId
 *       - name: hard # Cambiado para que sea requerido lógicamente
 *         in: query
 *         required: true # Hacerlo requerido para que la intención sea clara
 *         description: Debe ser 'true' para intentar el borrado físico.
 *         schema:
 *           type: boolean
 *           enum: [true] # Solo permitir true
 *     responses:
 *       '200':
 *         description: Albarán eliminado permanentemente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse' # Devuelve { status: 'OK', message: '...' }
 *       '400':
 *          description: Petición incorrecta (ej. falta ?hard=true).
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: No autorizado. El token de acceso no es válido o ha expirado.
 *       '403':
 *         description: Prohibido eliminar (el albarán está firmado).
 *         
 *       '404':
 *         description: Albarán no encontrado o no pertenece al usuario.
 *         
 *       '422':
 *         description: Error de validación (formato de ID incorrecto).
 *         
 *       '500':
 *         description: Error interno del servidor 
 */

router.delete("/:id", mongoIdValidator('id'), deleteDeliveryNoteCtrl);

module.exports = router;