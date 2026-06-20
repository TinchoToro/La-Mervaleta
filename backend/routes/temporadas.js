// routes/temporadas.js
const router = require('express').Router();
const { listarTemporadas, temporadaActiva, crearTemporada, activarTemporada, editarTemporada, rankingTemporada } = require('../controllers/temporadasController');
const { verificarToken, soloRol } = require('../middleware/auth');

const autenticado = [verificarToken];
const docenteOAdmin = [verificarToken, soloRol('docente', 'admin')];

router.get('/',              ...autenticado,    listarTemporadas);
router.get('/activa',        ...autenticado,    temporadaActiva);
router.post('/',             ...docenteOAdmin,  crearTemporada);
router.put('/:id',           ...docenteOAdmin,  editarTemporada);
router.put('/:id/activar',   ...docenteOAdmin,  activarTemporada);
router.get('/:id/ranking',   ...autenticado,    rankingTemporada);

module.exports = router;
