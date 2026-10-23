// middleware/auth.js – Verificación de JWT y control de roles
const jwt = require('jsonwebtoken');

// Verifica que el token sea válido
const db = require('../config/db');
const verificarToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  let datos;
  try { datos = jwt.verify(header.slice(7), process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Token inválido o expirado' }); }
  try {
    const { rows } = await db.query('SELECT id,email,rol,escuela_id FROM usuarios WHERE id=$1 AND activo=TRUE', [datos.id]);
    if (!rows.length) return res.status(401).json({ error: 'Usuario desactivado o inexistente' });
    // Roles y escuela actuales: revocar permisos no debe esperar siete días a que venza el JWT.
    req.usuario = { ...datos, ...rows[0] };
    next();
  } catch { return res.status(503).json({ error: 'No se pudo verificar el usuario' }); }
};

// Factory: restringe acceso a uno o más roles
const soloRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos para esta acción' });
  }
  next();
};

module.exports = { verificarToken, soloRol };
