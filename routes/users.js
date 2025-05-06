const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware'); // Check path
const { uploadMiddlewareMemory } = require('../utils/handleStorage'); // Check path

const {validatorRegister, validatorLogin, validatorVerify, validatorUpdatePersonal, validatorCompany, validatorForgotPassword, validatorResetPassword, validatorInvite, validatorAcceptInvitation} = require('../validators/users'); 

const { registerCtrl, loginCtrl, verifyEmailCtrl, updatePersonalCtrl, updateCompanyCtrl, updateLogoCtrl, getMyProfileCtrl, deleteMyAccountCtrl, forgotPasswordCtrl, resetPasswordCtrl, inviteGuestCtrl, acceptInvitationCtrl} = require('../controllers/users'); 


/**
 * @openapi
 * /user/register:
 *   post:
 *     tags:
 *       - User
 *     summary: Registrar un nuevo usuario
 *     description: Registra un usuario con email y contraseña. Devuelve un token y datos básicos (_id, email, status, role). Se requiere verificación posterior del email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserInputRequired"
 *     responses:
 *       '201':
 *         description: Usuario registrado exitosamente. Devuelve token y datos básicos del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticación inicial (antes de verificación).
 *                 user:
 *                   type: object
 *                   description: Datos básicos del usuario creado.
 *                   properties:
 *                     _id:
 *                       type: string
 *                       format: ObjectId
 *                     email:
 *                       type: string
 *                       format: email
 *                     status:
 *                       type: boolean
 *                     role:
 *                       type: string
 *                   required: [_id, email, status, role]
 *       # 409, 422, 500 responses remain the same (referencing ErrorResponse)
 *       '409':
 *         description: Email ya registrado.
 *       '422':
 *         description: Error de validación. 
 *       '500':
 *         description: Error interno del servidor.
 */

router.post("/register", validatorRegister, registerCtrl);

/**
 * @openapi
 * /user/login:
 *   post:
 *     tags:
 *       - User
 *     summary: Iniciar sesión de usuario
 *     description: Autentica un usuario (verificado) con email y contraseña y devuelve un token JWT y datos básicos del usuario (_id, email, role, name).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserLogin"
 *     responses:
 *       '200':
 *         description: Login exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  token:
 *                    type: string
 *                    description: Token JWT.
 *                  user:
 *                     type: object
 *                     description: Datos básicos del usuario logueado.
 *                     properties:
 *                       _id:
 *                         type: string
 *                         format: ObjectId
 *                       email:
 *                         type: string
 *                         format: email
 *                       role:
 *                         type: string
 *                       name: # Corresponds to 'nombre' in the model
 *                          type: string
 *                          nullable: true
 *                          example: "Pepe"
 *                     required: [_id, email, role]
 *       '401':
 *         description: Usuario no verificado o credenciales inválidas.
 *         
 *       '404':
 *         description: Usuario no encontrado.
 *         
 *       '422':
 *         description: Error de validación en los datos de entrada.
 *         
 *       '500':
 *         description: Error interno del servidor.
 *         
 */

router.post("/login", validatorLogin, loginCtrl);


/**
 * @openapi
 * /user/validation:
 *   put:
 *     tags:
 *       - User
 *     summary: Validar email de usuario
 *     description: Valida el email del usuario autenticado usando el código de verificación.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string # Sending as string now
 *                 description: Código de verificación de 6 dígitos.
 *                 example: "123456"
 *                 pattern: '^\d{6}$' # Add pattern validation
 *     responses:
 *       '200':
 *         description: Email verificado correctamente o ya estaba verificado.
 *         content:
 *           application/json:
 *             schema:
 *               # Controller returns { acknowledged: true } or { acknowledged: true, message: 'EMAIL_ALREADY_VERIFIED'}
 *               $ref: '#/components/schemas/AckResponse' # Use the generic ACK response
 *               # Or be more specific:
 *               # type: object
 *               # properties:
 *               #  acknowledged:
 *               #    type: boolean
 *               #    example: true
 *               #  message:
 *               #    type: string
 *               #    example: "EMAIL_ALREADY_VERIFIED"
 *               #    nullable: true
 *       '401':
 *         description: Usuario no autenticado o token inválido.
 *       '404':
 *        description: Usuario no encontrado.
 *       '422':
 *         description: Error de validación.
 *       '500':
 *         description: Error interno del servidor.
 */

