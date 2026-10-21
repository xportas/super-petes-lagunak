-- 0001_nucleo_03 — tablas núcleo spec-03 + RLS DENY (sin políticas anon).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- usuario / manager
CREATE TABLE usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  username_normalizado text NOT NULL UNIQUE CHECK (username_normalizado = lower(username_normalizado)),
  password_hash text NOT NULL,
  es_temporal boolean NOT NULL DEFAULT false,
  onboarding_paso smallint NOT NULL DEFAULT 0,
  onboarding_completado_at timestamptz NULL,
  rol text NOT NULL CHECK (rol IN ('manager','admin')),
  creado_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

CREATE TABLE sesion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expira_at timestamptz NOT NULL,
  ultima_renovacion_at timestamptz NOT NULL DEFAULT now(),
  revocada_at timestamptz NULL
);
ALTER TABLE sesion ENABLE ROW LEVEL SECURITY;

CREATE TABLE invitacion_liga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  vigente boolean NOT NULL DEFAULT true,
  creada_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invitacion_liga ENABLE ROW LEVEL SECURITY;

CREATE TABLE rate_limit (
  alcance text NOT NULL,
  sujeto text NOT NULL,
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  primer_fallo_at timestamptz NOT NULL DEFAULT now(),
  bloqueado_hasta timestamptz NULL,
  PRIMARY KEY (alcance, sujeto)
);
ALTER TABLE rate_limit ENABLE ROW LEVEL SECURITY;

CREATE TABLE jugador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nombre_fnb text NOT NULL,
  dorsal smallint NULL,
  posiciones_validas char(2)[] NULL CHECK (posiciones_validas IS NULL OR cardinality(posiciones_validas) = 2),
  nombre_pete text NULL,
  img text NOT NULL,
  img_pete text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  fnb_uuid uuid UNIQUE NULL,
  estado_sanitario text NOT NULL DEFAULT 'disponible' CHECK (estado_sanitario IN ('disponible','lesionado')),
  activo boolean NOT NULL DEFAULT true,
  fecha_alta timestamptz NOT NULL,
  fecha_baja timestamptz NULL
);
ALTER TABLE jugador ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_jugador_fnb_uuid ON jugador (fnb_uuid);

CREATE TABLE entrenador (
  slug text PRIMARY KEY CHECK (slug IN ('maider','pater')),
  nombre text NOT NULL,
  img text NOT NULL,
  fnb_uuid uuid NOT NULL UNIQUE
);
ALTER TABLE entrenador ENABLE ROW LEVEL SECURITY;

CREATE TABLE jornada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_jornada integer NOT NULL UNIQUE,
  numero_jornada_fnb integer NULL,
  rival text NOT NULL,
  es_local boolean NOT NULL,
  campo text NULL,
  municipio text NULL,
  hora_partido timestamptz NOT NULL,
  estado text NOT NULL CHECK (estado IN ('pendiente','calculada','papel','invalidada')),
  fnb_match_id text NULL UNIQUE,
  fnb_universally_id text NULL,
  marcador_local smallint NULL,
  marcador_visitante smallint NULL,
  origen_resultado text NULL CHECK (origen_resultado IS NULL OR origen_resultado IN ('manual','fnb')),
  last_calendar_sync timestamptz NULL,
  last_result_sync timestamptz NULL
);
ALTER TABLE jornada ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_jornada_fnb_match ON jornada (fnb_match_id);
CREATE INDEX idx_jornada_hora ON jornada (hora_partido);

CREATE TABLE fnb_partidos_ignorados (
  fnb_match_id text PRIMARY KEY,
  eliminado_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fnb_partidos_ignorados ENABLE ROW LEVEL SECURITY;

CREATE TABLE alineacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  jornada_id uuid NOT NULL REFERENCES jornada(id) ON DELETE CASCADE,
  entrenador text NOT NULL CHECK (entrenador IN ('maider','pater')),
  capitan_jugador_id uuid NOT NULL REFERENCES jugador(id),
  instante_inicio timestamptz NOT NULL,
  UNIQUE (manager_id, jornada_id)
);
ALTER TABLE alineacion ENABLE ROW LEVEL SECURITY;

CREATE TABLE alineacion_seleccion (
  alineacion_id uuid NOT NULL REFERENCES alineacion(id) ON DELETE CASCADE,
  jugador_id uuid NOT NULL REFERENCES jugador(id),
  posicion_alineada char(2) NOT NULL CHECK (posicion_alineada IN ('B','E','A','AP','P')),
  PRIMARY KEY (alineacion_id, jugador_id)
);
ALTER TABLE alineacion_seleccion ENABLE ROW LEVEL SECURITY;

CREATE TABLE resultado_jugador (
  jornada_id uuid NOT NULL REFERENCES jornada(id) ON DELETE CASCADE,
  jugador_id uuid NOT NULL REFERENCES jugador(id) ON DELETE CASCADE,
  valoracion integer NOT NULL,
  estado text NOT NULL CHECK (estado IN ('jugo','lesionado','no_convocado','dnp')),
  expulsado boolean NOT NULL DEFAULT false,
  PRIMARY KEY (jornada_id, jugador_id),
  CHECK (
    (estado = 'jugo')
    OR (expulsado = false)
  )
);
ALTER TABLE resultado_jugador ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_resultado_jornada ON resultado_jugador (jornada_id);
