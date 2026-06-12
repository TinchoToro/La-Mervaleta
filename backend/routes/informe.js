// routes/informe.js
const router = require('express').Router();
const { generarInforme } = require('../controllers/informeController');
const { verificarToken, soloRol } = require('../middleware/auth');

// Alumno descarga el suyo, docente/admin puede pedir el de cualquier alumno
router.get('/mi-informe',    verificarToken, generarInforme);
router.get('/alumno/:id',    verificarToken, soloRol('docente','admin'), generarInforme);

module.exports = router;
