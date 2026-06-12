// routes/docente.js
const router = require('express').Router();
const { listarAlumnos, detalleAlumno, resumenEscuela } = require('../controllers/docenteController');
const { verificarToken, soloRol } = require('../middleware/auth');

const esDocente = [verificarToken, soloRol('docente', 'admin')];

router.get('/resumen',        ...esDocente, resumenEscuela);
router.get('/alumnos',        ...esDocente, listarAlumnos);
router.get('/alumnos/:id',    ...esDocente, detalleAlumno);

module.exports = router;
