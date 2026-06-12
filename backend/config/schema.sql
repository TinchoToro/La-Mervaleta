-- ============================================================
-- LA MERVALETA – Base de datos PostgreSQL
-- Ejecutar en orden. Compatible con PostgreSQL 14+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ESCUELAS
-- ============================================================
CREATE TABLE escuelas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(120) NOT NULL,
  ciudad      VARCHAR(80)  NOT NULL,
  provincia   VARCHAR(80)  NOT NULL DEFAULT 'Chubut',
  activa      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE usuarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(80)  NOT NULL,
  apellido     VARCHAR(80)  NOT NULL,
  email        VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  rol          VARCHAR(20)  NOT NULL CHECK (rol IN ('alumno','docente','escuela','admin')),
  anio_cursada VARCHAR(10),                     -- '4to', '5to', '6to', '7mo'
  escuela_id   UUID         REFERENCES escuelas(id) ON DELETE SET NULL,
  activo       BOOLEAN      NOT NULL DEFAULT TRUE,
  ultima_actividad TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_escuela ON usuarios(escuela_id);
CREATE INDEX idx_usuarios_rol     ON usuarios(rol);

-- ============================================================
-- CARTERAS
-- ============================================================
CREATE TABLE carteras (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  capital_inicial  NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
  capital_actual   NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carteras_usuario ON carteras(usuario_id);

-- ============================================================
-- ACTIVOS  (acciones, bonos, CEDEARs, letras)
-- tipo: 'accion' | 'bono' | 'cedear' | 'letra'
-- ============================================================
CREATE TABLE activos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker        VARCHAR(10)  NOT NULL UNIQUE,
  nombre        VARCHAR(120) NOT NULL,
  sector        VARCHAR(60),
  tipo          VARCHAR(20)  NOT NULL DEFAULT 'accion' CHECK (tipo IN ('accion','bono','cedear','letra')),
  descripcion   TEXT,                            -- descripción educativa del activo
  precio        NUMERIC(14,2) NOT NULL,
  variacion_dia NUMERIC(6,2) DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACCIONES del Merval
INSERT INTO activos (ticker, nombre, sector, tipo, descripcion, precio, variacion_dia) VALUES
  ('GGAL',  'Grupo Galicia',         'bancario',      'accion', 'Principal holding bancario privado de Argentina. Dueño del Banco Galicia. Muy sensible a la política monetaria del BCRA y al riesgo país. Uno de los activos más operados del Merval.', 890.00, 2.10),
  ('YPFD',  'YPF S.A.',              'energía',        'accion', 'Principal empresa petrolera de Argentina, con mayoría estatal. Su precio depende del petróleo internacional, la política energética del gobierno y el desarrollo de Vaca Muerta. Alta volatilidad.', 27500.00, 0.80),
  ('PAMP',  'Pampa Energía',         'energía',        'accion', 'Grupo energético integrado: genera, transporta y distribuye electricidad. Beneficiada por la desregulación energética. Exposición a tarifas reguladas y a la demanda industrial.', 1597.00, -1.20),
  ('BMA',   'Banco Macro',           'bancario',       'accion', 'Banco líder en el interior del país, con fuerte presencia en provincias del norte. Sólida base de depósitos y bajos índices de mora. Beneficiado por el ciclo de crédito.', 5200.00, 3.40),
  ('TXAR',  'Ternium Argentina',     'industrial',     'accion', 'Productora de acero plano, insumo clave para la construcción y la industria automotriz. Sus resultados están ligados a la actividad económica general y al tipo de cambio.', 1150.00, -0.50),
  ('ALUA',  'Aluar Aluminio',        'industrial',     'accion', 'Única productora de aluminio primario de Argentina. Exportadora neta, se beneficia de la devaluación. Insumo crítico para la industria y la construcción.', 540.00, 1.10),
  ('CEPU',  'Central Puerto',        'energía',        'accion', 'Mayor generadora eléctrica privada de Argentina. Opera centrales térmicas e hidroeléctricas. Sus ingresos dependen de las tarifas reguladas y de la demanda de energía.', 680.00, 0.30),
  ('TRAN',  'Transener',             'energía',        'accion', 'Transportadora de energía eléctrica en alta tensión. Monopolio natural regulado. Sus tarifas son fijadas por el Estado, lo que le da previsibilidad pero limita el upside.', 810.00, -0.80),
  ('SUPV',  'Grupo Supervielle',     'bancario',       'accion', 'Banco y grupo financiero orientado al segmento minorista y pymes. Mayor riesgo que los bancos grandes, pero con potencial de crecimiento en segmentos desatendidos.', 320.00, 4.20),
  ('LOMA',  'Loma Negra',            'construcción',   'accion', 'Principal productora de cemento de Argentina. Sus ventas están directamente correlacionadas con la actividad de la construcción. Termómetro de la obra pública y privada.', 1240.00, 1.70);

-- CEDEARs (Certificados de Depósito Argentinos)
INSERT INTO activos (ticker, nombre, sector, tipo, descripcion, precio, variacion_dia) VALUES
  ('AAPL',  'Apple Inc. (CEDEAR)',   'tecnología',     'cedear', 'Gigante tecnológica global: iPhone, Mac, servicios digitales. El CEDEAR cotiza en pesos pero replica el precio en dólares de la acción en NASDAQ. Ideal para dolarizar parte de la cartera.', 18500.00, 0.50),
  ('GOOGL', 'Alphabet (CEDEAR)',     'tecnología',     'cedear', 'Holding dueño de Google, YouTube y Android. Lidera el mercado de publicidad digital y la nube (Google Cloud). El CEDEAR permite exposición al sector tech global desde Argentina.', 21000.00, -0.30),
  ('TSLA',  'Tesla Inc. (CEDEAR)',   'tecnología',     'cedear', 'Fabricante de vehículos eléctricos y líder en almacenamiento de energía. Alta volatilidad. Muy sensible a noticias sobre Elon Musk y la adopción de autos eléctricos en el mundo.', 14200.00, 1.80);

-- BONOS soberanos argentinos
INSERT INTO activos (ticker, nombre, sector, tipo, descripcion, precio, variacion_dia) VALUES
  ('AL30',  'Bono Soberano AL30',    'renta fija',     'bono',   'Bono soberano argentino denominado en dólares, con vencimiento en 2030. Paga cupones semestrales. Su precio refleja el riesgo país: sube cuando mejora la percepción de Argentina y baja en crisis.', 6200.00, 0.60),
  ('GD35',  'Bono Global GD35',      'renta fija',     'bono',   'Bono soberano ley extranjera con vencimiento en 2035. Emitido bajo jurisdicción de Nueva York, lo que le da más protección jurídica al inversor. Referencia clave del mercado de deuda argentina.', 5800.00, -0.40);

-- LETRAS del Tesoro
INSERT INTO activos (ticker, nombre, sector, tipo, descripcion, precio, variacion_dia) VALUES
  ('LECAP', 'LECAP – Letra Capitalizable', 'renta fija', 'letra', 'Instrumento de corto plazo emitido por el Tesoro Nacional. Capitaliza intereses a una Tasa Nominal Anual (TNA) fija. Alternativa de renta fija en pesos para horizontes de 30 a 180 días. Muy usado por ahorristas conservadores.', 1000.00, 0.10);

-- ============================================================
-- POSICIONES
-- ============================================================
CREATE TABLE posiciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartera_id  UUID NOT NULL REFERENCES carteras(id) ON DELETE CASCADE,
  activo_id   UUID NOT NULL REFERENCES activos(id),
  cantidad    INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  precio_promedio NUMERIC(14,2),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cartera_id, activo_id)
);

