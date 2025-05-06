const { validatorMail } = require("../validators/mail")
const { send } = require("../controllers/mail")
const express = require('express')

const router = express.Router();


/**
 * @openapi
 * /mail:
 *   post:
 *     tags:
 *       - Mail
 *     summary: Enviar un email genérico
 *     description: Envía un email usando los datos proporcionados en el cuerpo (remitente, destinatario, asunto, texto). Este es un endpoint genérico y podría requerir autenticación o controles adicionales en un entorno real.
 *     # security: # Descomentar si se requiere autenticación para usar este endpoint
 *     #   - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, from, subject, text]
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Dirección de email del destinatario.
 *                 example: destinatario@example.com
 *               from:
 *                 type: string
 *                 format: email
 *                 description: Dirección de email del remitente (debe estar autorizada por el servicio de envío).
 *                 example: remitente@example.com
 *               subject:
 *                 type: string
 *                 description: Asunto del email.
 *                 example: Asunto de Prueba
 *               text:
 *                 type: string
 *                 description: Cuerpo del email en texto plano.
 *                 example: Este es el contenido del mensaje.
 *               # html: # Opcional: Cuerpo en HTML
 *               #  type: string
 *               #  example: "<p>Este es el contenido del <b>mensaje</b>.</p>"
 *     responses:
 *       '200':
 *         description: Email enviado (o intento de envío realizado). La propiedad 'details' puede contener información del transportador (nodemailer).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "EMAIL_SENT_SUCCESSFULLY"
 *                 details: # La estructura de 'details' depende de lo que devuelva tu sendEmail/nodemailer
 *                   type: object
 *                   description: Detalles adicionales del resultado del envío (puede variar).
 *                   example: { accepted: ["destinatario@example.com"], rejected: [], response: "250 OK", envelope: {...}, messageId: "<...>" }
 *       '401':
 *         description: No autorizado (ej. token inválido o no proporcionado).
 *       '422':
 *         description: Error de validación (ej. datos de entrada no válidos).
 *       '500':
 *         description: Error interno del servidor (ej. fallo al conectar con el servicio de email).
 *         
 */

router.post("/mail", validatorMail, send)


module.exports = router;