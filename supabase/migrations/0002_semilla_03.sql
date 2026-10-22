-- 0002_semilla_03 — 12 jugadores + 2 entrenadores + J1 papel + J2 calculada.
-- Admin e invitación NO van en SQL: se inyectan vía env en spec-04.

-- Entrenadores
INSERT INTO entrenador (slug, nombre, img, fnb_uuid) VALUES
  ('maider', 'Maider', 'public/coaches/maider.webp', 'c663ff92-eb38-11e9-83ca-0216824770c2'),
  ('pater', 'Páter', 'public/coaches/pater.webp', 'c66dca7c-eb38-11e9-83ca-0216824770c2')
ON CONFLICT (slug) DO NOTHING;

-- Jugadores (12 verificados fnb-api-reference §3.4, alta 2026-09-01, placeholders)
INSERT INTO jugador (nombre, nombre_fnb, dorsal, posiciones_validas, nombre_pete, img, img_pete, descripcion, fnb_uuid, estado_sanitario, activo, fecha_alta, fecha_baja) VALUES
  ('Mario Sarasa', 'MARIO SARASA GIL', 8, ARRAY['B','E'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Base de la casa', 'c66dee66-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Inari Iturri', 'INARI ITURRI CILVETI', 10, ARRAY['E','A'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Exterior completísimo', 'c663ea09-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Iker Balda', 'IKER BALDA AFONSO', 12, ARRAY['B','AP'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Anotador voraz', 'c66df5a9-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Iñigo Ortega', 'IÑIGO ORTEGA CARCAMO', 14, ARRAY['AP','P'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Músculo interior', 'c67324d5-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Xabier Portas', 'XABIER PORTAS GONZALEZ', 15, ARRAY['E','AP'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Comodín táctico', '9fb20b1e-9742-43fc-9ea2-ddeef9fbeae5', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Marcos Gómez', 'MARCOS GOMEZ ARNEDO', 16, ARRAY['AP','P'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Pívot fajador', 'd441b014-9ee3-49e8-a1d0-b4b561dbf362', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Andoni Estirado', 'ANDONI ESTIRADO GAISAN', 17, ARRAY['B','P'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Todo pista', '6d3c74db-5426-42ad-8c5c-cc276a0489a4', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Javier Bringas', 'JAVIER BRINGAS BASTERRA', 21, ARRAY['E','P'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Tirador de rachas', 'c66df169-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Oskar Zurdo', 'OSKAR ZURDO FERNANDEZ', 22, ARRAY['B','AP'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Director silencioso', '579eb47a-d2f5-4125-81ec-2bdf9d050bd6', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Asier Valencia', 'ASIER VALENCIA ARBIZU', 23, ARRAY['AP','P'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Referencia interior', 'c66df3c0-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('Marc Catalán', 'MARC CATALAN FEIJOO', 30, ARRAY['E','AP'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Rebote y brega', 'c6684685-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL),
  ('David Vital', 'DAVID VITAL PAGOLA', NULL, ARRAY['B','E'], NULL, 'public/players/placeholder.webp', 'public/players/placeholder-pete.webp', 'Canterano en órbita', 'c668475e-eb38-11e9-83ca-0216824770c2', 'disponible', true, '2026-09-01T00:00:00+02:00', NULL)
ON CONFLICT (fnb_uuid) DO NOTHING;

-- Jornadas J1 papel + J2 calculada
INSERT INTO jornada (numero_jornada, numero_jornada_fnb, rival, es_local, campo, municipio, hora_partido, estado, fnb_match_id, fnb_universally_id, marcador_local, marcador_visitante, origen_resultado) VALUES
  (1, 1, 'BERRIOZAR MKE', false, 'PDVO. BERRIOZAR', 'Berriozar', '2026-10-03T18:00:00+02:00', 'papel', '55483', NULL, 64, 58, NULL),
  (2, 2, 'PAYVI TABERNA SANDUZELAI', true, 'PDVO. LAGUNAK', 'Barañáin', '2026-10-11T18:00:00+02:00', 'calculada', '55488', '6acbcc7bd75749bb61a786f8', 67, 42, 'fnb')
ON CONFLICT (numero_jornada) DO NOTHING;

-- Acta J2: 11 valoraciones + VITAL no_convocado
WITH j AS (SELECT id FROM jornada WHERE fnb_match_id = '55488'),
v(fnb_uuid, valoracion, estado, expulsado) AS (VALUES
  ('c66dee66-eb38-11e9-83ca-0216824770c2', 1, 'jugo'::text, false),
  ('c663ea09-eb38-11e9-83ca-0216824770c2', 6, 'jugo'::text, false),
  ('c66df5a9-eb38-11e9-83ca-0216824770c2', 12, 'jugo'::text, false),
  ('c67324d5-eb38-11e9-83ca-0216824770c2', 7, 'jugo'::text, false),
  ('9fb20b1e-9742-43fc-9ea2-ddeef9fbeae5', 2, 'jugo'::text, false),
  ('d441b014-9ee3-49e8-a1d0-b4b561dbf362', 0, 'jugo'::text, true),
  ('6d3c74db-5426-42ad-8c5c-cc276a0489a4', 8, 'jugo'::text, false),
  ('c66df169-eb38-11e9-83ca-0216824770c2', 1, 'jugo'::text, false),
  ('579eb47a-d2f5-4125-81ec-2bdf9d050bd6', -1, 'jugo'::text, false),
  ('c66df3c0-eb38-11e9-83ca-0216824770c2', 13, 'jugo'::text, false),
  ('c6684685-eb38-11e9-83ca-0216824770c2', -1, 'jugo'::text, false),
  ('c668475e-eb38-11e9-83ca-0216824770c2', 0, 'no_convocado'::text, false)
)
INSERT INTO resultado_jugador (jornada_id, jugador_id, valoracion, estado, expulsado)
SELECT j.id, ju.id, v.valoracion, v.estado::text, v.expulsado
FROM j, jugador ju, v
WHERE ju.fnb_uuid::text = v.fnb_uuid
ON CONFLICT (jornada_id, jugador_id) DO NOTHING;
