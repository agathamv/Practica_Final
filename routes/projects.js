// routes/projects.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware'); // Ajustar path

const {mongoIdValidator, validatorCreateProject, validatorUpdateProject, validatorGetProjectsQuery, validatorGetProjectsByClient, validatorGetProjectByIdQuery, validatorGetProjectByClientAndId, validatorActivateProject, validatorUpdatePrices, validatorUpdateAmount} = require('../validators/projects'); 
const {createProjectCtrl, getProjectsCtrl, getProjectsByClientCtrl, getProjectByIdSimpleCtrl, getProjectByClientAndIdCtrl, updateProjectCtrl, deleteProjectCtrl, archiveProjectCtrl, getArchivedProjectsCtrl, getArchivedProjectsByClientCtrl, restoreProjectCtrl, activateProjectCtrl, updatePricesCtrl, updateAmountCtrl} = require('../controllers/projects');

router.use(authMiddleware);


// Rutas de Archivado y Restauración (antes de rutas con /:id general)
router.get("/archive", getArchivedProjectsCtrl); // GET /api/project/archive
router.get("/archive/:client", mongoIdValidator('client'), getArchivedProjectsByClientCtrl); // GET /api/project/archive/:client
router.delete("/archive/:id", mongoIdValidator('id'), archiveProjectCtrl); // DELETE /api/project/archive/:id (Soft Delete)
router.patch("/restore/:id", mongoIdValidator('id'), restoreProjectCtrl); // PATCH /api/project/restore/:id

// Ruta de Activación
router.patch("/activate/:id", validatorActivateProject, activateProjectCtrl); // PATCH /api/project/activate/:id

// Rutas de Precios y Monto
router.patch("/prices/:id", mongoIdValidator('id'), validatorUpdatePrices, updatePricesCtrl); // PATCH /api/project/prices/:id (Validador de body separado)
router.patch("/amount/:id", mongoIdValidator('id'), validatorUpdateAmount, updateAmountCtrl); // PATCH /api/project/amount/:id (Validador de body separado)

// Ruta para obtener un proyecto específico (simple)
router.get("/one/:id", validatorGetProjectByIdQuery, getProjectByIdSimpleCtrl); // GET /api/project/one/:id (Validador incluye query)

// Rutas generales de proyectos
router.post("/", validatorCreateProject, createProjectCtrl); // POST /api/project
router.get("/", validatorGetProjectsQuery, getProjectsCtrl);  // GET /api/project (Validador incluye query)

// Rutas específicas por cliente (antes de /:id general)
router.get("/:client", validatorGetProjectsByClient, getProjectsByClientCtrl); // GET /api/project/:client (Validador incluye query y path)
router.get("/:client/:id", validatorGetProjectByClientAndId, getProjectByClientAndIdCtrl); // GET /api/project/:client/:id (Validador incluye path)

// Rutas generales por ID de proyecto (al final para no capturar otras rutas)
// Decidimos si GET /:id es necesario o /one/:id es suficiente. Mapeamos a la misma por ahora.
router.get("/:id", mongoIdValidator('id'), getProjectByIdSimpleCtrl); // GET /api/project/:id
router.put("/:id", mongoIdValidator('id'), validatorUpdateProject, updateProjectCtrl); // PUT /api/project/:id
router.delete("/:id", mongoIdValidator('id'), deleteProjectCtrl); // DELETE /api/project/:id (Soft/Hard)


module.exports = router;