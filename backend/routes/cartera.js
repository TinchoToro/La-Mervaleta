// routes/cartera.js
const router  = require('express').Router();
const { miCartera, listarActivos } = require('../controllers/carteraController');
const { verificarToken, soloRol }  = require('../middleware/auth');

router.get('/',        verificarToken, soloRol('alumno', 'admin'), miCartera);
router.get('/activos', verificarToken, listarActivos);

module.exports = router;