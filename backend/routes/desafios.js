// routes/desafios.js
const router = require('express').Router();
const { listarDesafios, desafioActual, crearDesafio } = require('../controllers/desafiosController');
const { verificarToken, soloRol } = require('../middleware/auth');

router.get('/actual', verificarToken, desafioActual);
router.get('/',       verificarToken, listarDesafios);
router.post('/',      verificarToken, soloRol('admin','docente'), crearDesafio);

module.exports = router;