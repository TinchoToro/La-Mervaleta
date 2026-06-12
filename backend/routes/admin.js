// routes/admin.js
const router = require('express').Router();
const { getStats, getUsuarios, cambiarRol, toggleActivo, resetearCartera } = require('../controllers/adminController');
const { verificarToken, soloRol } = require('../middleware/auth');

const esAdmin = [verificarToken, soloRol('admin')];

router.get('/stats',                    ...esAdmin, getStats);
router.get('/usuarios',                 ...esAdmin, getUsuarios);
router.put('/usuarios/:id/rol',         ...esAdmin, cambiarRol);
router.put('/usuarios/:id/activo',      ...esAdmin, toggleActivo);
router.post('/usuarios/:id/resetear-cartera', ...esAdmin, resetearCartera);

module.exports = router;