-- ============================================================
-- OPERACIONES
-- ============================================================
CREATE TABLE operaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  activo_id   UUID NOT NULL REFERENCES activos(id),
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('compra','venta')),
  cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
  precio      NUMERIC(14,2) NOT NULL,
  total       NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * precio) STORED,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operaciones_usuario ON operaciones(usuario_id);
CREATE INDEX idx_operaciones_fecha   ON operaciones(fecha DESC);

-- ============================================================
-- CONCEPTOS (módulo educativo)
-- ============================================================
CREATE TABLE conceptos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       VARCHAR(120) NOT NULL,
  contenido    TEXT NOT NULL,
  ticker_rel   VARCHAR(10),
  sector_rel   VARCHAR(60),
  nivel        VARCHAR(20) NOT NULL DEFAULT 'básico' CHECK (nivel IN ('básico','intermedio','avanzado')),
  orden        INTEGER NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO conceptos (titulo, contenido, ticker_rel, nivel, orden) VALUES
  ('¿Qué es una acción?',
   'Una acción es una parte pequeña de una empresa. Cuando comprás acciones de GGAL, te convertís en dueño de una fracción de Grupo Galicia. Si la empresa gana dinero y crece, el valor de tu acción sube. Si le va mal, baja. Como accionista tenés derecho a voto en decisiones de la empresa y a cobrar dividendos si los distribuye.',
   'GGAL', 'básico', 1),
  ('¿Qué es el rendimiento?',
   'El rendimiento mide cuánto ganaste o perdiste respecto a tu inversión inicial. Fórmula: (Capital actual - Capital inicial) / Capital inicial × 100. Ejemplo: empezaste con $100.000 y ahora tenés $118.000 → rendimiento = +18%. Si tenés $92.000 → rendimiento = -8%. Este indicador te permite comparar tu resultado contra otros inversores o contra el mercado.',
   NULL, 'básico', 2),
  ('Diversificación: no pongas todos los huevos en la misma canasta',
   'Distribuir tu capital en varios activos de distintos sectores reduce el riesgo total de tu cartera. Si ponés todo en una empresa y esa empresa tiene un problema grave, perdés todo. Pero si tenés 5 empresas de sectores distintos (bancario, energía, industrial, construcción, tecnología), un problema en una sola no te hunde. Esta es la idea central de la gestión del riesgo.',
   NULL, 'básico', 3),
  ('¿Qué es YPF y por qué importa?',
   'YPF (YPFD) es la principal empresa petrolera de Argentina, con mayoría estatal. Su precio está ligado al petróleo internacional (precio en dólares) y a las decisiones del gobierno sobre el sector energético, especialmente el desarrollo de Vaca Muerta en Neuquén. Es un activo muy volátil: puede subir o bajar mucho en poco tiempo. Analizarla requiere entender política energética y economía.',
   'YPFD', 'intermedio', 4),
  ('Renta fija vs. renta variable',
   'Las acciones son renta variable: no sabés cuánto vas a ganar (puede ser mucho o nada, incluso perdés). Los bonos son renta fija: acordás una tasa de retorno predefinida. En Argentina hay bonos en pesos (como LECAPs), bonos que ajustan por inflación (CER), y bonos en dólares (como AL30 y GD35). Cada uno tiene su perfil de riesgo y horizonte de inversión.',
   NULL, 'intermedio', 5),
  ('¿Qué es un CEDEAR?',
   'Un CEDEAR (Certificado de Depósito Argentino) es un instrumento que te permite invertir en empresas extranjeras (Apple, Google, Tesla) desde Argentina, operando en pesos en BYMA. Su precio sube si sube la acción en el exterior O si sube el dólar. Son una herramienta de dolarización indirecta de la cartera. Ideal para diversificar fuera de Argentina sin abrir una cuenta en el exterior.',
   NULL, 'intermedio', 6),
  ('¿Qué son las LECAPs?',
   'Las LECAPs (Letras del Tesoro Capitalizables) son instrumentos de deuda de corto plazo emitidos por el Tesoro Nacional. Pagan una Tasa Nominal Anual (TNA) fija: en lugar de pagar intereses periódicos, los capitalizan. Son instrumentos de renta fija en pesos, con horizonte de 30 a 180 días. Tienen bajo riesgo relativo (riesgo soberano) y son usadas por inversores conservadores que buscan superar la inflación en el corto plazo.',
   'LECAP', 'intermedio', 7),
  ('El índice Merval',
   'El Merval es el índice más importante de la Bolsa argentina. Agrupa las acciones más operadas de BYMA, ponderadas por su volumen de negociación. Cuando "el Merval sube", la mayoría de las acciones del panel principal están subiendo. Es el termómetro del mercado de acciones argentino. Las empresas que lo componen incluyen a GGAL, YPFD, PAMP, BMA, TXAR y otras que encontrás en La Mervaleta.',
   NULL, 'básico', 8),
  ('Riesgo de concentración',
   'Concentrar más del 50% de tu cartera en un solo activo o sector es un riesgo alto. Si ese activo cae un 30%, tu cartera completa cae más de un 15%. Un gestor profesional nunca superaría el 20-25% en una sola posición. En La Mervaleta vas a recibir alertas si concentrás demasiado tu cartera. Aprender a evitar la concentración es una de las habilidades más importantes de un inversor.',
   NULL, 'avanzado', 9),
  ('Bonos soberanos y riesgo país',
   'Los bonos soberanos son deuda emitida por el Estado argentino. El riesgo país (EMBI+ Argentina) mide la diferencia entre la tasa que paga Argentina y la que paga Estados Unidos por su deuda. Cuanto más alto el riesgo país, más desconfianza tienen los inversores en que Argentina pueda pagar. El precio de los bonos AL30 y GD35 cae cuando sube el riesgo país. Seguirlo es clave para entender el humor del mercado financiero internacional sobre la Argentina.',
   'AL30', 'avanzado', 10);

