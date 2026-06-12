// controllers/adminController.js
const db = require('../config/db');

const getStats = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE) AS total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'alumno' AND activo = TRUE) AS total_alumnos,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'docente' AND activo = TRUE) AS total_docentes,
        (SELECT COUNT(*) FROM escuelas WHERE activa = TRUE) AS total_escuelas,
        (SELECT COUNT(*) FROM operaciones) AS total_operaciones,
        (SELECT ROUND(AVG(((capital_actual - capital_inicial) / capital_inicial) * 100), 2) FROM carteras) AS rendimiento_promedio
    `);
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener stats' }); }
};

const getUsuarios = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.activo, u.anio_cursada,
             u.escuela_id, e.nombre AS escuela_nombre, u.ultima_actividad, u.created_at,
             c.capital_actual, c.capital_inicial
      FROM usuarios u
      LEFT JOIN escuelas e ON e.id = u.escuela_id
      LEFT JOIN carteras c ON c.usuario_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener usuarios' }); }
};

const cambiarRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;
    if (!['alumno','docente','admin','escuela'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    await db.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, id]);
    res.json({ mensaje: 'Rol actualizado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al cambiar rol' }); }
};

const toggleActivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    await db.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, id]);
    res.json({ mensaje: activo ? 'Usuario activado' : 'Usuario desactivado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al cambiar estado' }); }
};

const resetearCartera = async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id FROM carteras WHERE usuario_id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cartera no encontrada' });
    const cartera_id = rows[0].id;
    await client.query('DELETE FROM posiciones WHERE cartera_id = $1', [cartera_id]);
    await client.query('DELETE FROM operaciones WHERE usuario_id = $1', [id]);
    await client.query('UPDATE carteras SET capital_actual = capital_inicial WHERE id = $1', [cartera_id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Cartera reseteada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al resetear cartera' });
  } finally { client.release(); }
};

module.exports = { getStats, getUsuarios, cambiarRol, toggleActivo, resetearCartera };
