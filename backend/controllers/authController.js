// controllers/authController.js – Registro y login
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

// POST /api/auth/register
const register = async (req, res) => {
  const { nombre, apellido, email, password, escuela_id, anio_cursada } = req.body;
  const rol = 'alumno';
  if (!nombre || !apellido || !email || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!['alumno','docente','escuela','admin'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  try {
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, escuela_id, anio_cursada)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, apellido, email, rol, escuela_id, perfil_completado, perfil_riesgo`,
      [nombre, apellido, email, hash, rol, escuela_id || null, anio_cursada || null]
    );
    const usuario = rows[0];

    if (rol === 'alumno') {
      await db.query('INSERT INTO carteras (usuario_id, capital_inicial, capital_actual) VALUES ($1, 1000000, 1000000)', [usuario.id]);
    }

    const token = generarToken(usuario);
    res.status(201).json({ usuario, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const usuario = rows[0];

    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    delete usuario.password_hash;
    await db.query('UPDATE usuarios SET ultima_actividad = NOW() WHERE id = $1', [usuario.id]);
    const token = generarToken(usuario);
    res.json({ usuario, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, apellido, email, rol, escuela_id, perfil_completado, perfil_riesgo, created_at
       FROM usuarios WHERE id = $1`,
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

const generarToken = (usuario) =>
  jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      escuela_id: usuario.escuela_id,
      perfil_completado: usuario.perfil_completado || false,
      perfil_riesgo: usuario.perfil_riesgo || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const guardarPerfilRiesgo = async (req, res) => {
  try {
    const { perfil_riesgo } = req.body;
    if (!['conservador','moderado','agresivo'].includes(perfil_riesgo)) {
      return res.status(400).json({ error: 'Perfil inválido' });
    }
    await db.query(
      'UPDATE usuarios SET perfil_riesgo = $1, perfil_completado = TRUE WHERE id = $2',
      [perfil_riesgo, req.usuario.id]
    );

    // Devolver nuevo token con perfil_completado = true
    const { rows } = await db.query(
      'SELECT id, email, rol, escuela_id, perfil_completado, perfil_riesgo FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    const usuario = rows[0];
    const token = generarToken(usuario);

    res.json({ mensaje: 'Perfil guardado', perfil_riesgo, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar perfil' });
  }
};

module.exports = { register, login, me, guardarPerfilRiesgo };
