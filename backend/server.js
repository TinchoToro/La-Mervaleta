// ============================================================
// server.js – Punto de entrada de La Mervaleta API
// ============================================================
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const express = require('express');
const cors    = require('cors');
const authRoutes      = require('./routes/auth');
const escuelasRoutes  = require('./routes/escuelas');
const carteraRoutes   = require('./routes/cartera');
const operRoutes      = require('./routes/operaciones');
const rankingRoutes   = require('./routes/ranking');
const desafiosRoutes  = require('./routes/desafios');
const conceptosRoutes = require('./routes/conceptos');
const docenteRoutes   = require('./routes/docente');

const app = express();

app.use(helmet());
app.use(cors());
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' }
});
app.use('/api/auth/login', loginLimiter);
app.use(express.json());

// Rutas
app.use('/api/auth',      authRoutes);
app.use('/api/escuelas',  escuelasRoutes);
app.use('/api/cartera',   carteraRoutes);
app.use('/api',           operRoutes);
app.use('/api',           rankingRoutes);
app.use('/api/desafios',  desafiosRoutes);
app.use('/api/conceptos', conceptosRoutes);
app.use('/api/docente',   docenteRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/temporadas', require('./routes/temporadas'));
app.use('/api/certificado', require('./routes/certificado'));
app.use('/api/banco-desafios', require('./routes/bancoDesafios'));
app.use('/api/glosario', require('./routes/glosario'));
app.use('/api/historial', require('./routes/historial'));
app.use('/api/informe', require('./routes/informe'));
app.use('/api/trazabilidad', require('./routes/trazabilidad'));


// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'La Mervaleta' }));

// Manejo de rutas no encontradas
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Mervaleta API corriendo en puerto ${PORT}`));