router.put("/validation", authMiddleware, validatorVerify, verifyEmailCtrl);

/**
 * @openapi
 * /user/personal:
 *   put:
 *     tags:
 *       - User
 *     summary: Actualizar datos personales del usuario
 *     description: Actualiza nombre, apellidos y NIF del usuario autenticado. Devuelve el objeto usuario actualizado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             # This assumes validator was changed back to expect name/surnames
 *             # If validator expects nombre/apellidos, update this schema too
 *             $ref: "#/components/schemas/UserPersonalInput"
 *     responses:
 *       '200':
 *         description: Datos personales actualizados. Devuelve el usuario completo actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               # Controller returns the full User object formatted for response
 *               $ref: "#/components/schemas/UserResponse"
 *       '401': 
 *          description: Usuario no autenticado o token inválido.
 *       '404': 
 *          description: Usuario no encontrado.
 *       '422': 
 *         description: Error de validación.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.put("/personal", authMiddleware, validatorUpdatePersonal, updatePersonalCtrl);

/**
 * @openapi
 * /user/company:
 *   patch:
 *     tags:
 *       - User
 *     summary: Actualizar datos de la compañía del usuario
 *     description: Actualiza los datos de la compañía. Si el usuario es 'autonomo', usa sus datos personales para nombre/CIF.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserCompanyInput"
 *     responses:
 *       '200':
 *         description: Datos de compañía actualizados correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AckResponse" # Controller returns { acknowledged: true }
 *       '401': 
 *          description: Usuario no autenticado o token inválido.
 *       '403': 
 *         description: Usuario no autorizado para realizar esta acción.
 *       '404': 
 *         description: Usuario no encontrado.
 *       '409': 
 *          description: Conflicto en los datos de la compañía (ej. nombre o CIF ya existe).
 *       '422': 
 *          description: Error de validación en los datos de entrada.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.patch("/company", authMiddleware, validatorCompany, updateCompanyCtrl);

/**
 * @openapi
 * /user/logo:
 *   patch:
 *     tags:
 *       - User
 *     summary: Subir/Actualizar logo del usuario/compañía
 *     description: Sube un archivo de imagen como logo y lo asocia al usuario autenticado, guardando la URL (ej. IPFS).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen del logo (JPG, PNG, etc.).
 *             required: [logo]
 *     responses:
 *       '200':
 *         description: Logo subido y actualizado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               # Controller returns { status: 'OK', logoUrl: '...' }
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 logoUrl:
 *                   type: string
 *                   format: url
 *                   example: "https://gateway.pinata.cloud/ipfs/Qm..."
 *       '400': 
 *         description: Error en la solicitud. Puede ser un error de validación o un problema con el archivo (ej. tipo no permitido).
 *       '401': 
 *          description: Usuario no autenticado o token inválido.
 *       '404': 
 *          description: Usuario no encontrado.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.patch("/logo", authMiddleware, uploadMiddlewareMemory.single("logo"), updateLogoCtrl);

/**
 * @openapi
 * /user/me:
 *   get:
 *     tags:
 *       - User
 *     summary: Obtener perfil del usuario autenticado
 *     description: Devuelve los detalles completos del usuario asociado al token JWT.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Perfil del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserResponse" # Controller returns req.user (which should match UserResponse after toJSON)
 *       '401': 
 *          description: Usuario no autenticado o token inválido.
 *       '404': 
 *          description: Usuario no encontrado.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.get("/me", authMiddleware, getMyProfileCtrl);

/**
 * @openapi
 * /user/me:
 *   delete:
 *     tags:
 *       - User
 *     summary: Eliminar cuenta del usuario autenticado
 *     description: Elimina (soft por defecto, o hard si ?hard=true) la cuenta del usuario asociado al token JWT.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/HardDeleteQueryParam' # Reference reusable param
 *     responses:
 *       '200':
 *         description: Cuenta eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "USER_ACCOUNT_DEACTIVATED" # Or USER_ACCOUNT_PERMANENTLY_DELETED
 *       '401': 
 *          description: Usuario no autenticado o token inválido.
 *       '404': 
 *          description: Usuario no encontrado.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.delete("/me", authMiddleware, deleteMyAccountCtrl);

/**
 * @openapi
 * /user/forgot-password:
 *   post:
 *     tags:
 *       - User
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Procesa una solicitud de restablecimiento. Loguea el token en consola si el email existe y está activo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       '200':
 *         description: Solicitud procesada. Revisa la consola del servidor si la cuenta existe y está activa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "PASSWORD_RESET_LINK_GENERATED_CHECK_CONSOLE_IF_EXISTS"
 *       '422': 
 *          description: Error de validación. Puede ser un email inválido o un problema con el formato.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.post("/forgot-password", validatorForgotPassword, forgotPasswordCtrl);

/**
 * @openapi
 * /user/reset-password:
 *   post:
 *     tags:
 *       - User
 *     summary: Restablecer contraseña usando token
 *     description: Establece una nueva contraseña usando el token obtenido del proceso forgot-password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password, minLength: 8 }
 *     responses:
 *       '200':
 *         description: Contraseña restablecida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "PASSWORD_RESET_SUCCESSFUL"
 *       '400': 
 *          description: Error en la solicitud. Puede ser un error de validación o un problema con el token.
 *       '422': 
 *          description: Error de validación. Puede ser un token inválido o un problema con el formato de la contraseña.
 *       '500': 
 *          description: Error interno del servidor.
 */

