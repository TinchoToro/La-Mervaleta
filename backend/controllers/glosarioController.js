// controllers/glosarioController.js
const db = require('../config/db');

const listarGlosario = async (req, res) => {
  try {
    const { q, categoria } = req.query;
    let query = `SELECT * FROM glosario WHERE activo = TRUE`;
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      query += ` AND (termino ILIKE $${params.length} OR definicion ILIKE $${params.length})`;
    }
    if (categoria) {
      params.push(categoria);
      query += ` AND categoria = $${params.length}`;
    }
    query += ` ORDER BY termino ASC`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener glosario' }); }
};

const crearTermino = async (req, res) => {
  try {
    const { termino, definicion, categoria, ejemplo } = req.body;
    if (!termino || !definicion) return res.status(400).json({ error: 'Termino y definicion requeridos' });
    const { rows } = await db.query(
      `INSERT INTO glosario (termino, definicion, categoria, ejemplo) VALUES ($1,$2,$3,$4) RETURNING *`,
      [termino, definicion, categoria || 'General', ejemplo || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El termino ya existe' });
    res.status(500).json({ error: 'Error al crear termino' });
  }
};

module.exports = { listarGlosario, crearTermino };
