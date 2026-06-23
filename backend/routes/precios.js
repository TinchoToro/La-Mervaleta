// routes/precios.js
const router = require('express').Router();
const { actualizarPrecios } = require('../controllers/preciosController');

// Endpoint público con clave secreta — para cron jobs
router.get('/actualizar', actualizarPrecios);

module.exports = router;
