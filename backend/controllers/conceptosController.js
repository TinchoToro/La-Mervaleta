// controllers/conceptosController.js – Módulo educativo
const db = require('../config/db');

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
  try {
    await db.query(
      `INSERT INTO conceptos_vistos (usuario_id, concepto_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.usuario.id, req.params.id]
    );
    res.json({ mensaje: '¡Concepto completado! Ya podés operar este activo.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar concepto' });
  }
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
