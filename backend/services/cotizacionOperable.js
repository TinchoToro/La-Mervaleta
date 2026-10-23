function cotizacionOperable(activo) {
  if (!process.env.MARKET_DATA_URL) return true; // Modo educativo sin proveedor, señalado en la UI.
  const maxEdad = Number(process.env.MARKET_MAX_AGE_SECONDS || 86400) * 1000;
  return Boolean(activo.cotizacion_at && activo.cotizacion_fuente &&
    Number.isFinite(maxEdad) && maxEdad > 0 && Date.now()-new Date(activo.cotizacion_at).getTime() <= maxEdad);
}
module.exports = { cotizacionOperable };
