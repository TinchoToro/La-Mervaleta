// controllers/temporadasController.js
const db = require('../config/db');

// GET /api/temporadas – listar temporadas de la escuela del docente
const listarTemporadas = async (req, res) => {
  try {
    const escuela_id = req.usuario.escuela_id;
    if (!escuela_id && req.usuario.rol !== 'admin') return res.json([]);
    let query = `
      SELECT t.*,
             (SELECT COUNT(*) FROM carteras c WHERE c.temporada_id = t.id) AS total_participantes,
             u.nombre || ' ' || u.apellido AS creado_por,
             e.nombre AS escuela_nombre
      FROM temporadas t
      LEFT JOIN usuarios u ON u.id = t.created_by
      LEFT JOIN escuelas e ON e.id = t.escuela_id
    `;
    const params = [];
    if (escuela_id) {
      params.push(escuela_id);
      query += ` WHERE t.escuela_id = $1`;
    }
    query += ` ORDER BY t.fecha_inicio DESC`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener temporadas' }); }
};

// GET /api/temporadas/activa – temporada activa de la escuela
const temporadaActiva = async (req, res) => {
  try {
    const escuela_id = req.usuario.escuela_id;
    if (!escuela_id) return res.json(null);
    const params = [];
    let whereExtra = '';
    if (escuela_id) {
      params.push(escuela_id);
      whereExtra = ` AND escuela_id = $${params.length}`;
    }
    const { rows } = await db.query(
      `SELECT * FROM temporadas WHERE activa = TRUE${whereExtra} LIMIT 1`,
      params
    );
    res.json(rows[0] || null);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener temporada activa' }); }
};

// POST /api/temporadas – crear nueva temporada
const crearTemporada = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_inicio, fecha_fin, capital_inicial } = req.body;
    if (!nombre || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Nombre, fecha inicio y fecha fin son obligatorios' });
    }
    if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la de inicio' });
    }
    const escuela_id = req.usuario.escuela_id;
    if (!escuela_id) return res.status(400).json({error:'Asigná una escuela al docente'});
    if (capital_inicial != null && (typeof capital_inicial !== 'number' || !Number.isFinite(capital_inicial) || capital_inicial <= 0)) return res.status(400).json({error:'Capital inicial inválido'});
    const { rows } = await db.query(
      `INSERT INTO temporadas (nombre, descripcion, fecha_inicio, fecha_fin, capital_inicial, created_by, escuela_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, descripcion || null, fecha_inicio, fecha_fin, capital_inicial || 1000000, req.usuario.id, escuela_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al crear temporada' }); }
};

// PUT /api/temporadas/:id/activar – activar temporada y asignar carteras de alumnos
const activarTemporada = async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const escuela_id = req.usuario.escuela_id;

    await client.query('BEGIN');

    const objetivo = await client.query(`SELECT * FROM temporadas WHERE id=$1 AND ($2::boolean OR escuela_id=$3)`,[id,req.usuario.rol === 'admin',escuela_id || null]);
    if (!objetivo.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({error:'Temporada no encontrada en tu escuela'}); }
    const escuelaObjetivo = objetivo.rows[0].escuela_id;
    await client.query('SELECT id FROM escuelas WHERE id=$1 FOR UPDATE',[escuelaObjetivo]);
    await client.query('UPDATE temporadas SET activa=FALSE WHERE escuela_id=$1',[escuelaObjetivo]);
    const { rows } = await client.query('UPDATE temporadas SET activa=TRUE WHERE id=$1 RETURNING *',[id]);
    const temporada = rows[0];

    // Asignar esta temporada a todas las carteras de alumnos de esta escuela
    await client.query(
      `UPDATE carteras SET temporada_id = $1
       FROM usuarios u
       WHERE carteras.usuario_id = u.id
         AND u.escuela_id = $2
         AND u.rol = 'alumno'
         AND u.activo = TRUE`,
      [id, escuelaObjetivo]
    );

    await client.query('COMMIT');
    res.json({ mensaje: `Temporada "${temporada.nombre}" activada`, temporada });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al activar temporada' });
  } finally { client.release(); }
};

// PUT /api/temporadas/:id – editar temporada
const editarTemporada = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fecha_inicio, fecha_fin, capital_inicial } = req.body;
    if (!nombre || !Number.isFinite(Date.parse(fecha_inicio)) || !Number.isFinite(Date.parse(fecha_fin)) || fecha_fin <= fecha_inicio || !Number.isFinite(Number(capital_inicial)) || Number(capital_inicial)<=0) return res.status(400).json({error:'Nombre, fechas o capital inválidos'});
    const { rows } = await db.query(
      `UPDATE temporadas SET nombre=$1, descripcion=$2, fecha_inicio=$3, fecha_fin=$4, capital_inicial=$5
       WHERE id=$6 AND ($7::boolean OR escuela_id=$8) RETURNING *`,
      [nombre, descripcion, fecha_inicio, fecha_fin, capital_inicial, id, req.usuario.rol === 'admin', req.usuario.escuela_id || null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Temporada no encontrada' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al editar temporada' }); }
};

// GET /api/temporadas/:id/ranking – ranking de una temporada específica
const rankingTemporada = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT u.nombre || ' ' || u.apellido AS nombre_completo,
              e.nombre AS escuela, e.ciudad,
              c.capital_inicial, c.patrimonio_total AS capital_actual, c.capital_actual AS capital_disponible,
              ROUND(((c.patrimonio_total - c.capital_inicial) / NULLIF(c.capital_inicial,0)) * 100, 2) AS rendimiento_pct,
              RANK() OVER (ORDER BY c.patrimonio_total DESC) AS posicion
       FROM v_carteras_valorizadas c
       JOIN usuarios u ON u.id = c.usuario_id
       LEFT JOIN escuelas e ON e.id = u.escuela_id
       WHERE c.temporada_id = $1 AND u.rol = 'alumno' AND u.activo = TRUE AND ($2::boolean OR u.escuela_id=$3)
       ORDER BY c.patrimonio_total DESC`,
      [id, req.usuario.rol === 'admin', req.usuario.escuela_id || null]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener ranking' }); }
};

module.exports = { listarTemporadas, temporadaActiva, crearTemporada, activarTemporada, editarTemporada, rankingTemporada };
