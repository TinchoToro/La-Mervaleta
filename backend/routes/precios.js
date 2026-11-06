const router = require('express').Router();
const { actualizarPrecios, estadoPrecios } = require('../controllers/preciosController');
const { verificarToken } = require('../middleware/auth');
router.get('/estado',verificarToken,estadoPrecios);
// Compatibilidad con cron por GET; ambos exigen Bearer y nunca usan claves en la URL.
router.get('/actualizar',actualizarPrecios);
router.post('/actualizar',actualizarPrecios);
module.exports = router;
