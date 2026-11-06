-- Efectivo y patrimonio son conceptos distintos. Las operaciones solo modifican el efectivo.
CREATE OR REPLACE VIEW v_carteras_valorizadas AS
SELECT c.*, COALESCE(v.valor,0) AS valor_invertido,
       c.capital_actual + COALESCE(v.valor,0) AS patrimonio_total,
       ROUND(((c.capital_actual + COALESCE(v.valor,0) - c.capital_inicial) / NULLIF(c.capital_inicial,0))*100,2) AS rendimiento_pct
FROM carteras c LEFT JOIN LATERAL (
  SELECT SUM(p.cantidad*a.precio) AS valor FROM posiciones p JOIN activos a ON a.id=p.activo_id
  WHERE p.cartera_id=c.id AND p.cantidad>0
) v ON TRUE;
CREATE OR REPLACE VIEW v_ranking_patrimonio_alumnos AS
SELECT u.id,u.nombre || ' ' || u.apellido AS nombre_completo,u.anio_cursada,e.nombre AS escuela,e.ciudad,
       c.capital_inicial,c.patrimonio_total AS capital_actual,c.rendimiento_pct,
       RANK() OVER(ORDER BY c.patrimonio_total DESC) AS posicion,u.ultima_actividad,
       c.capital_actual AS capital_disponible,
       COALESCE((SELECT SUM(p.puntos_otorgados) FROM desafios_progreso p WHERE p.usuario_id=u.id AND p.completado),0) AS puntos_desafios
FROM usuarios u JOIN v_carteras_valorizadas c ON c.usuario_id=u.id
LEFT JOIN escuelas e ON e.id=u.escuela_id WHERE u.rol='alumno' AND u.activo=TRUE;
CREATE OR REPLACE VIEW v_ranking_patrimonio_escuelas AS
SELECT e.id,e.nombre,e.ciudad,COUNT(u.id) AS total_alumnos,
       ROUND(AVG(c.rendimiento_pct),2) AS rendimiento_promedio,
       RANK() OVER(ORDER BY AVG(c.patrimonio_total) DESC) AS posicion
FROM escuelas e JOIN usuarios u ON u.escuela_id=e.id AND u.rol='alumno' AND u.activo=TRUE
JOIN v_carteras_valorizadas c ON c.usuario_id=u.id GROUP BY e.id,e.nombre,e.ciudad;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS cotizacion_at TIMESTAMPTZ;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS cotizacion_fuente TEXT;
CREATE TABLE IF NOT EXISTS historial_precios (
  activo_id UUID NOT NULL REFERENCES activos(id),
  precio NUMERIC(14,2) NOT NULL,
  variacion_dia NUMERIC(6,2),
  fecha DATE NOT NULL,
  UNIQUE(activo_id,fecha)
);
CREATE TABLE IF NOT EXISTS estado_mercado (
  id INTEGER PRIMARY KEY CHECK(id=1),
  ultimo_intento TIMESTAMPTZ,
  ultimo_exito TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'sin_configurar',
  fuente TEXT,
  actualizados INTEGER NOT NULL DEFAULT 0
);
INSERT INTO estado_mercado(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE historial_precios ADD COLUMN IF NOT EXISTS fuente TEXT;
ALTER TABLE historial_precios ADD COLUMN IF NOT EXISTS cotizacion_at TIMESTAMPTZ;
