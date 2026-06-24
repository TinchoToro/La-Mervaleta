// controllers/docenteController.js – Panel del docente
const db = require('../config/db');

// GET /api/docente/alumnos
const listarAlumnos = async (req, res) => {
  try {
    const escuela_id = req.usuario.escuela_id;
    if (!escuela_id) return res.status(400).json({ error: 'El docente no tiene escuela asignada' });

    const { rows } = await db.query(
      `SELECT
         u.id, u.nombre, u.apellido, u.email, u.anio_cursada, u.ultima_actividad,
         c.capital_inicial, c.capital_actual,
         ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct,
         CASE WHEN u.ultima_actividad IS NULL THEN 999
              ELSE EXTRACT(DAY FROM NOW() - u.ultima_actividad)::INTEGER END AS dias_sin_actividad,
         (SELECT COUNT(*) FROM operaciones o WHERE o.usuario_id = u.id) AS total_operaciones,
         (SELECT COUNT(*) FROM conceptos_vistos cv WHERE cv.usuario_id = u.id) AS conceptos_leidos,
         (SELECT COUNT(*) FROM conceptos WHERE activo = TRUE) AS conceptos_total,
         (SELECT COUNT(*) FROM posiciones p JOIN carteras c2 ON c2.id = p.cartera_id WHERE c2.usuario_id = u.id) AS posiciones_abiertas,
         COALESCE((
           SELECT ROUND(MAX(p.cantidad * a.precio) / NULLIF(c.capital_actual, 0) * 100, 1)
           FROM posiciones p JOIN carteras c2 ON c2.id = p.cartera_id JOIN activos a ON a.id = p.activo_id
           WHERE c2.usuario_id = u.id
         ), 0) AS concentracion_max_pct
       FROM usuarios u
       JOIN carteras c ON c.usuario_id = u.id
       WHERE u.escuela_id = $1 AND u.rol = 'alumno' AND u.activo = TRUE
       ORDER BY c.capital_actual DESC`,
      [escuela_id]
    );

    const alumnos = rows.map((a) => {
      const alertas = [];
      if (a.dias_sin_actividad >= 4 && a.dias_sin_actividad < 999)
        alertas.push({ tipo: 'inactividad', msg: `Sin actividad hace ${a.dias_sin_actividad} días` });
      else if (a.dias_sin_actividad === 999)
        alertas.push({ tipo: 'inactividad', msg: 'Nunca ingresó a la plataforma' });
      if (Number(a.concentracion_max_pct) > 60)
        alertas.push({ tipo: 'concentracion', msg: `${a.concentracion_max_pct}% del capital en un solo activo` });
      if (Number(a.rendimiento_pct) < -15)
        alertas.push({ tipo: 'perdida', msg: `Pérdida acumulada de ${Math.abs(a.rendimiento_pct)}%` });
      const pctConceptos = a.conceptos_total > 0 ? Math.round((a.conceptos_leidos / a.conceptos_total) * 100) : 0;
      if (pctConceptos < 30 && a.total_operaciones > 3)
        alertas.push({ tipo: 'conceptos', msg: 'Opera mucho pero leyó pocos conceptos' });
      return { ...a, alertas, pct_conceptos: pctConceptos };
    });

    res.json(alumnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
};

// GET /api/docente/alumnos/:id
const detalleAlumno = async (req, res) => {
  try {
    const { id } = req.params;
    const escuela_id = req.usuario.escuela_id;

    const { rows: alumnoRows } = await db.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.anio_cursada, u.ultima_actividad,
              c.capital_inicial, c.capital_actual,
              ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct
       FROM usuarios u JOIN carteras c ON c.usuario_id = u.id
       WHERE u.id = $1 AND u.escuela_id = $2 AND u.rol = 'alumno'`,
      [id, escuela_id]
    );
    if (alumnoRows.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });

    const alumno = alumnoRows[0];

    const { rows: posiciones } = await db.query(
      `SELECT p.cantidad, p.precio_promedio,
              a.ticker, a.nombre AS activo_nombre, a.sector, a.tipo, a.precio AS precio_actual,
              ROUND(((a.precio - p.precio_promedio) / p.precio_promedio) * 100, 2) AS ganancia_pct,
              (p.cantidad * a.precio) AS valor_actual
       FROM posiciones p JOIN carteras c ON c.id = p.cartera_id JOIN activos a ON a.id = p.activo_id
       WHERE c.usuario_id = $1 ORDER BY valor_actual DESC`,
      [id]
    );

    const { rows: operaciones } = await db.query(
      `SELECT o.tipo, o.cantidad, o.precio, o.total, o.fecha, a.ticker
       FROM operaciones o JOIN activos a ON a.id = o.activo_id
       WHERE o.usuario_id = $1 ORDER BY o.fecha DESC LIMIT 20`,
      [id]
    );

    const { rows: conceptos } = await db.query(
      `SELECT c.titulo, c.nivel, c.ticker_rel,
              CASE WHEN cv.usuario_id IS NOT NULL THEN TRUE ELSE FALSE END AS visto, cv.visto_at
       FROM conceptos c
       LEFT JOIN conceptos_vistos cv ON cv.concepto_id = c.id AND cv.usuario_id = $1
       WHERE c.activo = TRUE ORDER BY c.orden`,
      [id]
    );

    res.json({ alumno, posiciones, operaciones, conceptos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalle del alumno' });
  }
};

// GET /api/docente/resumen
const resumenEscuela = async (req, res) => {
  try {
    const escuela_id = req.usuario.escuela_id;
    if (!escuela_id) return res.status(400).json({ error: 'Sin escuela asignada' });

    const { rows } = await db.query(
      `SELECT
         COUNT(u.id) AS total_alumnos,
         COUNT(CASE WHEN u.ultima_actividad > NOW() - INTERVAL '7 days' THEN 1 END) AS activos_semana,
         ROUND(AVG(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100), 2) AS rendimiento_promedio,
         COUNT(CASE WHEN ((c.capital_actual - c.capital_inicial) / c.capital_inicial) > 0 THEN 1 END) AS alumnos_positivos,
         COUNT(CASE WHEN ((c.capital_actual - c.capital_inicial) / c.capital_inicial) < -0.15 THEN 1 END) AS alumnos_perdida_alta,
         (SELECT COUNT(*) FROM operaciones o JOIN usuarios u2 ON u2.id = o.usuario_id
          WHERE u2.escuela_id = $1 AND o.fecha > NOW() - INTERVAL '7 days') AS operaciones_semana
       FROM usuarios u JOIN carteras c ON c.usuario_id = u.id
       WHERE u.escuela_id = $1 AND u.rol = 'alumno' AND u.activo = TRUE`,
      [escuela_id]
    );

    const { rows: porAnio } = await db.query(
      `SELECT u.anio_cursada, COUNT(*) AS cantidad,
              ROUND(AVG(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100), 2) AS rendimiento_promedio
       FROM usuarios u JOIN carteras c ON c.usuario_id = u.id
       WHERE u.escuela_id = $1 AND u.rol = 'alumno' AND u.activo = TRUE
       GROUP BY u.anio_cursada ORDER BY u.anio_cursada`,
      [escuela_id]
    );

    const { rows: topActivos } = await db.query(
      `SELECT a.ticker, a.nombre, COUNT(*) AS operaciones, SUM(o.total) AS volumen
       FROM operaciones o JOIN usuarios u ON u.id = o.usuario_id JOIN activos a ON a.id = o.activo_id
       WHERE u.escuela_id = $1
       GROUP BY a.ticker, a.nombre ORDER BY operaciones DESC LIMIT 5`,
      [escuela_id]
    );

    res.json({ ...rows[0], por_anio: porAnio, top_activos: topActivos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

// DELETE /api/docente/alumnos/:id
const eliminarAlumno = async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const escuela_id = req.usuario.escuela_id;

    const { rows } = await client.query(
      `SELECT u.id FROM usuarios u
       WHERE u.id = $1 AND u.escuela_id = $2 AND u.rol = 'alumno'`,
      [id, escuela_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Alumno no encontrado en tu escuela' });

    await client.query('BEGIN');

    await client.query(`DELETE FROM conceptos_vistos WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM desafios_progreso WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM operaciones WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM posiciones WHERE cartera_id IN (SELECT id FROM carteras WHERE usuario_id = $1)`, [id]);
    await client.query(`DELETE FROM historial_capital WHERE cartera_id IN (SELECT id FROM carteras WHERE usuario_id = $1)`, [id]);
    await client.query(`DELETE FROM carteras WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM usuarios WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ ok: true, mensaje: 'Alumno eliminado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar alumno' });
  } finally {
    client.release();
  }
};

module.exports = { listarAlumnos, detalleAlumno, resumenEscuela, eliminarAlumno };
