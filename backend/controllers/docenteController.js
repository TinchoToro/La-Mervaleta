// controllers/docenteController.js – Panel del docente
const db = require('../config/db');

// GET /api/docente/alumnos
// Lista todos los alumnos de la escuela del docente con métricas pedagógicas
const listarAlumnos = async (req, res) => {
  try {
    const escuela_id = req.usuario.escuela_id || null;

    const { rows } = await db.query(
      `SELECT
         u.id,
         u.nombre,
         u.apellido,
         u.email,
         u.anio_cursada,
         u.ultima_actividad,
         c.capital_inicial,
         c.capital_actual,
         ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct,
         -- Días sin actividad
         CASE
           WHEN u.ultima_actividad IS NULL THEN 999
           ELSE EXTRACT(DAY FROM NOW() - u.ultima_actividad)::INTEGER
         END AS dias_sin_actividad,
         -- Cantidad de operaciones
         (SELECT COUNT(*) FROM operaciones o WHERE o.usuario_id = u.id) AS total_operaciones,
         -- Conceptos leídos
         (SELECT COUNT(*) FROM conceptos_vistos cv WHERE cv.usuario_id = u.id) AS conceptos_leidos,
         (SELECT COUNT(*) FROM conceptos WHERE activo = TRUE) AS conceptos_total,
         -- Posiciones abiertas
         (SELECT COUNT(*) FROM posiciones p JOIN carteras c2 ON c2.id = p.cartera_id WHERE c2.usuario_id = u.id) AS posiciones_abiertas,
         -- Concentración máxima en un activo (% del capital en acciones)
         COALESCE((
           SELECT ROUND(MAX(p.cantidad * a.precio) / NULLIF(c.capital_actual, 0) * 100, 1)
           FROM posiciones p
           JOIN carteras c2 ON c2.id = p.cartera_id
           JOIN activos a ON a.id = p.activo_id
           WHERE c2.usuario_id = u.id
         ), 0) AS concentracion_max_pct
       FROM usuarios u
       JOIN carteras c ON c.usuario_id = u.id
       WHERE ($1::uuid IS NULL OR u.escuela_id = $1) AND u.rol = 'alumno' AND u.activo = TRUE
       ORDER BY c.capital_actual DESC`,
      [escuela_id]
    );

    // Agregar alertas pedagógicas
    const alumnos = rows.map((a) => {
      const alertas = [];

      if (a.dias_sin_actividad >= 4 && a.dias_sin_actividad < 999) {
        alertas.push({ tipo: 'inactividad', msg: `Sin actividad hace ${a.dias_sin_actividad} días` });
      } else if (a.dias_sin_actividad === 999) {
        alertas.push({ tipo: 'inactividad', msg: 'Nunca ingresó a la plataforma' });
      }

      if (Number(a.concentracion_max_pct) > 60) {
        alertas.push({ tipo: 'concentracion', msg: `${a.concentracion_max_pct}% del capital en un solo activo` });
      }

      if (Number(a.rendimiento_pct) < -15) {
        alertas.push({ tipo: 'perdida', msg: `Pérdida acumulada de ${Math.abs(a.rendimiento_pct)}%` });
      }

      const pctConceptos = a.conceptos_total > 0
        ? Math.round((a.conceptos_leidos / a.conceptos_total) * 100)
        : 0;

      if (pctConceptos < 30 && a.total_operaciones > 3) {
        alertas.push({ tipo: 'conceptos', msg: 'Opera mucho pero leyó pocos conceptos' });
      }

      return { ...a, alertas, pct_conceptos: pctConceptos };
    });

    res.json(alumnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
};

// GET /api/docente/alumnos/:id
// Detalle de un alumno: cartera, historial, conceptos
const detalleAlumno = async (req, res) => {
  try {
    const { id } = req.params;
    const escuela_id = req.usuario.escuela_id || null;

    // Verificar que el alumno pertenece a la escuela del docente (o ver todos si no tiene escuela)
    const { rows: alumnoRows } = await db.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.anio_cursada, u.ultima_actividad,
              c.capital_inicial, c.capital_actual,
              ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct
       FROM usuarios u JOIN carteras c ON c.usuario_id = u.id
       WHERE u.id = $1 AND ($2::uuid IS NULL OR u.escuela_id = $2) AND u.rol = 'alumno'`,
      [id, escuela_id]
    );
    if (alumnoRows.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });

    const alumno = alumnoRows[0];

    // Posiciones
    const { rows: posiciones } = await db.query(
      `SELECT p.cantidad, p.precio_promedio,
              a.ticker, a.nombre AS activo_nombre, a.sector, a.tipo, a.precio AS precio_actual,
              ROUND(((a.precio - p.precio_promedio) / p.precio_promedio) * 100, 2) AS ganancia_pct,
              (p.cantidad * a.precio) AS valor_actual
       FROM posiciones p
       JOIN carteras c ON c.id = p.cartera_id
       JOIN activos a ON a.id = p.activo_id
       WHERE c.usuario_id = $1
       ORDER BY valor_actual DESC`,
      [id]
    );

    // Últimas 20 operaciones
    const { rows: operaciones } = await db.query(
      `SELECT o.tipo, o.cantidad, o.precio, o.total, o.fecha, a.ticker
       FROM operaciones o JOIN activos a ON a.id = o.activo_id
       WHERE o.usuario_id = $1 ORDER BY o.fecha DESC LIMIT 20`,
      [id]
    );

    // Conceptos con estado
    const { rows: conceptos } = await db.query(
      `SELECT c.titulo, c.nivel, c.ticker_rel,
              CASE WHEN cv.usuario_id IS NOT NULL THEN TRUE ELSE FALSE END AS visto,
              cv.visto_at
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
// Métricas generales de la escuela para el panel principal
const resumenEscuela = async (req, res) => {
  try {
    const escuela_id = req.usuario.escuela_id || null;

    const { rows } = await db.query(
      `SELECT
         COUNT(u.id) AS total_alumnos,
         COUNT(CASE WHEN u.ultima_actividad > NOW() - INTERVAL '7 days' THEN 1 END) AS activos_semana,
         ROUND(AVG(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100), 2) AS rendimiento_promedio,
         COUNT(CASE WHEN ((c.capital_actual - c.capital_inicial) / c.capital_inicial) > 0 THEN 1 END) AS alumnos_positivos,
         COUNT(CASE WHEN ((c.capital_actual - c.capital_inicial) / c.capital_inicial) < -0.15 THEN 1 END) AS alumnos_perdida_alta,
         (SELECT COUNT(*) FROM operaciones o JOIN usuarios u2 ON u2.id = o.usuario_id
          WHERE ($1::uuid IS NULL OR u2.escuela_id = $1) AND o.fecha > NOW() - INTERVAL '7 days') AS operaciones_semana
       FROM usuarios u
       JOIN carteras c ON c.usuario_id = u.id
       WHERE ($1::uuid IS NULL OR u.escuela_id = $1) AND u.rol = 'alumno' AND u.activo = TRUE`,
      [escuela_id]
    );

    // Distribución por año
    const { rows: porAnio } = await db.query(
      `SELECT u.anio_cursada, COUNT(*) AS cantidad,
              ROUND(AVG(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100), 2) AS rendimiento_promedio
       FROM usuarios u JOIN carteras c ON c.usuario_id = u.id
       WHERE ($1::uuid IS NULL OR u.escuela_id = $1) AND u.rol = 'alumno' AND u.activo = TRUE
       GROUP BY u.anio_cursada ORDER BY u.anio_cursada`,
      [escuela_id]
    );

    // Top 5 activos más operados en la escuela
    const { rows: topActivos } = await db.query(
      `SELECT a.ticker, a.nombre, COUNT(*) AS operaciones, SUM(o.total) AS volumen
       FROM operaciones o
       JOIN usuarios u ON u.id = o.usuario_id
       JOIN activos a ON a.id = o.activo_id
       WHERE ($1::uuid IS NULL OR u.escuela_id = $1)
       GROUP BY a.ticker, a.nombre ORDER BY operaciones DESC LIMIT 5`,
      [escuela_id]
    );

    res.json({ ...rows[0], por_anio: porAnio, top_activos: topActivos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

module.exports = { listarAlumnos, detalleAlumno, resumenEscuela };
