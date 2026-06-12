// ── routes/conceptos.js ─────────────────────────────────────
const router = require('express').Router();
const { listar, marcarVisto, pendientes } = require('../controllers/conceptosController');
const { verificarToken } = require('../middleware/auth');

router.get('/',              verificarToken, listar);
router.get('/pendientes',    verificarToken, pendientes);
router.post('/:id/ver',      verificarToken, marcarVisto);

module.exports = router;
