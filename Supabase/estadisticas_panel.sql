-- Administración · Estadísticas (Figma 580:49970). Solo lectura y con datos reales de la BD.
-- Acceso: capacidad 'consultar_estadisticas' (cualquier ámbito). No expone datos personales: solo conteos.
-- Secciones:
--   portal       → cuentas nuevas, mensajes de contacto, solicitudes de credencial y de espacio; serie de cuentas nuevas;
--                  tabla de trámites recibidos por tipo.
--   actividades  → sesiones realizadas, personas inscritas, asistencia promedio y sesiones canceladas; serie de asistentes;
--                  tabla de actividades con más asistentes.
--   contenidos   → publicados en el periodo, en revisión, retirados y vigentes; serie de publicados; tabla por tipo.
-- Periodo: '30dias' (últimos 30 días), 'mes' (mes en curso) o 'anio' (año en curso), en hora de Tepic.
-- La serie es semanal (30 días y mes) o mensual (año).
-- Requiere: Main.sql, administracion_cuentas.sql (privado.comprobar_sesion_cuenta, privado.permisos_de_cuenta).

BEGIN;

CREATE OR REPLACE FUNCTION privado.estadisticas_panel(seccion text, periodo text DEFAULT '30dias')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; zona text := 'America/Mazatlan'; ahora timestamptz := now(); desde timestamptz; paso text;
 indicadores jsonb; serie jsonb; tabla jsonb; titulo_serie text; titulo_tabla text;
 n1 bigint; n2 bigint; n3 bigint; n4 bigint; presentes bigint; registrados bigint;
