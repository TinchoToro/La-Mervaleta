const db = require('../config/db');
const { sincronizar, sincronizarEnTransaccion, guardar, resumir, HOY } = require('../services/desafios');
const { validarRegla, validarDatos } = require('../services/reglasDesafios');
const listarDesafios = async (req, res) => {
  try { res.set('Cache-Control', 'no-store'); res.json(await sincronizar(req.usuario.id, true)); }
  catch (err) { console.error(err); res.status(500).json({ error: 'No se pudo actualizar el progreso. Volvé a intentar.' }); }
};
const resumenDesafios = async (req, res) => {
  try { res.set('Cache-Control', 'no-store'); res.json(resumir(await sincronizar(req.usuario.id, true))); }
  catch (err) { console.error(err); res.status(500).json({ error: 'No se pudo obtener el puntaje' }); }
};
const desafioActual = async (req, res) => {
  try { res.json((await sincronizar(req.usuario.id, true)).find(d => d.en_plazo && !d.completado) || null); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener desafío' }); }
};
const crearDesafio = async (req, res) => {
  let regla;
  try { validarDatos(req.body); regla = validarRegla(req.body.regla_json); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  if (!req.usuario.escuela_id) return res.status(400).json({ error: 'Asigná una escuela al docente antes de crear desafíos' });
  try {
    const { nombre, descripcion, puntos_bonus = 300, fecha_inicio, fecha_fin } = req.body;
    const { rows } = await db.query(`INSERT INTO desafios (nombre,descripcion,puntos_bonus,fecha_inicio,fecha_fin,activo,regla_json,escuela_id)
      VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7) RETURNING *`,
    [nombre, descripcion, puntos_bonus, fecha_inicio, fecha_fin, regla, req.usuario.escuela_id]);
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al crear desafío' }); }
};
// Actividades abiertas: listado docente con evidencia auditable en el detalle del alumno.
const listarRevision = async (req, res) => {
  if (req.usuario.rol !== 'admin' && !req.usuario.escuela_id) return res.status(403).json({ error: 'Escuela requerida' });
  try {
    const { rows } = await db.query(`SELECT u.id, u.nombre, u.apellido FROM usuarios u
      WHERE u.rol='alumno' AND u.activo=TRUE AND ($1::boolean OR u.escuela_id=$2) ORDER BY u.apellido,u.nombre`,
    [req.usuario.rol === 'admin', req.usuario.escuela_id || null]);
    const resultado = [];
    for (const u of rows) {
      const desafios = await sincronizar(u.id);
      for (const d of desafios.filter(d => d.requiere_revision && !d.completado)) {
        resultado.push({ ...d, usuario_id: u.id, alumno: `${u.nombre} ${u.apellido}` });
      }
    }
    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al cargar revisiones' }); }
};
const aprobar = async (req, res) => {
  const { alumno_id, observacion } = req.body;
  if (!alumno_id || typeof observacion !== 'string' || !observacion.trim()) return res.status(400).json({ error: 'Indicá el alumno y la evidencia de cumplimiento' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT id FROM usuarios WHERE id=$1 AND rol='alumno'
      AND ($2::boolean OR escuela_id=$3) FOR UPDATE`, [alumno_id, req.usuario.rol === 'admin', req.usuario.escuela_id || null]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Alumno no encontrado' }); }
    const desafios = await sincronizarEnTransaccion(client, alumno_id);
    const d = desafios.find(d => d.id === req.params.id);
    if (!d || (!d.requiere_revision && !d.completado)) {
      await client.query('ROLLBACK'); return res.status(400).json({ error: 'El desafío no requiere validación docente o no está asignado a este alumno' });
    }
    const progreso = await guardar(client, alumno_id, d, { completado: true, progreso: 1, objetivo: 1 }, req.usuario.id, observacion.trim());
    await client.query('COMMIT');
    res.json(progreso);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: 'No se pudo acreditar el desafío' }); }
  finally { client.release(); }
};
module.exports = { listarDesafios, resumenDesafios, desafioActual, crearDesafio, listarRevision, aprobar };
