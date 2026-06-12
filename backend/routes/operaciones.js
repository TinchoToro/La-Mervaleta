// routes/operaciones.js
const router = require('express').Router();
const { comprar, vender, historial } = require('../controllers/operacionesController');
const { verificarToken, soloRol }    = require('../middleware/auth');

router.post('/comprar',    verificarToken, soloRol('alumno', 'admin'), comprar);
router.post('/vender',     verificarToken, soloRol('alumno', 'admin'), vender);
router.get('/operaciones', verificarToken, soloRol('alumno', 'admin'), historial);

module.exports = router;