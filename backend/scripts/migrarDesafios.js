const fs = require('node:fs');
const path = require('node:path');
async function migrar(db) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mervaleta-desafios-migration'))");
    await client.query(`CREATE TABLE IF NOT EXISTS migraciones_desafios (nombre TEXT PRIMARY KEY, aplicado_at TIMESTAMPTZ DEFAULT NOW())`);
    for (const nombre of ['000_completar_esquema.sql', '001_desafios.sql', '002_mercado.sql']) {
      const { rows } = await client.query('SELECT nombre FROM migraciones_desafios WHERE nombre=$1', [nombre]);
      if (!rows.length) {
        await client.query(fs.readFileSync(path.join(__dirname, '../migrations', nombre), 'utf8'));
        await client.query('INSERT INTO migraciones_desafios(nombre) VALUES ($1)', [nombre]);
      }
    }
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
module.exports = { migrar };
if (require.main === module) {
  require('dotenv').config();
  const db = require('../config/db');
  migrar(db).then(() => console.log('Migración de desafíos aplicada')).catch(err => { console.error(err); process.exitCode = 1; }).finally(() => db.end());
}
