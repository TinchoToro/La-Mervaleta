const db = require('../config/db');
// Contrato explícito para un adaptador de cotizaciones. No adivinar precios ni unidades.
function validarCotizaciones(payload, ahora = Date.now()) {
  if (!payload || !Array.isArray(payload.cotizaciones) || !payload.cotizaciones.length) throw new Error('El proveedor no devolvió cotizaciones');
  const vistos = new Set();
  return payload.cotizaciones.map(c => {
    if (typeof c.ticker !== 'string' || !/^[A-Z0-9.]{1,16}$/.test(c.ticker) || vistos.has(c.ticker)) throw new Error('Ticker inválido o duplicado');
    vistos.add(c.ticker);
    if (c.moneda !== 'ARS' || c.unidad_nominal !== 1) throw new Error('Se requieren precios en ARS por una unidad nominal');
    if (typeof c.precio !== 'number' || !Number.isFinite(c.precio) || c.precio < 0.01 || c.precio > 999999999999.99) throw new Error('Precio inválido');
    // La API existente opera a centavos: no aceptar un nominal que redondearía a cero.
    const precio = Math.round((c.precio + Number.EPSILON) * 100) / 100;
    if (typeof c.fecha !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(c.fecha)) throw new Error('La cotización debe incluir fecha, hora y zona horaria');
    const fecha = new Date(c.fecha);
    if (!Number.isFinite(fecha.getTime()) || fecha.getTime() > ahora + 60000) throw new Error('Fecha de cotización inválida o futura');
    let variacion = c.variacion_pct ?? null;
    if (variacion === null && typeof c.cierre_anterior === 'number' && c.cierre_anterior > 0 && Number.isFinite(c.cierre_anterior)) {
      variacion = (precio / c.cierre_anterior - 1) * 100;
    }
    if (variacion !== null && (typeof variacion !== 'number' || !Number.isFinite(variacion) || Math.abs(variacion) > 9999.99)) throw new Error('Variación porcentual inválida');
    return { ticker: c.ticker, precio, fecha, variacion: variacion === null ? null : Math.round(variacion * 100) / 100 };
  });
}
async function guardarCotizaciones(client, cotizaciones, fuente) {
  let actualizados = 0;
  const omitidos = [];
  for (const c of cotizaciones) {
    const { rows } = await client.query(`UPDATE activos SET precio=$2,variacion_dia=$3,cotizacion_at=$4,cotizacion_fuente=$5,updated_at=NOW()
      WHERE ticker=$1 AND activo=TRUE AND (cotizacion_at IS NULL OR cotizacion_at < $4) RETURNING id`,
    [c.ticker,c.precio,c.variacion,c.fecha,fuente]);
    if (!rows.length) { omitidos.push(c.ticker); continue; }
    actualizados++;
    await client.query(`INSERT INTO historial_precios(activo_id,precio,variacion_dia,fecha,fuente,cotizacion_at)
      VALUES($1,$2,$3,($4::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,$5,$4)
      ON CONFLICT(activo_id,fecha) DO UPDATE SET precio=EXCLUDED.precio,variacion_dia=EXCLUDED.variacion_dia,fuente=EXCLUDED.fuente,cotizacion_at=EXCLUDED.cotizacion_at`,
    [rows[0].id,c.precio,c.variacion,c.fecha,fuente]);
  }
  return { actualizados, omitidos };
}
async function actualizarMercado() {
  const url = process.env.MARKET_DATA_URL;
  const fuente = process.env.MARKET_DATA_SOURCE;
  if (!url || !fuente) {
    await db.query("UPDATE estado_mercado SET estado='sin_configurar',ultimo_intento=NOW() WHERE id=1");
    return { estado:'sin_configurar', actualizados:0 };
  }
  if (new URL(url).protocol !== 'https:') throw new Error('MARKET_DATA_URL debe usar HTTPS');
  const client = await db.connect();
  let bloqueado = false;
  try {
    // Una instancia de Railway, cron o réplica por vez.
    bloqueado = (await client.query("SELECT pg_try_advisory_lock(hashtext('mervaleta-mercado')) AS adquirido")).rows[0].adquirido;
    if (!bloqueado) return { estado:'en_curso', actualizados:0 };
    const headers = { Accept:'application/json' };
    if (process.env.MARKET_DATA_TOKEN) headers.Authorization = `Bearer ${process.env.MARKET_DATA_TOKEN}`;
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000), redirect:'error' });
    if (!r.ok) throw new Error(`El proveedor respondió HTTP ${r.status}`);
    const cotizaciones = validarCotizaciones(await r.json());
    await client.query('BEGIN');
    const resultado = await guardarCotizaciones(client,cotizaciones,fuente);
    await client.query(`UPDATE estado_mercado SET ultimo_intento=NOW(),ultimo_exito=NOW(),estado='actualizado',fuente=$1,actualizados=$2 WHERE id=1`,[fuente,resultado.actualizados]);
    await client.query('COMMIT');
    return { estado:'actualizado',...resultado };
  } catch (err) {
    await client.query('ROLLBACK');
    await client.query("UPDATE estado_mercado SET ultimo_intento=NOW(),estado='error' WHERE id=1");
    // No registrar URLs ni respuestas que pudieran contener claves del proveedor.
    console.error('No se pudo actualizar el mercado:', err.name);
    throw new Error('No se pudieron obtener cotizaciones válidas; se conservaron los últimos precios');
  } finally {
    if (bloqueado) await client.query("SELECT pg_advisory_unlock(hashtext('mervaleta-mercado'))");
    client.release();
  }
}
function iniciarActualizacion() {
  if (!process.env.MARKET_DATA_URL || !process.env.MARKET_DATA_SOURCE) {
    console.warn('Mercado sin proveedor configurado: no se generan precios aleatorios.');
    return;
  }
  let activo = false;
  const ejecutar = async () => {
    if (activo) return;
    activo = true;
    try { await actualizarMercado(); } catch { /* El estado de error ya quedó registrado. */ }
    finally { activo = false; }
  };
  ejecutar();
  const segundos = Number(process.env.MARKET_UPDATE_SECONDS || 300);
  const intervalo = Number.isFinite(segundos) ? Math.max(60,segundos) : 300;
  return setInterval(ejecutar,intervalo*1000).unref();
}
module.exports = { validarCotizaciones, guardarCotizaciones, actualizarMercado, iniciarActualizacion };
