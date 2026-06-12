// controllers/trazabilidadController.js – Métricas educativas
const db = require('../config/db');

const miProgreso = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    // Conceptos vistos con detalle
    const { rows: conceptosVistos } = await db.query(
      `SELECT cv.concepto_id, cv.tiempo_lectura, cv.veces_leido, cv.visto_at,
              c.titulo, c.nivel
       FROM conceptos_vistos cv
       JOIN conceptos c ON c.id = cv.concepto_id
       WHERE cv.usuario_id = $1
       ORDER BY cv.visto_at ASC`,
      [usuario_id]
    );

    // Total y leídos por nivel
    const { rows: porNivel } = await db.query(
      `SELECT c.nivel,
              COUNT(c.id) AS total,
              COUNT(cv.concepto_id) AS leidos
       FROM conceptos c
       LEFT JOIN conceptos_vistos cv ON cv.concepto_id = c.id AND cv.usuario_id = $1
       WHERE c.activo = TRUE
       GROUP BY c.nivel`,
      [usuario_id]
    );

    const totales_por_nivel = {};
    porNivel.forEach(r => {
      totales_por_nivel[r.nivel] = { total: parseInt(r.total), leidos: parseInt(r.leidos) };
    });

    // Operaciones con conceptos al momento
    const { rows: operaciones } = await db.query(
      `SELECT o.tipo, a.tipo AS tipo_activo, o.fecha,
              (SELECT COUNT(*) FROM conceptos_vistos cv2
               WHERE cv2.usuario_id = $1 AND cv2.visto_at <= o.fecha) AS conceptos_al_momento
       FROM operaciones o
       JOIN activos a ON a.id = o.activo_id
       WHERE o.usuario_id = $1
       ORDER BY o.fecha ASC`,
      [usuario_id]
    );

    // Nivel alcanzado
    const av = totales_por_nivel.avanzado?.leidos || 0;
    const im = totales_por_nivel.intermedio?.leidos || 0;
    const nivel_alcanzado = av >= 3 ? 'avanzado' : im >= 3 ? 'intermedio' : 'basico';

    // Tiempo total en minutos
    const tiempoSegundos = conceptosVistos.reduce((s, c) => s + (parseInt(c.tiempo_lectura) || 0), 0);
    const tiempo_total_minutos = Math.round(tiempoSegundos / 60);

    // Racha de días
    const fechas = [...new Set(conceptosVistos.map(c => c.visto_at?.toISOString().split('T')[0]))].sort().reverse();
    let racha_dias = 0;
    const hoy = new Date();
    for (let i = 0; i < fechas.length; i++) {
      const esperada = new Date(hoy);
      esperada.setDate(hoy.getDate() - i);
      if (fechas[i] === esperada.toISOString().split('T')[0]) racha_dias++;
      else break;
    }

    res.json({
      conceptos_vistos: conceptosVistos,
      totales_por_nivel,
      nivel_alcanzado,
      tiempo_total_minutos,
      racha_dias,
      correlacion_operaciones: operaciones,
      total_leidos: conceptosVistos.length,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener trazabilidad' });
  }
};

const registrarLectura = async (req, res) => {
  try {
    const { concepto_id, tiempo_segundos } = req.body;
    if (!concepto_id) return res.status(400).json({ error: 'concepto_id requerido' });

    await db.query(
      `INSERT INTO conceptos_vistos (usuario_id, concepto_id, tiempo_lectura, veces_leido)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (usuario_id, concepto_id) DO UPDATE
       SET tiempo_lectura = conceptos_vistos.tiempo_lectura + $3,
           veces_leido = conceptos_vistos.veces_leido + 1`,
      [req.usuario.id, concepto_id, tiempo_segundos || 0]
    );

    res.json({ mensaje: 'Lectura registrada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar lectura' });
  }
};

const trazabilidadAlumno = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: alumno } = await db.query(
      'SELECT nombre, apellido, anio_cursada FROM usuarios WHERE id = $1', [id]
    );
    if (alumno.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });

    const { rows: conceptos } = await db.query(
      `SELECT c.titulo, c.nivel, cv.tiempo_lectura, cv.veces_leido, cv.visto_at
       FROM conceptos_vistos cv
       JOIN conceptos c ON c.id = cv.concepto_id
       WHERE cv.usuario_id = $1
       ORDER BY cv.visto_at DESC`,
      [id]
    );

    const { rows: stats } = await db.query(
      `SELECT
         COUNT(DISTINCT cv.concepto_id) AS conceptos_leidos,
         COALESCE(SUM(cv.tiempo_lectura), 0) AS tiempo_total,
         COUNT(DISTINCT o.id) AS operaciones,
         COALESCE(AVG(cv.veces_leido), 0) AS promedio_relecturas
       FROM usuarios u
       LEFT JOIN conceptos_vistos cv ON cv.usuario_id = u.id
       LEFT JOIN operaciones o ON o.usuario_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    res.json({ alumno: alumno[0], conceptos, stats: stats[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener trazabilidad del alumno' });
  }
};

module.exports = { miProgreso, registrarLectura, trazabilidadAlumno };
