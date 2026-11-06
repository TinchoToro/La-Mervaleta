// routes/desafios.js
const router = require('express').Router();
const { listarDesafios, desafioActual, crearDesafio, resumenDesafios, listarRevision, aprobar } = require('../controllers/desafiosController');
const { verificarToken, soloRol } = require('../middleware/auth');

router.get('/resumen', verificarToken, resumenDesafios);
router.get('/revision', verificarToken, soloRol('admin','docente'), listarRevision);
router.post('/:id/aprobar', verificarToken, soloRol('admin','docente'), aprobar);
router.get('/actual', verificarToken, desafioActual);
router.get('/',       verificarToken, listarDesafios);
router.post('/',      verificarToken, soloRol('admin','docente'), crearDesafio);

module.exports = router;