-- Insignias del perfil (Aldahir): agrega al resumen de progreso cuántas participaciones válidas fueron en clubes
-- y en talleres, y cuántas propuestas de actividad le aprobaron a la persona. Solo lee; no cambia tablas.
-- Categorías (sin importar mayúsculas): clubes = club, club_lectura, club de lectura; talleres = taller, curso.
-- Aplicar después de progreso_recompensas.sql (paso 28).
BEGIN;

CREATE OR REPLACE FUNCTION privado.resumen_progreso(usuario uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT jsonb_build_object(
        'usuarioId', p.id, 'nombre', concat_ws(' ', p.nombres, p."primerApellido", p."segundoApellido"),
        'validas', conteo.validas, 'ajustes', conteo.ajustes, 'total', greatest(0, conteo.validas + conteo.ajustes),
        'nivel', privado.nivel_progreso(greatest(0, conteo.validas + conteo.ajustes)::integer),
        'noContadas', conteo.no_contadas,
        'credencial', (SELECT jsonb_build_object('estado', c."estadoValidacion", 'vence', c."fechaVencimiento",
                'vigente', c."estadoValidacion" = 'validada'
                    AND (statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date BETWEEN c."fechaEmision" AND c."fechaVencimiento")
            FROM public."credencialBibliotecaria" c WHERE c."usuarioId" = p.id),
        'asignadas', (SELECT count(*) FROM public."entregaRecompensa" e WHERE e."usuarioId" = p.id AND e.estado = 'asignada'),
        'entregadas', (SELECT count(*) FROM public."entregaRecompensa" e WHERE e."usuarioId" = p.id AND e.estado = 'entregada'),
        'ultimaParticipacion', (SELECT max(s.inicio) FROM privado."participacionProgreso" pp
            JOIN public."sesionActividad" s ON s.id = pp."sesionId" WHERE pp."usuarioId" = p.id AND pp.cuenta),
        -- Insignias del perfil: participaciones válidas por tipo de actividad (sin importar mayúsculas) y propuestas aprobadas.
        'insignias', jsonb_build_object(
            'clubes', (SELECT count(*) FROM privado."participacionProgreso" pp
                JOIN public."sesionActividad" s ON s.id = pp."sesionId" JOIN public.actividad a ON a.id = s."actividadId"
                WHERE pp."usuarioId" = p.id AND pp.cuenta
                AND lower(btrim(a.categoria)) IN ('club', 'club_lectura', 'club de lectura')),
            'talleres', (SELECT count(*) FROM privado."participacionProgreso" pp
                JOIN public."sesionActividad" s ON s.id = pp."sesionId" JOIN public.actividad a ON a.id = s."actividadId"
                WHERE pp."usuarioId" = p.id AND pp.cuenta AND lower(btrim(a.categoria)) IN ('taller', 'curso')),
            'propuestas', (SELECT count(*) FROM public."propuestaEvento" pe
                WHERE pe."propuestoPor" = p.id AND pe."estadoRevision" = 'aprobada')))
    FROM public.perfil p
    CROSS JOIN LATERAL (
        SELECT (SELECT count(*) FROM privado."participacionProgreso" WHERE "usuarioId" = p.id AND cuenta) AS validas,
               (SELECT count(*) FROM privado."participacionProgreso" WHERE "usuarioId" = p.id AND razon = 'sin_credencial') AS no_contadas,
               (SELECT coalesce(sum(cambio), 0) FROM privado."ajusteProgreso" WHERE "usuarioId" = p.id) AS ajustes
    ) conteo
    WHERE p.id = usuario;
$$;

REVOKE ALL ON FUNCTION privado.resumen_progreso(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