-- ============================================================
-- CONCEPTOS VISTOS
-- ============================================================
CREATE TABLE conceptos_vistos (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  visto_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, concepto_id)
);

-- ============================================================
-- DESAFÍOS
-- ============================================================
CREATE TABLE desafios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(120) NOT NULL,
  descripcion   TEXT NOT NULL,
  regla_json    JSONB,
  puntos_bonus  INTEGER NOT NULL DEFAULT 300,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE desafios_progreso (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES usuarios(id),
  desafio_id    UUID NOT NULL REFERENCES desafios(id),
  completado    BOOLEAN NOT NULL DEFAULT FALSE,
  progreso_pct  NUMERIC(5,2) DEFAULT 0,
  completado_at TIMESTAMPTZ,
  UNIQUE (usuario_id, desafio_id)
);

-- ============================================================
-- VISTA: ranking de alumnos
-- ============================================================
CREATE VIEW v_ranking_alumnos AS
SELECT
  u.id,
  u.nombre || ' ' || u.apellido AS nombre_completo,
  u.anio_cursada,
  e.nombre AS escuela,
  e.ciudad,
  c.capital_inicial,
  c.capital_actual,
  ROUND(
    ((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2
  ) AS rendimiento_pct,
  RANK() OVER (ORDER BY c.capital_actual DESC) AS posicion,
  u.ultima_actividad
FROM usuarios u
JOIN carteras c    ON c.usuario_id = u.id
LEFT JOIN escuelas e ON e.id = u.escuela_id
WHERE u.rol = 'alumno' AND u.activo = TRUE;

-- ============================================================
-- VISTA: ranking de escuelas
-- ============================================================
CREATE VIEW v_ranking_escuelas AS
SELECT
  e.id,
  e.nombre,
  e.ciudad,
  COUNT(u.id) AS total_alumnos,
  ROUND(AVG(
    ((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100
  ), 2) AS rendimiento_promedio,
  RANK() OVER (ORDER BY AVG(c.capital_actual) DESC) AS posicion
FROM escuelas e
JOIN usuarios u  ON u.escuela_id = e.id AND u.rol = 'alumno' AND u.activo = TRUE
JOIN carteras c  ON c.usuario_id = u.id
GROUP BY e.id, e.nombre, e.ciudad;
