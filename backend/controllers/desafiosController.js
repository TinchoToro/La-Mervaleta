// controllers/desafiosController.js – Motor de validación automática
const db = require('../config/db');

// Motor de validación por tipo de regla
async function validarDesafio(usuario_id, regla) {
  if (!regla || !regla.tipo) return { completado: false, progreso: 0, objetivo: 1 };

  switch (regla.tipo) {

    case 'primera_compra': {
      const { rows } = await db.query(
        `SELECT COUNT(*) AS cnt FROM operaciones o
         JOIN activos a ON a.id = o.activo_id
         WHERE o.usuario_id = $1 AND o.tipo = 'compra'
         ${regla.panel_lider ? "AND a.ticker = ANY(ARRAY['GGAL','YPFD','BMA','PAMP','BBAR','TECO2','TGSU2','TXAR','CEPU','BYMA'])" : ''}`,
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= 1, progreso: Math.min(cnt, 1), objetivo: 1 };
    }

    case 'comprar_tipo': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT a.id) AS cnt FROM operaciones o
         JOIN activos a ON a.id = o.activo_id
         WHERE o.usuario_id = $1 AND o.tipo = 'compra' AND a.tipo = $2`,
        [usuario_id, regla.tipo_activo]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'operar_distintos': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT a.id) AS cnt FROM operaciones o
         JOIN activos a ON a.id = o.activo_id
         WHERE o.usuario_id = $1 AND a.tipo = $2`,
        [usuario_id, regla.tipo_activo]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'total_operaciones': {
      const { rows } = await db.query(
        'SELECT COUNT(*) AS cnt FROM operaciones WHERE usuario_id = $1',
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'diversificacion_sectores': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT a.sector) AS cnt FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0 AND a.sector IS NOT NULL`,
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'cedears_en_cartera': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT a.id) AS cnt FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0 AND a.tipo = 'cedear'`,
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'inversor_completo': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT a.tipo) AS cnt FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0`,
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= 4, progreso: cnt, objetivo: 4 };
    }

    case 'renta_fija_pct': {
      const { rows } = await db.query(
        `SELECT 
           SUM(CASE WHEN a.tipo IN ('bono','letra') THEN p.cantidad * a.precio ELSE 0 END) AS renta_fija,
           SUM(p.cantidad * a.precio) AS total
         FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0`,
        [usuario_id]
      );
      const rf = parseFloat(rows[0].renta_fija || 0);
      const total = parseFloat(rows[0].total || 1);
      const pct = total > 0 ? Math.round((rf / total) * 100) : 0;
      return { completado: pct >= regla.pct_minimo, progreso: pct, objetivo: regla.pct_minimo };
    }

    case 'sectores_especificos': {
      const sectoresReq = regla.sectores || [];
      const { rows } = await db.query(
        `SELECT DISTINCT a.sector FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0`,
        [usuario_id]
      );
      const sectoresTiene = rows.map(r => r.sector?.toLowerCase());
      const cumplidos = sectoresReq.filter(s => sectoresTiene.some(t => t?.includes(s))).length;
      return { completado: cumplidos >= sectoresReq.length, progreso: cumplidos, objetivo: sectoresReq.length };
    }

    case 'concentracion_maxima': {
      const { rows } = await db.query(
        `SELECT 
           MAX(p.cantidad * a.precio) AS max_pos,
           SUM(p.cantidad * a.precio) AS total
         FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0`,
        [usuario_id]
      );
      const maxPos = parseFloat(rows[0].max_pos || 0);
      const total = parseFloat(rows[0].total || 1);
      const pctMax = total > 0 ? Math.round((maxPos / total) * 100) : 0;
      const cumple = pctMax <= regla.pct_maximo;
      return { completado: cumple, progreso: cumple ? regla.pct_maximo : pctMax, objetivo: regla.pct_maximo };
    }

    case 'renta_fija_cantidad': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT a.id) AS cnt FROM posiciones p
         JOIN carteras c ON c.id = p.cartera_id
         JOIN activos a ON a.id = p.activo_id
         WHERE c.usuario_id = $1 AND p.cantidad > 0 AND a.tipo IN ('bono','letra')`,
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'conceptos_leidos': {
      const { rows } = await db.query(
        'SELECT COUNT(*) AS cnt FROM conceptos_vistos WHERE usuario_id = $1',
        [usuario_id]
      );
      const cnt = parseInt(rows[0].cnt);
      return { completado: cnt >= regla.cantidad, progreso: cnt, objetivo: regla.cantidad };
    }

    case 'todos_conceptos': {
      const { rows: total } = await db.query('SELECT COUNT(*) AS cnt FROM conceptos WHERE activo = TRUE');
      const { rows: leidos } = await db.query('SELECT COUNT(*) AS cnt FROM conceptos_vistos WHERE usuario_id = $1', [usuario_id]);
      const t = parseInt(total[0].cnt);
      const l = parseInt(leidos[0].cnt);
      return { completado: l >= t, progreso: l, objetivo: t };
    }

    case 'superar_promedio_escuela': {
      const { rows } = await db.query(
        `SELECT 
           c.capital_actual, c.capital_inicial,
           (SELECT AVG(c2.capital_actual) FROM carteras c2 
            JOIN usuarios u2 ON u2.id = c2.usuario_id 
            WHERE u2.escuela_id = u.escuela_id AND u2.rol = 'alumno') AS promedio_escuela
         FROM carteras c
         JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.usuario_id = $1`,
        [usuario_id]
      );
      if (!rows[0]) return { completado: false, progreso: 0, objetivo: 1 };
      const cumple = rows[0].capital_actual > rows[0].promedio_escuela;
      return { completado: cumple, progreso: cumple ? 1 : 0, objetivo: 1 };
    }

    case 'consistencia_semanal': {
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT DATE_TRUNC('week', ultima_actividad)) AS semanas
         FROM usuarios WHERE id = $1 AND ultima_actividad IS NOT NULL`,
        [usuario_id]
      );
      const semanas = parseInt(rows[0].semanas || 0);
      return { completado: semanas >= regla.semanas, progreso: semanas, objetivo: regla.semanas };
    }

    default:
      return { completado: false, progreso: 0, objetivo: 1 };
  }
}

// GET /api/desafios – desafíos activos con progreso del alumno
const listarDesafios = async (req, res) => {
  try {
    const { rows: desafios } = await db.query(
      `SELECT d.*, bd.regla_json FROM desafios d
       LEFT JOIN banco_desafios bd ON bd.titulo = d.nombre
       WHERE d.activo = TRUE AND d.fecha_fin >= NOW()
       ORDER BY d.fecha_fin ASC`
    );

    const resultado = await Promise.all(desafios.map(async d => {
      // Buscar progreso existente
      const { rows: prog } = await db.query(
        'SELECT * FROM desafios_progreso WHERE desafio_id = $1 AND usuario_id = $2',
        [d.id, req.usuario.id]
      );

      // Si ya está completado, no re-validar
      if (prog[0]?.completado) {
        return { ...d, completado: true, progreso_actual: prog[0].progreso_actual, progreso_objetivo: prog[0].progreso_objetivo, fecha_completado: prog[0].fecha_completado };
      }

      // Validar en tiempo real
      const validacion = await validarDesafio(req.usuario.id, d.regla_json);

      // Guardar/actualizar progreso
      await db.query(
        `INSERT INTO desafios_progreso (desafio_id, usuario_id, completado, progreso_actual, progreso_objetivo, fecha_completado)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (desafio_id, usuario_id) DO UPDATE
         SET completado = $3, progreso_actual = $4, progreso_objetivo = $5, fecha_completado = $6`,
        [d.id, req.usuario.id, validacion.completado, validacion.progreso, validacion.objetivo,
         validacion.completado ? new Date() : null]
      );

      return { ...d, completado: validacion.completado, progreso_actual: validacion.progreso, progreso_objetivo: validacion.objetivo };
    }));

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener desafíos' });
  }
};

// GET /api/desafios/actual – desafío activo actual
const desafioActual = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM desafios WHERE activo = TRUE AND fecha_fin >= NOW() ORDER BY fecha_fin ASC LIMIT 1`
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener desafío' });
  }
};

// POST /api/desafios – crear desafío
const crearDesafio = async (req, res) => {
  try {
    const { nombre, descripcion, puntos_bonus, fecha_inicio, fecha_fin } = req.body;
    const { rows } = await db.query(
      `INSERT INTO desafios (nombre, descripcion, puntos_bonus, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [nombre, descripcion, puntos_bonus || 300, fecha_inicio, fecha_fin]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear desafío' });
  }
};

module.exports = { listarDesafios, desafioActual, crearDesafio };
