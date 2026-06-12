// controllers/operacionesController.js – Comprar y vender activos
const db = require('../config/db');

// POST /api/comprar
const comprar = async (req, res) => {
  const { activo_id, cantidad } = req.body;
  const usuario_id = req.usuario.id;

  if (!activo_id || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Activo y cantidad válida son requeridos' });
  }

  // ─── Transacción: todo o nada ───
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener precio actual del activo
    const { rows: activoRows } = await client.query(
      'SELECT id, ticker, precio FROM activos WHERE id = $1 AND activo = TRUE',
      [activo_id]
    );
    if (activoRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    const activo = activoRows[0];
    const total  = activo.precio * cantidad;

    // 2. Verificar que leyó al menos 1 concepto
    const { rows: conceptoRows } = await client.query(
      'SELECT COUNT(*) AS leidos FROM conceptos_vistos WHERE usuario_id = $1',
      [usuario_id]
    );
    if (parseInt(conceptoRows[0].leidos) === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'Debés leer al menos un concepto educativo antes de operar',
        concepto_pendiente: true
      });
    }

    // 3. Verificar capital disponible
    const { rows: carteraRows } = await client.query(
      'SELECT id, capital_actual FROM carteras WHERE usuario_id = $1 FOR UPDATE',
      [usuario_id]
    );
    if (carteraRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cartera no encontrada' });
    }
    const cartera = carteraRows[0];
    if (cartera.capital_actual < total) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Capital insuficiente',
        capital_disponible: cartera.capital_actual,
        total_requerido: total
      });
    }

    // 4. Descontar capital
    await client.query(
      'UPDATE carteras SET capital_actual = capital_actual - $1, updated_at = NOW() WHERE id = $2',
      [total, cartera.id]
    );

    // 5. Actualizar posición (upsert)
    await client.query(
      `INSERT INTO posiciones (cartera_id, activo_id, cantidad, precio_promedio)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cartera_id, activo_id) DO UPDATE SET
         precio_promedio = (
           (posiciones.precio_promedio * posiciones.cantidad + $4 * $3) /
           (posiciones.cantidad + $3)
         ),
         cantidad = posiciones.cantidad + $3,
         updated_at = NOW()`,
      [cartera.id, activo_id, cantidad, activo.precio]
    );

    // 6. Registrar operación
    const { rows: opRows } = await client.query(
      `INSERT INTO operaciones (usuario_id, activo_id, tipo, cantidad, precio)
       VALUES ($1, $2, 'compra', $3, $4)
       RETURNING *`,
      [usuario_id, activo_id, cantidad, activo.precio]
    );

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: `Compraste ${cantidad} acciones de ${activo.ticker}`,
      operacion: opRows[0],
      capital_restante: cartera.capital_actual - total
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al procesar la compra' });
  } finally {
    client.release();
  }
};

// POST /api/vender
const vender = async (req, res) => {
  const { activo_id, cantidad } = req.body;
  const usuario_id = req.usuario.id;

  if (!activo_id || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Activo y cantidad válida son requeridos' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener precio actual
    const { rows: activoRows } = await client.query(
      'SELECT id, ticker, precio FROM activos WHERE id = $1 AND activo = TRUE',
      [activo_id]
    );
    if (activoRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    const activo = activoRows[0];
    const total  = activo.precio * cantidad;

    // 2. Verificar posición existente
    const { rows: posRows } = await client.query(
      `SELECT p.id, p.cantidad FROM posiciones p
       JOIN carteras c ON c.id = p.cartera_id
       WHERE c.usuario_id = $1 AND p.activo_id = $2 FOR UPDATE`,
      [usuario_id, activo_id]
    );
    if (posRows.length === 0 || posRows[0].cantidad < cantidad) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No tenés suficientes acciones para vender',
        cantidad_disponible: posRows[0]?.cantidad || 0
      });
    }

    // 3. Actualizar posición
    const nuevaCantidad = posRows[0].cantidad - cantidad;
    if (nuevaCantidad === 0) {
      await client.query('DELETE FROM posiciones WHERE id = $1', [posRows[0].id]);
    } else {
      await client.query(
        'UPDATE posiciones SET cantidad = $1, updated_at = NOW() WHERE id = $2',
        [nuevaCantidad, posRows[0].id]
      );
    }

    // 4. Acreditar capital
    const { rows: carteraRows } = await client.query(
      `UPDATE carteras SET capital_actual = capital_actual + $1, updated_at = NOW()
       WHERE usuario_id = $2
       RETURNING capital_actual`,
      [total, usuario_id]
    );

    // 5. Registrar operación
    const { rows: opRows } = await client.query(
      `INSERT INTO operaciones (usuario_id, activo_id, tipo, cantidad, precio)
       VALUES ($1, $2, 'venta', $3, $4)
       RETURNING *`,
      [usuario_id, activo_id, cantidad, activo.precio]
    );

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: `Vendiste ${cantidad} acciones de ${activo.ticker}`,
      operacion: opRows[0],
      capital_actual: carteraRows[0].capital_actual
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al procesar la venta' });
  } finally {
    client.release();
  }
};

// GET /api/operaciones
const historial = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.id, o.tipo, o.cantidad, o.precio, o.total, o.fecha,
              a.ticker, a.nombre as activo_nombre
       FROM operaciones o
       JOIN activos a ON a.id = o.activo_id
       WHERE o.usuario_id = $1
       ORDER BY o.fecha DESC
       LIMIT 50`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

module.exports = { comprar, vender, historial };
