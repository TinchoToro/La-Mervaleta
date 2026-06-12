// routes/auth.js
const router = require('express').Router();
const { register, login, me, guardarPerfilRiesgo } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

router.post('/register',      register);
router.post('/login',         login);
router.get('/me',             verificarToken, me);
router.post('/perfil-riesgo', verificarToken, guardarPerfilRiesgo);

module.exports = router;