// routes/trazabilidad.js
const router = require('express').Router();
const { miProgreso, registrarLectura, trazabilidadAlumno } = require('../controllers/trazabilidadController');
const { verificarToken, soloRol } = require('../middleware/auth');

router.get('/mi-progreso',     verificarToken, miProgreso);
router.post('/registrar-lectura', verificarToken, registrarLectura);
router.get('/alumno/:id',      verificarToken, soloRol('docente','admin'), trazabilidadAlumno);

module.exports = router;
