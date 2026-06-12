// middleware/auth.js – Verificación de JWT y control de roles
const jwt = require('jsonwebtoken');

// Verifica que el token sea válido
const verificarToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const token = header.split(' ')[1];
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Factory: restringe acceso a uno o más roles
const soloRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos para esta acción' });
  }
  next();
};

module.exports = { verificarToken, soloRol };
