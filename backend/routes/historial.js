// routes/historial.js
const router = require('express').Router();
const { historialActivo, historialPanel } = require('../controllers/historialController');
const { verificarToken } = require('../middleware/auth');

router.get('/',        verificarToken, historialPanel);
router.get('/:ticker', verificarToken, historialActivo);

module.exports = router;
