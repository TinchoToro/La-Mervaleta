# La Mervaleta – Liga Escolar de Inversión 🏦

Plataforma educativa de inversión simulada para estudiantes de secundaria.

---

## Instalación paso a paso

### Requisitos previos
- **Node.js 18+** → https://nodejs.org
- **PostgreSQL 14+** → https://www.postgresql.org/download/

---

### 1. Base de datos

Abrí una terminal y ejecutá:

```bash
createdb mervaleta
psql mervaleta -f backend/config/schema.sql
```

Si usás pgAdmin, creá una base llamada `mervaleta` y ejecutá el archivo `backend/config/schema.sql`.

---

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Editá el archivo `.env` con tus datos:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/mervaleta
JWT_SECRET=cualquier-frase-larga-y-segura-aqui-123
PORT=4000
```

Luego:

```bash
npm install
npm run dev
```

✅ El backend corre en **http://localhost:4000**

---

### 3. Frontend

Abrí **otra terminal** (dejá el backend corriendo):

```bash
cd frontend
npm install
npm run dev
```

✅ La app corre en **http://localhost:3000**

---

## Primer uso: crear tu escuela y el primer admin

Antes de que los alumnos se registren, necesitás agregar al menos una escuela a la base de datos.

Conectate a PostgreSQL y ejecutá:

```sql
-- Agregar tu escuela
INSERT INTO escuelas (nombre, ciudad, provincia)
VALUES ('Nombre de tu escuela', 'Puerto Madryn', 'Chubut');

-- Crear usuario admin (reemplazá los datos)
-- Primero registrate en http://localhost:3000 con rol "docente"
-- Luego promocioná tu usuario a admin:
UPDATE usuarios SET rol = 'admin' WHERE email = 'tu@email.com';
```

---

## Páginas disponibles

| URL | Descripción |
|-----|-------------|
| `/login` | Ingreso y registro de alumnos |
| `/dashboard` | Panel principal del alumno |
| `/mercado` | Comprar y vender acciones |
| `/cartera` | Ver posiciones e historial |
| `/ranking` | Tabla de posiciones de alumnos y escuelas |
| `/conceptos` | Módulo educativo |

---

## Flujo para tus alumnos

1. Entran a **http://localhost:3000** (o el dominio donde lo publiques)
2. Hacen clic en **Registrarse**
3. Eligen su nombre, email, contraseña y seleccionan la escuela
4. Son redirigidos al **Dashboard** con $100.000 simulados
5. Para operar un activo, primero deben leer su concepto educativo en `/conceptos`
6. Compran y venden en `/mercado`
7. Siguen el ranking en `/ranking`

---

## Actualizar precios de activos (manual)

Los precios no se actualizan en tiempo real. Para actualizarlos manualmente:

```sql
UPDATE activos SET precio = 950.00, variacion_dia = 2.5 WHERE ticker = 'GGAL';
UPDATE activos SET precio = 28000.00, variacion_dia = -1.2 WHERE ticker = 'YPFD';
-- etc.
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + TailwindCSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 14 |
| Autenticación | JWT (7 días) |

---

Desarrollado para uso educativo · Puerto Madryn, Patagonia 🐳
