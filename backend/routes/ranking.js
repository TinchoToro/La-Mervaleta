// ── routes/ranking.js ───────────────────────────────────────
const router = require('express').Router();
const { rankingAlumnos, rankingEscuelas, miPosicion } = require('../controllers/rankingController');
const { verificarToken } = require('../middleware/auth');

router.get('/ranking',           verificarToken, rankingAlumnos);
router.get('/ranking-escuelas',  verificarToken, rankingEscuelas);
router.get('/ranking/mi-posicion', verificarToken, miPosicion);

module.exports = router;
