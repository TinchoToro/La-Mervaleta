// controllers/bancoDesafiosController.js
const db = require('../config/db');

// GET /api/banco-desafios – listar todos con filtros
const listarBanco = async (req, res) => {
  try {
    const { anio, materia, dificultad } = req.query;
    let query = `SELECT * FROM banco_desafios WHERE activo = TRUE`;
    const params = [];
    if (anio)       { params.push(anio);       query += ` AND (anio_cursada = $${params.length} OR anio_cursada IS NULL)`; }
    if (materia)    { params.push(materia);    query += ` AND materia = $${params.length}`; }
    if (dificultad) { params.push(dificultad); query += ` AND dificultad = $${params.length}`; }
    query += ` ORDER BY anio_cursada NULLS LAST, dificultad, titulo`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener banco' }); }
};

// POST /api/banco-desafios/:id/asignar – asignar desafio a la temporada activa
const asignarDesafio = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.body;

    const { rows: banco } = await db.query('SELECT * FROM banco_desafios WHERE id = $1', [id]);
    if (banco.length === 0) return res.status(404).json({ error: 'Desafio no encontrado' });
    const d = banco[0];

    const { rows } = await db.query(
      `INSERT INTO desafios (nombre, descripcion, puntos_bonus, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [d.titulo, d.descripcion, d.puntos_bonus, fecha_inicio, fecha_fin]
    );
    res.status(201).json({ mensaje: 'Desafio asignado a la liga', desafio: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al asignar desafio' }); }
};

// POST /api/banco-desafios – crear desafio personalizado
const crearEnBanco = async (req, res) => {
  try {
    const { titulo, descripcion, tipo, anio_cursada, materia, dificultad, puntos_bonus } = req.body;
    if (!titulo || !descripcion) return res.status(400).json({ error: 'Titulo y descripcion requeridos' });
    const { rows } = await db.query(
      `INSERT INTO banco_desafios (titulo, descripcion, tipo, anio_cursada, materia, dificultad, puntos_bonus)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [titulo, descripcion, tipo || 'operacion', anio_cursada || null, materia || 'General', dificultad || 'medio', puntos_bonus || 300]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al crear desafio' }); }
};

module.exports = { listarBanco, asignarDesafio, crearEnBanco };
