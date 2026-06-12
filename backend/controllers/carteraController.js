// controllers/carteraController.js – Estado de la cartera del alumno
const db = require('../config/db');

// GET /api/cartera
const miCartera = async (req, res) => {
  try {
    // Cartera + posiciones + rendimiento
    const { rows: cartera } = await db.query(
      `SELECT
         c.id, c.capital_inicial, c.capital_actual,
         ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct,
         c.updated_at
       FROM carteras c
       WHERE c.usuario_id = $1`,
      [req.usuario.id]
    );
    if (cartera.length === 0) return res.status(404).json({ error: 'Cartera no encontrada' });

    // Posiciones abiertas con valor actual
    const { rows: posiciones } = await db.query(
      `SELECT
         p.cantidad,
         p.precio_promedio,
         a.id as activo_id,
         a.ticker,
         a.nombre,
         a.sector,
         a.precio as precio_actual,
         a.variacion_dia,
         (p.cantidad * a.precio) AS valor_actual,
         ROUND(((a.precio - p.precio_promedio) / p.precio_promedio) * 100, 2) AS ganancia_pct
       FROM posiciones p
       JOIN activos a ON a.id = p.activo_id
       WHERE p.cartera_id = $1
       ORDER BY valor_actual DESC`,
      [cartera[0].id]
    );

    res.json({ ...cartera[0], posiciones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la cartera' });
  }
};

// GET /api/activos – Lista de activos disponibles
const listarActivos = async (req, res) => {
  try {
    const { rows } = await db.query(

'SELECT id, ticker, nombre, sector, tipo, descripcion, precio, variacion_dia FROM activos WHERE activo = TRUE ORDER BY ticker'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener activos' });
  }
};

module.exports = { miCartera, listarActivos };
