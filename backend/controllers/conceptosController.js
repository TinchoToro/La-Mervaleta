// controllers/conceptosController.js – Módulo educativo
const db = require('../config/db');
const { sincronizarEnTransaccion } = require('../services/desafios');

// GET /api/conceptos – Todos los conceptos con estado "visto"
const listar = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.titulo, c.contenido, c.ticker_rel, c.sector_rel, c.nivel, c.orden,
         CASE WHEN cv.usuario_id IS NOT NULL THEN TRUE ELSE FALSE END AS visto
       FROM conceptos c
       LEFT JOIN conceptos_vistos cv ON cv.concepto_id = c.id AND cv.usuario_id = $1
       WHERE c.activo = TRUE
       ORDER BY c.orden`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener conceptos' });
  }
};

// POST /api/conceptos/:id/ver – Marcar concepto como visto
const marcarVisto = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [req.usuario.id]);
    await client.query(
      `INSERT INTO conceptos_vistos (usuario_id, concepto_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.usuario.id, req.params.id]
    );
    await sincronizarEnTransaccion(client, req.usuario.id, true);
    await client.query('COMMIT');
    res.json({ mensaje: '¡Concepto completado! Ya podés operar este activo.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al registrar concepto' });
  } finally { client.release(); }
};

// GET /api/conceptos/pendientes – Conceptos sin leer
const pendientes = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.titulo, c.ticker_rel, c.nivel
       FROM conceptos c
       LEFT JOIN conceptos_vistos cv ON cv.concepto_id = c.id AND cv.usuario_id = $1
       WHERE c.activo = TRUE AND cv.usuario_id IS NULL
       ORDER BY c.orden`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pendientes' });
  }
};

module.exports = { listar, marcarVisto, pendientes };
