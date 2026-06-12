// controllers/rankingController.js – Rankings de alumnos y escuelas
const db = require('../config/db');

// GET /api/ranking
const rankingAlumnos = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM v_ranking_alumnos ORDER BY posicion LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
};

// GET /api/ranking-escuelas
const rankingEscuelas = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM v_ranking_escuelas ORDER BY posicion`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ranking de escuelas' });
  }
};

// GET /api/ranking/mi-posicion  (para el panel del alumno)
const miPosicion = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM v_ranking_alumnos WHERE id = $1`,
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado en el ranking' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener posición' });
  }
};

module.exports = { rankingAlumnos, rankingEscuelas, miPosicion };
