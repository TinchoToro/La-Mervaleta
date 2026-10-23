-- Compatible con el esquema inicial y con las columnas añadidas en Railway.
-- No borra lecturas, operaciones ni desafíos. Reejecutable.
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS escuela_id UUID REFERENCES escuelas(id);
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS temporada_id UUID;
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS banco_desafio_id UUID;
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS regla_json JSONB;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS progreso_actual NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS progreso_objetivo NUMERIC NOT NULL DEFAULT 1;
ALTER TABLE desafios_progreso ALTER COLUMN progreso_actual TYPE NUMERIC USING progreso_actual::numeric;
ALTER TABLE desafios_progreso ALTER COLUMN progreso_objetivo TYPE NUMERIC USING progreso_objetivo::numeric;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMPTZ;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS progreso_pct NUMERIC(5,2) DEFAULT 0;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS puntos_otorgados INTEGER;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE desafios_progreso ADD COLUMN IF NOT EXISTS observacion_docente TEXT;
UPDATE desafios_progreso SET fecha_completado = COALESCE(fecha_completado, completado_at),
  completado_at = COALESCE(completado_at, fecha_completado),
  progreso_actual = CASE WHEN completado THEN GREATEST(progreso_actual, progreso_objetivo) ELSE progreso_actual END,
  progreso_pct = CASE WHEN completado THEN 100 ELSE progreso_pct END;
UPDATE desafios_progreso p SET puntos_otorgados = d.puntos_bonus
FROM desafios d WHERE p.desafio_id = d.id AND p.completado AND p.puntos_otorgados IS NULL;
CREATE TABLE IF NOT EXISTS actividad_desafios (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dia DATE NOT NULL,
  PRIMARY KEY(usuario_id, dia)
);
INSERT INTO actividad_desafios(usuario_id, dia)
SELECT usuario_id, (visto_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date FROM conceptos_vistos
UNION SELECT usuario_id, (fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date FROM operaciones
UNION SELECT id, (ultima_actividad AT TIME ZONE 'America/Argentina/Buenos_Aires')::date FROM usuarios WHERE ultima_actividad IS NOT NULL
ON CONFLICT DO NOTHING;
DO $$ BEGIN
  IF to_regclass('banco_desafios') IS NOT NULL THEN
    ALTER TABLE banco_desafios ADD COLUMN IF NOT EXISTS regla_json JSONB;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS desafios_escuela_idx ON desafios(escuela_id, fecha_inicio, fecha_fin);
