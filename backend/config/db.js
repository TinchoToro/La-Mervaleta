// config/db.js – Pool de conexión a PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En producción, activar SSL:
  // ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => console.log('✅ Conectado a PostgreSQL'));
pool.on('error',   (err) => console.error('❌ Error en pool PostgreSQL:', err));

module.exports = pool;
