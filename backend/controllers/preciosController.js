const { timingSafeEqual } = require('node:crypto');
const db = require('../config/db');
const { actualizarMercado } = require('../services/mercado');
function autorizarCron(req) {
  const clave = process.env.CRON_SECRET;
  const recibido = req.headers.authorization;
  if (!clave || typeof recibido !== 'string') return false;
  const esperado = Buffer.from(`Bearer ${clave}`);
  const valor = Buffer.from(recibido);
  return valor.length === esperado.length && timingSafeEqual(valor,esperado);
}
const actualizarPrecios = async (req,res) => {
  if (!autorizarCron(req)) return res.status(401).json({ error:'No autorizado' });
  try {
    const resultado = await actualizarMercado();
    res.status(resultado.estado === 'sin_configurar' ? 503 : 200).json(resultado);
  } catch { res.status(502).json({ error:'No se pudo actualizar el mercado; se conservaron los últimos precios' }); }
};
const estadoPrecios = async (req,res) => {
  try {
    const { rows } = await db.query(`SELECT e.*,
      (SELECT COUNT(*) FROM activos WHERE activo=TRUE) AS total_activos,
      (SELECT COUNT(*) FROM activos WHERE activo=TRUE AND cotizacion_at IS NOT NULL) AS activos_con_fuente
      FROM estado_mercado e WHERE e.id=1`);
    res.set('Cache-Control','no-store');
    res.json({ ...rows[0], proveedor_configurado: Boolean(process.env.MARKET_DATA_URL && process.env.MARKET_DATA_SOURCE) });
  } catch { res.status(500).json({ error:'No se pudo consultar el estado del mercado' }); }
};
module.exports = { actualizarPrecios, estadoPrecios, autorizarCron };
