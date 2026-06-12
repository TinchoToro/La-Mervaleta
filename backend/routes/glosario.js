// routes/glosario.js
const router = require('express').Router();
const { listarGlosario, crearTermino } = require('../controllers/glosarioController');
const { verificarToken, soloRol } = require('../middleware/auth');

router.get('/',  verificarToken, listarGlosario);
router.post('/', verificarToken, soloRol('docente','admin'), crearTermino);

module.exports = router;
