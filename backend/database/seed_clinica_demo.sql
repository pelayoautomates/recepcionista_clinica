-- ============================================================================
-- Seed de datos de prueba para "Clinica Prueba".
--
-- Sin servicios ni profesionales el agente no puede agendar nada: devuelve
-- "servicio no encontrado" y deriva a humano absolutamente todo. Esto deja la
-- clínica en un estado con el que SÍ se puede probar el flujo completo.
--
-- Es idempotente: se puede ejecutar varias veces sin duplicar.
-- Para deshacerlo, ver el bloque LIMPIEZA del final.
--
--   supabase db query --file backend/database/seed_clinica_demo.sql --linked
-- ============================================================================

BEGIN;

-- ── Horario de la clínica ───────────────────────────────────────────────────
UPDATE clinicas SET
  horarios = '{
    "lun": {"start": "09:00", "end": "20:00"},
    "mar": {"start": "09:00", "end": "20:00"},
    "mie": {"start": "09:00", "end": "20:00"},
    "jue": {"start": "09:00", "end": "20:00"},
    "vie": {"start": "09:00", "end": "20:00"},
    "sab": {"start": "10:00", "end": "15:00"}
  }'::jsonb,
  especialidad = 'Medicina estética',
  reglas_reserva = '{
    "antelacion_min_horas": 2,
    "max_dias_adelante": 60,
    "intervalo_slots_min": 30,
    "permite_mismo_dia": true
  }'::jsonb
WHERE nombre = 'Clinica Prueba';


-- ── Servicios ───────────────────────────────────────────────────────────────
-- Los tres casos que hay que poder distinguir en las pruebas:
--   1. Reservable por la IA sin más.
--   2. `requiere_revision`: la IA NO debe agendarlo (era el bug del select).
--   3. `reservable_ia = false`: la IA ni siquiera debe ofrecer huecos.
INSERT INTO servicios (clinic_id, nombre, duracion_min, precio, categoria,
                       reservable_ia, requiere_revision, buffer_despues_min, activo, orden)
SELECT c.id, v.nombre, v.duracion, v.precio, v.categoria,
       v.reservable, v.revision, v.buffer, true, v.orden
FROM clinicas c
CROSS JOIN (VALUES
  ('Limpieza facial profunda', 60, 75.00,  'Facial',      true,  false, 10, 1),
  ('Peeling químico',          30, 95.00,  'Facial',      true,  false, 10, 2),
  ('Mesoterapia facial',       90, 150.00, 'Facial',      true,  false, 15, 3),
  ('Botox',                    45, 180.00, 'Inyectables', true,  true,  15, 4),
  ('Relleno de labios',        45, 250.00, 'Inyectables', false, false, 15, 5)
) AS v(nombre, duracion, precio, categoria, reservable, revision, buffer, orden)
WHERE c.nombre = 'Clinica Prueba'
  AND NOT EXISTS (
    SELECT 1 FROM servicios s WHERE s.clinic_id = c.id AND s.nombre = v.nombre
  );


-- ── Profesionales ───────────────────────────────────────────────────────────
INSERT INTO profesionales (clinic_id, nombre, especialidad, color,
                           activo, acepta_reservas_ia, prioridad, orden)
SELECT c.id, v.nombre, v.especialidad, v.color, true, true, v.prioridad, v.orden
FROM clinicas c
CROSS JOIN (VALUES
  ('Dra. Sofía Romero', 'Directora médica',            '#2563eb', 10, 1),
  ('Dra. Carmen Vidal', 'Tratamientos faciales y láser','#16a34a',  5, 2)
) AS v(nombre, especialidad, color, prioridad, orden)
WHERE c.nombre = 'Clinica Prueba'
  AND NOT EXISTS (
    SELECT 1 FROM profesionales p WHERE p.clinic_id = c.id AND p.nombre = v.nombre
  );


-- ── Disponibilidad: lunes a viernes ─────────────────────────────────────────
-- 0 = lunes … 4 = viernes. Carmen entra más tarde para que las dos agendas no
-- sean idénticas y se note el reparto entre profesionales.
INSERT INTO disponibilidad_profesional (clinic_id, profesional_id, dia_semana,
                                        hora_inicio, hora_fin, activo)
SELECT p.clinic_id, p.id, d.dia,
       CASE WHEN p.nombre = 'Dra. Carmen Vidal' THEN TIME '11:00' ELSE TIME '09:00' END,
       CASE WHEN p.nombre = 'Dra. Carmen Vidal' THEN TIME '19:00' ELSE TIME '18:00' END,
       true
FROM profesionales p
JOIN clinicas c ON c.id = p.clinic_id AND c.nombre = 'Clinica Prueba'
CROSS JOIN generate_series(0, 4) AS d(dia)
ON CONFLICT (profesional_id, dia_semana) DO NOTHING;


-- ── Quién hace qué ──────────────────────────────────────────────────────────
-- Sofía hace todo; Carmen solo los faciales. Así se puede comprobar que pedir
-- Botox no ofrece hueco con Carmen.
INSERT INTO servicio_profesional (servicio_id, profesional_id)
SELECT s.id, p.id
FROM servicios s
JOIN clinicas c ON c.id = s.clinic_id AND c.nombre = 'Clinica Prueba'
JOIN profesionales p ON p.clinic_id = c.id
WHERE p.nombre = 'Dra. Sofía Romero'
   OR (p.nombre = 'Dra. Carmen Vidal' AND s.categoria = 'Facial')
ON CONFLICT DO NOTHING;

COMMIT;


-- ── Comprobación ────────────────────────────────────────────────────────────
SELECT c.nombre AS clinica,
       (SELECT count(*) FROM servicios s
         WHERE s.clinic_id = c.id AND s.activo
           AND s.reservable_ia AND NOT s.requiere_revision) AS servicios_reservables,
       (SELECT count(*) FROM profesionales p
         WHERE p.clinic_id = c.id AND p.activo AND p.acepta_reservas_ia)      AS profesionales_ia,
       (SELECT count(*) FROM disponibilidad_profesional d
         JOIN profesionales p2 ON p2.id = d.profesional_id
        WHERE p2.clinic_id = c.id AND d.activo)                               AS franjas_disponibilidad,
       (SELECT count(*) FROM jsonb_object_keys(coalesce(c.horarios,'{}'::jsonb))) AS dias_horario
FROM clinicas c
WHERE c.nombre = 'Clinica Prueba';


-- ============================================================================
-- LIMPIEZA (ejecutar aparte si se quiere dejar la clínica como estaba)
--
--   BEGIN;
--   DELETE FROM servicio_profesional sp USING servicios s, clinicas c
--    WHERE sp.servicio_id = s.id AND s.clinic_id = c.id AND c.nombre = 'Clinica Prueba';
--   DELETE FROM disponibilidad_profesional d USING clinicas c
--    WHERE d.clinic_id = c.id AND c.nombre = 'Clinica Prueba';
--   DELETE FROM servicios s USING clinicas c
--    WHERE s.clinic_id = c.id AND c.nombre = 'Clinica Prueba';
--   DELETE FROM profesionales p USING clinicas c
--    WHERE p.clinic_id = c.id AND c.nombre = 'Clinica Prueba';
--   COMMIT;
-- ============================================================================
