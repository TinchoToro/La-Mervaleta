// ── routes/escuelas.js ──────────────────────────────────────
const router = require('express').Router();
const db     = require('../config/db');
const { verificarToken, soloRol } = require('../middleware/auth');

// GET /api/escuelas – público
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, nombre, ciudad, provincia FROM escuelas WHERE activa = TRUE ORDER BY nombre');
    res.json(rows);
  } catch { res.status(500).json({ error: 'Error al obtener escuelas' }); }
});

// POST /api/escuelas – solo admin
router.post('/', verificarToken, soloRol('admin'), async (req, res) => {
  const { nombre, ciudad, provincia } = req.body;
  if (!nombre || !ciudad) return res.status(400).json({ error: 'Nombre y ciudad requeridos' });
  try {
    const { rows } = await db.query(
      'INSERT INTO escuelas (nombre, ciudad, provincia) VALUES ($1, $2, $3) RETURNING *',
      [nombre, ciudad, provincia || 'Chubut']
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Error al crear escuela' }); }
});

module.exports = router;
