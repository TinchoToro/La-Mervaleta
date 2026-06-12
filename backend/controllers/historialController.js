// controllers/historialController.js
const db = require('../config/db');

// GET /api/historial/:ticker – historial de precios de un activo
const historialActivo = async (req, res) => {
  try {
    const { ticker } = req.params;
    const { dias = 30 } = req.query;

    const { rows } = await db.query(
      `SELECT hp.precio, hp.variacion_dia, hp.fecha
       FROM historial_precios hp
       JOIN activos a ON a.id = hp.activo_id
       WHERE a.ticker = $1
       ORDER BY hp.fecha ASC
       LIMIT $2`,
      [ticker.toUpperCase(), parseInt(dias)]
    );

    if (rows.length === 0) {
      // Si no hay historial, devolver precio actual como punto único
      const { rows: actual } = await db.query(
        'SELECT precio, variacion_dia FROM activos WHERE ticker = $1',
        [ticker.toUpperCase()]
      );
      if (actual.length === 0) return res.status(404).json({ error: 'Activo no encontrado' });
      return res.json([{ precio: actual[0].precio, variacion_dia: actual[0].variacion_dia, fecha: new Date().toISOString().split('T')[0] }]);
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// GET /api/historial – historial de todos los activos del panel lider
const historialPanel = async (req, res) => {
  try {
    const PANEL = ['GGAL','YPFD','BMA','PAMP','BBAR','TECO2','TGSU2','TXAR','CEPU','BYMA'];
    const { rows } = await db.query(
      `SELECT a.ticker, hp.precio, hp.variacion_dia, hp.fecha
       FROM historial_precios hp
       JOIN activos a ON a.id = hp.activo_id
       WHERE a.ticker = ANY($1)
       AND hp.fecha >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY a.ticker, hp.fecha ASC`,
      [PANEL]
    );
    
    // Agrupar por ticker
    const agrupado = {};
    rows.forEach(r => {
      if (!agrupado[r.ticker]) agrupado[r.ticker] = [];
      agrupado[r.ticker].push({ precio: r.precio, variacion_dia: r.variacion_dia, fecha: r.fecha });
    });
    
    res.json(agrupado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial del panel' });
  }
};

module.exports = { historialActivo, historialPanel };
