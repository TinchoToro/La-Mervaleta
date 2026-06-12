// routes/certificado.js
const router = require('express').Router();
const { generarCertificado } = require('../controllers/certificadoController');
const { verificarToken, soloRol } = require('../middleware/auth');

router.get('/descargar', verificarToken, soloRol('alumno', 'admin'), generarCertificado);

module.exports = router;
