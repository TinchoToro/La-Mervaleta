-- Campos usados por la aplicación que faltaban en config/schema.sql.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_completado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_riesgo TEXT;
ALTER TABLE conceptos_vistos ADD COLUMN IF NOT EXISTS tiempo_lectura INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conceptos_vistos ADD COLUMN IF NOT EXISTS veces_leido INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS temporadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id UUID REFERENCES escuelas(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT FALSE,
  capital_inicial NUMERIC(14,2) NOT NULL DEFAULT 1000000,
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE carteras ADD COLUMN IF NOT EXISTS temporada_id UUID REFERENCES temporadas(id);
CREATE TABLE IF NOT EXISTS banco_desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), titulo TEXT NOT NULL, descripcion TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'operacion', anio_cursada TEXT, materia TEXT NOT NULL DEFAULT 'General',
  dificultad TEXT NOT NULL DEFAULT 'medio', puntos_bonus INTEGER NOT NULL DEFAULT 300,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS glosario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), termino TEXT NOT NULL UNIQUE,
  definicion TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT 'General', ejemplo TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
