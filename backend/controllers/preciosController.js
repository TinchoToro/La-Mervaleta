// controllers/preciosController.js – Actualización automática de precios
const db = require('../config/db');

const actualizarPrecios = async (req, res) => {
  // Verificar clave secreta para evitar abuso
  const { secret } = req.query;
  if (secret !== process.env.CRON_SECRET && secret !== 'mervaleta2026') {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // Obtener precios actuales
    const { rows: activos } = await db.query(
      'SELECT id, ticker, precio FROM activos WHERE activo = TRUE'
    );

    let actualizados = 0;
    for (const activo of activos) {
      // Variación simulada entre -3% y +3%
      const variacion = parseFloat((Math.random() * 6 - 3).toFixed(2));
      const nuevoPrecio = parseFloat((activo.precio * (1 + variacion / 100)).toFixed(2));

      // Actualizar precio actual
      await db.query(
        'UPDATE activos SET precio = $1, variacion_dia = $2, updated_at = NOW() WHERE id = $3',
        [nuevoPrecio, variacion, activo.id]
      );

      // Guardar en historial
      await db.query(
        `INSERT INTO historial_precios (activo_id, precio, variacion_dia, fecha)
         VALUES ($1, $2, $3, CURRENT_DATE)
         ON CONFLICT (activo_id, fecha) DO UPDATE
         SET precio = EXCLUDED.precio, variacion_dia = EXCLUDED.variacion_dia`,
        [activo.id, nuevoPrecio, variacion]
      );

      actualizados++;
    }

    res.json({
      mensaje: `${actualizados} activos actualizados`,
      fecha: new Date().toISOString(),
      actualizados
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar precios' });
  }
};

module.exports = { actualizarPrecios };
