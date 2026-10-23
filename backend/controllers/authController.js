// controllers/authController.js – Registro y login
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { sincronizar } = require('../services/desafios');

// POST /api/auth/register
const register = async (req, res) => {
  const { nombre, apellido, email, password, escuela_id, anio_cursada } = req.body;
  if (![nombre,apellido,email,password].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ error:'Todos los campos son obligatorios' });
  if (password.length < 8 || password.length > 72 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error:'Ingresá un email válido y una contraseña de 8 a 72 caracteres' });
  let client;
  try {
    const hash = await bcrypt.hash(password, 10);
    client = await db.connect();
    await client.query('BEGIN');
    if (escuela_id) {
      const escuela = await client.query('SELECT id FROM escuelas WHERE id=$1 AND activa=TRUE',[escuela_id]);
      if (!escuela.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error:'Escuela no disponible' }); }
    }
    const { rows } = await client.query(`INSERT INTO usuarios(nombre,apellido,email,password_hash,rol,escuela_id,anio_cursada)
      VALUES($1,$2,$3,$4,'alumno',$5,$6) RETURNING id,nombre,apellido,email,rol,escuela_id,perfil_completado,perfil_riesgo`,
    [nombre.trim(),apellido.trim(),email.trim().toLowerCase(),hash,escuela_id || null,anio_cursada || null]);
    const usuario=rows[0];
    const temporadas=await client.query('SELECT id,capital_inicial FROM temporadas WHERE activa=TRUE AND escuela_id=$1 ORDER BY fecha_inicio DESC LIMIT 1',[escuela_id || null]);
    const temporada=temporadas.rows[0];
    await client.query('INSERT INTO carteras(usuario_id,capital_inicial,capital_actual,temporada_id) VALUES($1,$2,$2,$3)',[usuario.id,temporada?.capital_inicial || 1000000,temporada?.id || null]);
    const token=generarToken(usuario);
    await client.query('COMMIT');
    res.status(201).json({usuario,token});
  } catch(err) {
    if(client) await client.query('ROLLBACK');
    if(err.code==='23505') return res.status(409).json({error:'El email ya está registrado'});
    console.error('Error al registrar usuario:',err.code || err.name);
    res.status(500).json({error:'Error al registrar usuario'});
  } finally { if(client) client.release(); }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email.trim().toLowerCase()]
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
    if (usuario.rol === 'alumno') await sincronizar(usuario.id, true);
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
      `SELECT id, nombre, apellido, email, rol, escuela_id, perfil_completado, perfil_riesgo, anio_cursada, created_at
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
