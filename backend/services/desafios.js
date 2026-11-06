const db = require('../config/db');
const { resolverAsignada } = require('./reglasDesafios');
const HOY = "(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";
const avance = (actual, objetivo) => ({
  completado: objetivo > 0 && actual >= objetivo,
  progreso: Math.max(0, Math.min(Number(actual), Number(objetivo) || 0)), objetivo: Number(objetivo),
});
async function evaluar(client, usuarioId, regla, d) {
  const corte = d.fecha_corte;
  const contar = async (sql, params = [usuarioId, corte]) => Number((await client.query(sql, params)).rows[0].cnt);
  switch (regla.tipo) {
    case 'primera_compra':
    case 'total_operaciones': {
      const cnt = await contar(`SELECT COUNT(*) AS cnt FROM operaciones WHERE usuario_id=$1 AND fecha < $2
        ${regla.tipo === 'primera_compra' ? "AND tipo='compra'" : ''}`);
      return avance(cnt, regla.tipo === 'primera_compra' ? 1 : regla.cantidad);
    }
    case 'conceptos_leidos':
    case 'todos_conceptos': {
      const cnt = await contar(`SELECT COUNT(DISTINCT cv.concepto_id) AS cnt FROM conceptos_vistos cv
        JOIN conceptos c ON c.id=cv.concepto_id WHERE cv.usuario_id=$1 AND cv.visto_at < $2 AND c.activo=TRUE
        ${regla.antes_de_operar ? 'AND cv.visto_at < COALESCE((SELECT MIN(fecha) FROM operaciones WHERE usuario_id=$1), $2)' : ''}`);
      const total = regla.tipo === 'todos_conceptos'
        ? Number((await client.query('SELECT COUNT(*) AS cnt FROM conceptos WHERE activo=TRUE')).rows[0].cnt) : regla.cantidad;
      return avance(cnt, total);
    }
    case 'consistencia_semanal': {
      const cnt = await contar(`SELECT COUNT(DISTINCT DATE_TRUNC('week', dia::timestamp)) AS cnt
        FROM actividad_desafios WHERE usuario_id=$1 AND dia >= $3::date AND dia < ($2::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 1`,
      [usuarioId, corte, d.fecha_inicio]);
      return avance(cnt, regla.semanas);
    }
    case 'manual': return { ...avance(0, 1), requiere_revision: true };
    default: break;
  }
  // No atribuir al pasado una composición de cartera observada hoy.
  if (!d.en_plazo) return { ...avance(0, 1), requiere_revision: true };
  if (regla.tipo === 'superar_promedio_escuela') {
    const { rows } = await client.query(`SELECT c.patrimonio_total AS capital_actual,
      (SELECT AVG(c2.patrimonio_total) FROM v_carteras_valorizadas c2 JOIN usuarios u2 ON u2.id=c2.usuario_id
       WHERE u2.escuela_id=u.escuela_id AND u2.rol='alumno' AND u2.activo=TRUE
       AND c2.temporada_id IS NOT DISTINCT FROM c.temporada_id) AS promedio
      FROM v_carteras_valorizadas c JOIN usuarios u ON u.id=c.usuario_id WHERE c.usuario_id=$1`, [usuarioId]);
    return avance(rows[0]?.promedio != null && Number(rows[0].capital_actual) > Number(rows[0].promedio) ? 1 : 0, 1);
  }
  const { rows } = await client.query(`SELECT a.id, a.tipo, a.sector, p.cantidad * a.precio AS valor
    FROM posiciones p JOIN carteras c ON c.id=p.cartera_id JOIN activos a ON a.id=p.activo_id
    WHERE c.usuario_id=$1 AND p.cantidad>0`, [usuarioId]);
  switch (regla.tipo) {
    case 'diversificacion_activos': return avance(new Set(rows.map(r => r.id)).size, regla.cantidad);
    case 'diversificacion_sectores': return avance(new Set(rows.map(r => r.sector).filter(Boolean)).size, regla.cantidad);
    case 'cedear_en_cartera':
    case 'cedears_en_cartera': return avance(new Set(rows.filter(r => r.tipo === 'cedear').map(r => r.id)).size, regla.cantidad);
    case 'inversor_completo': return avance(new Set(rows.map(r => r.tipo)).size, 4);
    case 'renta_fija_pct': {
      const total = rows.reduce((s, r) => s + Number(r.valor), 0);
      const fija = rows.filter(r => ['bono', 'letra'].includes(r.tipo)).reduce((s, r) => s + Number(r.valor), 0);
      // Comparar sin redondear: 19,6% no cumple un objetivo del 20%.
      return avance(total > 0 ? fija / total * 100 : 0, regla.pct_minimo);
    }
    default: throw new Error(`Regla no implementada: ${regla.tipo}`);
  }
}
async function guardar(client, usuarioId, d, validacion, docente = null, observacion = null) {
  const completado = validacion.completado;
  const pct = completado ? 100 : validacion.objetivo > 0 ? Math.min(100, validacion.progreso / validacion.objetivo * 100) : 0;
  // El conflicto bloquea la fila: completado es irreversible y el premio es una instantánea,
  // no un incremento. Dos pestañas o reintentos nunca duplican el puntaje.
  const { rows } = await client.query(`INSERT INTO desafios_progreso
    (desafio_id, usuario_id, completado, progreso_actual, progreso_objetivo, progreso_pct,
     fecha_completado, completado_at, puntos_otorgados, validado_por, observacion_docente)
    VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $3 THEN NOW() END,CASE WHEN $3 THEN NOW() END,
      CASE WHEN $3 THEN $7::integer ELSE NULL END,$8,$9)
    ON CONFLICT (usuario_id, desafio_id) DO UPDATE SET
      completado=desafios_progreso.completado OR EXCLUDED.completado,
      progreso_actual=CASE WHEN desafios_progreso.completado THEN desafios_progreso.progreso_actual ELSE EXCLUDED.progreso_actual END,
      progreso_objetivo=CASE WHEN desafios_progreso.completado THEN desafios_progreso.progreso_objetivo ELSE EXCLUDED.progreso_objetivo END,
      progreso_pct=CASE WHEN desafios_progreso.completado THEN 100 ELSE EXCLUDED.progreso_pct END,
      fecha_completado=COALESCE(desafios_progreso.fecha_completado, EXCLUDED.fecha_completado),
      completado_at=COALESCE(desafios_progreso.completado_at, EXCLUDED.completado_at),
      puntos_otorgados=COALESCE(desafios_progreso.puntos_otorgados, EXCLUDED.puntos_otorgados),
      validado_por=COALESCE(desafios_progreso.validado_por, EXCLUDED.validado_por),
      observacion_docente=COALESCE(desafios_progreso.observacion_docente, EXCLUDED.observacion_docente)
    RETURNING *`, [d.id, usuarioId, completado, validacion.progreso, validacion.objetivo, pct, d.puntos_bonus, docente, observacion]);
  return rows[0];
}
async function sincronizarEnTransaccion(client, usuarioId, registrarActividad = false) {
  // Serializar lecturas/reconciliaciones del mismo alumno, incluso con varias pestañas.
  await client.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [usuarioId]);
  if (registrarActividad) await client.query(`INSERT INTO actividad_desafios(usuario_id,dia) VALUES ($1,${HOY}) ON CONFLICT DO NOTHING`, [usuarioId]);
  const { rows: desafios } = await client.query(`SELECT d.*,
      d.fecha_fin >= ${HOY} AS en_plazo,
      LEAST(NOW() + INTERVAL '1 millisecond', ((d.fecha_fin+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')) AS fecha_corte
    FROM desafios d JOIN usuarios u ON u.id=$1
    WHERE (d.activo=TRUE OR EXISTS (SELECT 1 FROM desafios_progreso p WHERE p.desafio_id=d.id AND p.usuario_id=$1 AND p.completado))
      AND d.fecha_inicio <= ${HOY}
      AND (d.escuela_id IS NULL OR d.escuela_id=u.escuela_id)
      AND (d.temporada_id IS NULL OR EXISTS (SELECT 1 FROM carteras c WHERE c.usuario_id=$1 AND c.temporada_id=d.temporada_id)
        OR EXISTS (SELECT 1 FROM desafios_progreso p WHERE p.desafio_id=d.id AND p.usuario_id=$1 AND p.completado))
    ORDER BY d.fecha_fin DESC, d.id`, [usuarioId]);
  const previos = new Map((await client.query('SELECT * FROM desafios_progreso WHERE usuario_id=$1',[usuarioId])).rows.map(p => [p.desafio_id,p]));
  const resultado = [];
  for (const d of desafios) {
    const anterior = previos.get(d.id);
    let regla, validacion, error_regla;
    try { regla = await resolverAsignada(client,d); } catch (err) { error_regla = err.message; }
    if (anterior?.completado) {
      resultado.push({ ...d, ...anterior, id: d.id, requiere_revision: false, error_regla });
      continue;
    }
    if (error_regla) validacion = { ...avance(0, 1), requiere_revision: true };
    else {
      if (d.regla_json == null) await client.query('UPDATE desafios SET regla_json=$2 WHERE id=$1 AND regla_json IS NULL', [d.id, regla]);
      validacion = await evaluar(client, usuarioId, regla, d);
    }
    const sinCambios = anterior && !validacion.completado &&
      Number(anterior.progreso_actual) === validacion.progreso && Number(anterior.progreso_objetivo) === validacion.objetivo;
    const progreso = sinCambios ? anterior : await guardar(client, usuarioId, d, validacion);
    resultado.push({ ...d, ...progreso, id: d.id, regla_json: regla || d.regla_json,
      requiere_revision: Boolean(validacion.requiere_revision), error_regla });
  }
  return resultado;
}
async function sincronizar(usuarioId, registrarActividad = false) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const resultado = await sincronizarEnTransaccion(client, usuarioId, registrarActividad);
    await client.query('COMMIT');
    return resultado;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
function resumir(desafios) {
  const completados = desafios.filter(d => d.completado);
  return { total: desafios.length, completados: completados.length,
    porcentaje: desafios.length ? Math.round(completados.length / desafios.length * 100) : 0,
    puntos: completados.reduce((s, d) => s + Number(d.puntos_otorgados || 0), 0) };
}
module.exports = { sincronizar, sincronizarEnTransaccion, evaluar, guardar, resumir, HOY };
