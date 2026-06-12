// routes/temporadas.js
const router = require('express').Router();
const { listarTemporadas, temporadaActiva, crearTemporada, activarTemporada, editarTemporada, rankingTemporada } = require('../controllers/temporadasController');
const { verificarToken, soloRol } = require('../middleware/auth');

const esAdmin = [verificarToken, soloRol('admin')];
const autenticado = [verificarToken];

router.get('/',              autenticado, listarTemporadas);
router.get('/activa',        autenticado, temporadaActiva);
router.post('/',             ...esAdmin,  crearTemporada);
router.put('/:id',           ...esAdmin,  editarTemporada);
router.put('/:id/activar',   ...esAdmin,  activarTemporada);
router.get('/:id/ranking',   autenticado, rankingTemporada);

module.exports = router;
