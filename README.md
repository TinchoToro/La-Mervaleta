# La Mervaleta – Liga Escolar de Inversión 🏦

Plataforma educativa de inversión simulada para estudiantes de secundaria.
Desarrollada para enseñar educación financiera de forma práctica y gamificada.

---

## Estructura del proyecto

```
mervaleta/
├── backend/
│   ├── config/
│   │   ├── db.js            → Pool de conexión PostgreSQL
│   │   └── schema.sql       → Tablas, vistas, datos iniciales
│   ├── controllers/
│   │   ├── authController.js         → Register / Login / Me
│   │   ├── carteraController.js      → Estado de cartera y activos
│   │   ├── operacionesController.js  → Comprar / Vender (con transacciones)
│   │   ├── rankingController.js      → Rankings alumnos y escuelas
│   │   └── conceptosController.js    → Módulo educativo (novedad)
│   ├── middleware/
│   │   └── auth.js          → verificarToken + soloRol()
│   ├── routes/
│   │   ├── auth.js
│   │   ├── escuelas.js
│   │   ├── cartera.js
│   │   ├── operaciones.js
│   │   ├── ranking.js
│   │   ├── desafios.js
│   │   └── conceptos.js
│   ├── .env.example
│   ├── package.json
│   └── server.js            → Entry point Express
│
└── frontend/
    ├── hooks/
    │   └── useAuth.js       → Context de autenticación
    ├── pages/
    │   ├── _app.jsx
    │   ├── login.jsx
    │   ├── conceptos.jsx    → Módulo educativo
    │   └── (dashboard, cartera, ranking, desafios, admin → a crear)
    ├── services/
    │   └── api.js           → Cliente HTTP completo
    ├── styles/
    │   └── globals.css
    └── package.json
```

---

## Setup rápido (10 minutos)

### 1. Prerrequisitos
- Node.js 18+
- PostgreSQL 14+

### 2. Base de datos
```bash
createdb mervaleta
psql mervaleta -f backend/config/schema.sql
```

### 3. Backend
```bash
cd backend
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET
npm install
npm run dev
# → Corre en http://localhost:4000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# → Corre en http://localhost:3000
```

---

## API Reference

### Auth
| Método | Endpoint             | Descripción              | Auth |
|--------|----------------------|--------------------------|------|
| POST   | /api/auth/register   | Registrar usuario        | No   |
| POST   | /api/auth/login      | Iniciar sesión           | No   |
| GET    | /api/auth/me         | Perfil del usuario       | Sí   |

### Cartera y mercado
| Método | Endpoint             | Descripción              | Rol     |
|--------|----------------------|--------------------------|---------|
| GET    | /api/cartera         | Mi cartera completa      | alumno  |
| GET    | /api/cartera/activos | Activos disponibles      | todos   |
| POST   | /api/comprar         | Comprar acciones         | alumno  |
| POST   | /api/vender          | Vender acciones          | alumno  |
| GET    | /api/operaciones     | Historial de operaciones | alumno  |

### Ranking
| Método | Endpoint                  | Descripción              |
|--------|---------------------------|--------------------------|
| GET    | /api/ranking              | Top alumnos              |
| GET    | /api/ranking-escuelas     | Ranking por escuela      |
| GET    | /api/ranking/mi-posicion  | Mi posición actual       |

### Módulo educativo (conceptos)
| Método | Endpoint                  | Descripción                      |
|--------|---------------------------|----------------------------------|
| GET    | /api/conceptos            | Todos los conceptos + estado     |
| GET    | /api/conceptos/pendientes | Conceptos sin leer               |
| POST   | /api/conceptos/:id/ver    | Marcar como leído (desbloquea activo) |

### Desafíos
| Método | Endpoint              | Descripción              |
|--------|-----------------------|--------------------------|
| GET    | /api/desafios         | Todos los desafíos       |
| GET    | /api/desafios/actual  | Desafío activo esta semana |
| POST   | /api/desafios         | Crear desafío (admin/docente) |

### Escuelas
| Método | Endpoint        | Descripción         |
|--------|-----------------|---------------------|
| GET    | /api/escuelas   | Listar escuelas     |
| POST   | /api/escuelas   | Crear escuela (admin) |

---

## Decisiones de diseño

### Módulo de conceptos (novedad pedagógica)
Un alumno **no puede operar un activo** si no leyó el concepto educativo
relacionado. Por ejemplo: para comprar YPFD primero debe leer "¿Qué es YPF
y por qué importa?". Esto convierte la plataforma en una herramienta
pedagógica real, no solo un juego.

### Transacciones SQL en operaciones
Las compras y ventas usan `BEGIN/COMMIT/ROLLBACK` para garantizar
consistencia: si algo falla a mitad, el capital y las posiciones no quedan
en estado inválido.

### Fórmula de rendimiento
```
rendimiento = (capital_actual - capital_inicial) / capital_inicial × 100
```
Calculada directamente en PostgreSQL mediante vistas (`v_ranking_alumnos`,
`v_ranking_escuelas`), evitando lógica duplicada en el backend.

### Roles y permisos
```
alumno  → puede operar su propia cartera
docente → puede ver alumnos de su escuela, crear desafíos
escuela → vista institucional
admin   → acceso total
```

---

## MVP mínimo viable (para la primera semana con alumnos)

Solo necesitás tener funcionando:
1. `POST /auth/register` y `POST /auth/login`
2. `GET /cartera` y `GET /cartera/activos`
3. `POST /comprar` y `POST /vender`
4. `GET /ranking`

Con eso podés correr la primera competencia.

---

## Roadmap sugerido (después del MVP)

- [ ] Actualización de precios en tiempo real (WebSockets o polling)
- [ ] Integración con API de precios reales (Byma, IOL, Nasdaq)
- [ ] Notificaciones al docente cuando un alumno pierde más del 10%
- [ ] Panel de análisis por sector para el docente
- [ ] Exportación del historial a PDF para evaluación
- [ ] Modo "torneo": fecha de inicio y fin configurables por escuela

---

## Tecnologías

| Capa       | Stack                        |
|------------|------------------------------|
| Frontend   | Next.js 14 + TailwindCSS     |
| Backend    | Node.js + Express            |
| Base datos | PostgreSQL 14                |
| Auth       | JWT (7 días de expiración)   |

---

Desarrollado con fines educativos · Puerto Madryn, Patagonia 🐳
