// routes/bancoDesafios.js
const router = require('express').Router();
const { listarBanco, asignarDesafio, crearEnBanco } = require('../controllers/bancoDesafiosController');
const { verificarToken, soloRol } = require('../middleware/auth');

const esDocente = [verificarToken, soloRol('docente','admin')];
const autenticado = [verificarToken];

router.get('/',              autenticado, listarBanco);
router.post('/',             ...esDocente, crearEnBanco);
router.post('/:id/asignar', ...esDocente, asignarDesafio);

module.exports = router;
