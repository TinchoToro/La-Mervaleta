// Recuperación de reglas conocidas + reevaluación de evidencia histórica por alumno.
// No se inventa a qué escuela pertenecían asignaciones antiguas sin ese dato.
require('dotenv').config();
const db = require('../config/db');
const { migrar } = require('./migrarDesafios');
const { resolverRegla, resolverAsignada } = require('../services/reglasDesafios');
const { sincronizar } = require('../services/desafios');
async function reparar() {
  await migrar(db);
  const informe = { reparados: [], revision: [], alumnos: 0 };
  for (const tabla of ['banco_desafios', 'desafios']) {
    if (!(await db.query('SELECT to_regclass($1) AS tabla', [tabla])).rows[0].tabla) continue;
    for (const d of (await db.query(`SELECT * FROM ${tabla}`)).rows) {
      try {
        const regla = tabla === 'desafios' ? await resolverAsignada(db,d) : resolverRegla(d);
        if (d.regla_json == null) {
          await db.query(`UPDATE ${tabla} SET regla_json=$2 WHERE id=$1 AND regla_json IS NULL`, [d.id, regla]);
          informe.reparados.push({ tabla, id: d.id, nombre: d.nombre || d.titulo, regla });
        }
        if (regla.tipo === 'manual') informe.revision.push({ tabla, id: d.id, nombre: d.nombre || d.titulo, motivo: 'Requiere evaluación docente' });
      } catch (err) { informe.revision.push({ tabla, id: d.id, motivo: err.message }); }
    }
  }
  for (const u of (await db.query("SELECT id FROM usuarios WHERE rol='alumno' AND activo=TRUE ORDER BY id")).rows) {
    await sincronizar(u.id);
    informe.alumnos++;
  }
  informe.asignaciones_sin_liga = (await db.query('SELECT id,nombre,escuela_id,temporada_id FROM desafios WHERE escuela_id IS NULL OR temporada_id IS NULL')).rows;
  console.log(JSON.stringify(informe, null, 2));
}
reparar().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => db.end());