BEGIN
 actor := privado.comprobar_sesion_cuenta();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p WHERE p->>'capacidad'='consultar_estadisticas') THEN
  RAISE EXCEPTION 'Sin permiso para consultar estadísticas.' USING ERRCODE='42501'; END IF;
 IF seccion IS NULL OR seccion NOT IN ('portal','actividades','contenidos') THEN
  RAISE EXCEPTION 'Elige la sección.' USING ERRCODE='22023'; END IF;
 IF periodo IS NULL OR periodo NOT IN ('30dias','mes','anio') THEN
  RAISE EXCEPTION 'Elige el periodo.' USING ERRCODE='22023'; END IF;

 desde := CASE periodo
  WHEN '30dias' THEN ahora - interval '30 days'
  WHEN 'mes' THEN date_trunc('month', ahora AT TIME ZONE zona) AT TIME ZONE zona
  ELSE date_trunc('year', ahora AT TIME ZONE zona) AT TIME ZONE zona END;
 paso := CASE WHEN periodo = 'anio' THEN 'month' ELSE 'week' END;

 IF seccion = 'actividades' THEN
  SELECT count(*) FILTER (WHERE s.estado <> 'cancelada' AND (s.estado = 'finalizada' OR s.fin <= ahora)),
         count(*) FILTER (WHERE s.estado = 'cancelada')
   INTO n1, n4 FROM public."sesionActividad" s WHERE s.inicio >= desde AND s.inicio <= ahora;
  SELECT count(*) INTO n2 FROM public.inscripcion i JOIN public."sesionActividad" s ON s.id = i."sesionId"
   WHERE s.inicio >= desde AND s.inicio <= ahora AND i.status IN ('pendiente','confirmada');
  SELECT count(*) FILTER (WHERE a.estatus = 'presente'), count(*) INTO presentes, registrados
   FROM public.asistencia a JOIN public."sesionActividad" s ON s.id = a."sesionId" WHERE s.inicio >= desde AND s.inicio <= ahora;
  indicadores := jsonb_build_array(
   jsonb_build_object('titulo','Sesiones realizadas','valor',n1::text,'detalle','En el periodo'),
   jsonb_build_object('titulo','Personas inscritas','valor',n2::text,'detalle','En las sesiones del periodo'),
   jsonb_build_object('titulo','Asistencia promedio','valor',CASE WHEN registrados > 0 THEN round(presentes * 100.0 / registrados)::text || '%' ELSE 'Sin listas' END,'detalle','De las listas cerradas'),
   jsonb_build_object('titulo','Sesiones canceladas','valor',n4::text,'detalle','En el periodo'));
  titulo_serie := 'Asistentes por ' || CASE WHEN paso = 'week' THEN 'semana' ELSE 'mes' END;
  SELECT coalesce(jsonb_agg(jsonb_build_object('etiqueta',x.etiqueta,'valor',x.valor) ORDER BY x.inicio),'[]'::jsonb) INTO serie FROM (
   SELECT date_trunc(paso, s.inicio AT TIME ZONE zona) AS inicio,
          to_char(date_trunc(paso, s.inicio AT TIME ZONE zona), CASE WHEN paso = 'week' THEN 'DD/MM' ELSE 'MM/YYYY' END) AS etiqueta,
          count(*) FILTER (WHERE a.estatus = 'presente') AS valor
   FROM public."sesionActividad" s LEFT JOIN public.asistencia a ON a."sesionId" = s.id
   WHERE s.inicio >= desde AND s.inicio <= ahora AND s.estado <> 'cancelada' GROUP BY 1, 2) x;
  titulo_tabla := 'Actividades con más asistentes';
  SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',x.titulo,'valor',x.valor) ORDER BY x.valor DESC, x.titulo),'[]'::jsonb) INTO tabla FROM (
   SELECT ac.titulo, count(*) AS valor FROM public.asistencia a
   JOIN public."sesionActividad" s ON s.id = a."sesionId" JOIN public.actividad ac ON ac.id = s."actividadId"
   WHERE a.estatus = 'presente' AND s.inicio >= desde AND s.inicio <= ahora GROUP BY ac.titulo ORDER BY count(*) DESC, ac.titulo LIMIT 5) x;

 ELSIF seccion = 'contenidos' THEN
  SELECT count(*) INTO n1 FROM public."Contenido" c WHERE c."publicadoEn" >= desde AND c."publicadoEn" <= ahora;
  SELECT count(*) INTO n2 FROM public."Contenido" c WHERE c.estado = 'en_revision';
  SELECT count(*) INTO n3 FROM public."Contenido" c WHERE c.estado = 'retirado' AND c."actualizadoEn" >= desde;
  SELECT count(*) INTO n4 FROM public."Contenido" c WHERE c.estado = 'publicado';
  indicadores := jsonb_build_array(
   jsonb_build_object('titulo','Publicados','valor',n1::text,'detalle','En el periodo'),
   jsonb_build_object('titulo','En revisión','valor',n2::text,'detalle','Esperan autorización'),
   jsonb_build_object('titulo','Retirados','valor',n3::text,'detalle','En el periodo'),
   jsonb_build_object('titulo','En el portal','valor',n4::text,'detalle','Publicados hoy'));
  titulo_serie := 'Publicados por ' || CASE WHEN paso = 'week' THEN 'semana' ELSE 'mes' END;
  SELECT coalesce(jsonb_agg(jsonb_build_object('etiqueta',x.etiqueta,'valor',x.valor) ORDER BY x.inicio),'[]'::jsonb) INTO serie FROM (
   SELECT date_trunc(paso, c."publicadoEn" AT TIME ZONE zona) AS inicio,
          to_char(date_trunc(paso, c."publicadoEn" AT TIME ZONE zona), CASE WHEN paso = 'week' THEN 'DD/MM' ELSE 'MM/YYYY' END) AS etiqueta,
          count(*) AS valor
   FROM public."Contenido" c WHERE c."publicadoEn" >= desde AND c."publicadoEn" <= ahora GROUP BY 1, 2) x;
  titulo_tabla := 'Publicados por tipo';
  SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',x.tipo,'valor',x.valor) ORDER BY x.valor DESC, x.tipo),'[]'::jsonb) INTO tabla FROM (
   SELECT CASE c.tipo WHEN 'noticia' THEN 'Noticias' WHEN 'resena' THEN 'Reseñas' WHEN 'memoria' THEN 'Memoria pública'
                      WHEN 'acerca' THEN 'Acerca de' ELSE initcap(c.tipo) END AS tipo, count(*) AS valor
   FROM public."Contenido" c WHERE c."publicadoEn" >= desde AND c."publicadoEn" <= ahora GROUP BY 1) x;

 ELSE
  SELECT count(*) INTO n1 FROM public.perfil p WHERE p."creadoA" >= desde AND p."creadoA" <= ahora;
  SELECT count(*) INTO n2 FROM public."mensajeContacto" m WHERE m."creadoEn" >= desde AND m."creadoEn" <= ahora;
  SELECT count(*) INTO n3 FROM public."solicitudCredencial" c WHERE c."creadaEn" >= desde AND c."creadaEn" <= ahora;
  SELECT count(*) INTO n4 FROM public."solicitudEspacio" e WHERE e."creadaEn" >= desde AND e."creadaEn" <= ahora;
  indicadores := jsonb_build_array(
   jsonb_build_object('titulo','Cuentas nuevas','valor',n1::text,'detalle','Registradas en el periodo'),
   jsonb_build_object('titulo','Mensajes de contacto','valor',n2::text,'detalle','Contactos y sugerencias'),
   jsonb_build_object('titulo','Solicitudes de credencial','valor',n3::text,'detalle','Primera vez y renovación'),
   jsonb_build_object('titulo','Solicitudes de espacio','valor',n4::text,'detalle','Salas para eventos'));
  titulo_serie := 'Cuentas nuevas por ' || CASE WHEN paso = 'week' THEN 'semana' ELSE 'mes' END;
  SELECT coalesce(jsonb_agg(jsonb_build_object('etiqueta',x.etiqueta,'valor',x.valor) ORDER BY x.inicio),'[]'::jsonb) INTO serie FROM (
   SELECT date_trunc(paso, p."creadoA" AT TIME ZONE zona) AS inicio,
          to_char(date_trunc(paso, p."creadoA" AT TIME ZONE zona), CASE WHEN paso = 'week' THEN 'DD/MM' ELSE 'MM/YYYY' END) AS etiqueta,
          count(*) AS valor
   FROM public.perfil p WHERE p."creadoA" >= desde AND p."creadoA" <= ahora GROUP BY 1, 2) x;
  titulo_tabla := 'Trámites recibidos';
  tabla := jsonb_build_array(
   jsonb_build_object('nombre','Mensajes de contacto','valor',n2),
   jsonb_build_object('nombre','Solicitudes de credencial','valor',n3),
   jsonb_build_object('nombre','Solicitudes de espacio','valor',n4),
   jsonb_build_object('nombre','Propuestas de actividad','valor',(SELECT count(*) FROM public."propuestaEvento" pe WHERE pe."creadaEn" >= desde AND pe."creadaEn" <= ahora)));
 END IF;

 RETURN jsonb_build_object('seccion',seccion,'periodo',periodo,'desde',desde,'hasta',ahora,
  'indicadores',indicadores,'tituloSerie',titulo_serie,'serie',serie,'tituloTabla',titulo_tabla,'tabla',tabla);
END;
$$;
REVOKE ALL ON FUNCTION privado.estadisticas_panel(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION privado.estadisticas_panel(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.estadisticas_panel(seccion text, periodo text DEFAULT '30dias')
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.estadisticas_panel(seccion, periodo);
$$;
REVOKE ALL ON FUNCTION public.estadisticas_panel(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.estadisticas_panel(text,text) TO authenticated;

COMMIT;