router.post("/reset-password", validatorResetPassword, resetPasswordCtrl);

/**
 * @openapi
 * /user/invite:
 *   post:
 *     tags:
 *       - User
 *     summary: Invitar a un usuario guest
 *     description: Crea un usuario 'invitado' asociado a la compañía del usuario actual y loguea el token de invitación en consola.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario a invitar (no debe existir).
 *     responses:
 *       '200':
 *         description: Invitación generada. Revisa la consola del servidor para obtener el token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "INVITATION_GENERATED_CHECK_CONSOLE"
 *       '401': 
 *          description: Usuario no autenticado o token inválido.
 *       '403': 
 *          description: Usuario no autorizado para realizar esta acción.
 *       '409': 
 *          description: Conflicto. El email ya está registrado o el usuario ya existe.
 *       '422': 
 *          description: Error de validación. Puede ser un email inválido o un problema con el formato. 
 *       '500': 
 *          description: Error interno del servidor.
 */

router.post("/invite", authMiddleware, validatorInvite, inviteGuestCtrl); // Invite requires login

/**
 * @openapi
 * /user/accept-invitation:
 *   post:
 *     tags:
 *       - User
 *     summary: Aceptar invitación y configurar cuenta guest
 *     description: Activa la cuenta de invitado usando el token, establece contraseña y opcionalmente nombre/apellidos. Devuelve token y datos del usuario guest.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password, minLength: 8 }
 *               name: { type: string, nullable: true }
 *               surnames: { type: string, nullable: true }
 *     responses:
 *       '200':
 *         description: Invitación aceptada. Devuelve token y datos del usuario activado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "INVITATION_ACCEPTED_SUCCESSFULLY" }
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/UserResponse' }
 *       '400': 
 *          description: Error en la solicitud. Puede ser un error de validación o un problema con el token.
 *       '422': 
 *         description: Error de validación. Puede ser un token inválido o un problema con el formato de la contraseña.
 *       '500': 
 *         description: Error interno del servidor.
 */

router.post("/accept-invitation", validatorAcceptInvitation, acceptInvitationCtrl);

module.exports = router;