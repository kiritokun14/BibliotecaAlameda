-- HU-08. Ampliación de mi_perfil después de perfil_propio.sql.
-- El contacto anterior se conserva al alcanzar la mayoría de edad.
BEGIN;

CREATE OR REPLACE FUNCTION privado.mi_perfil(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  actor uuid := privado.comprobar_sesion_cuenta();
  hoy date := (statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date;
  limite_menor date := (hoy - interval '18 years')::date;
  nacimiento date;
  version_actual timestamptz;
  domicilio jsonb := datos->'domicilio';
  responsable jsonb := datos->'responsable';
  salida jsonb;
BEGIN
  IF operacion IS NULL OR operacion NOT IN ('consultar', 'guardar')
     OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Operación inválida.' USING ERRCODE = '22023';
  END IF;

  IF operacion = 'consultar' AND datos <> '{}'::jsonb THEN
    RAISE EXCEPTION 'La consulta no acepta datos ni una identidad.' USING ERRCODE = '22023';
  END IF;

  IF operacion = 'guardar' THEN
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) campo
               WHERE campo NOT IN ('nombres', 'telefono', 'domicilio', 'responsable', 'actualizadoA'))
       OR jsonb_typeof(datos->'actualizadoA') IS DISTINCT FROM 'string'
       OR NOT (datos ?| ARRAY['nombres', 'telefono', 'domicilio', 'responsable']) THEN
      RAISE EXCEPTION 'Campos no editables o cambios vacíos.' USING ERRCODE = '22023';
    END IF;

    IF (datos ? 'nombres' AND (jsonb_typeof(datos->'nombres') IS DISTINCT FROM 'string'
          OR length(btrim(datos->>'nombres')) NOT BETWEEN 1 AND 150))
       OR (datos ? 'telefono' AND (jsonb_typeof(datos->'telefono') IS DISTINCT FROM 'string'
          OR btrim(datos->>'telefono') !~ '^[0-9]{10}$')) THEN
      RAISE EXCEPTION 'Nombre o teléfono inválido.' USING ERRCODE = '23514';
    END IF;

    SELECT p."actualizadoA", p."fechaNacimiento" INTO version_actual, nacimiento
    FROM public.perfil p WHERE p.id = actor FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Perfil no encontrado.' USING ERRCODE = 'P0002';
    END IF;
    IF (datos->>'actualizadoA')::timestamptz IS DISTINCT FROM version_actual THEN
      RAISE EXCEPTION 'Versión de perfil obsoleta.' USING ERRCODE = '40001';
    END IF;

    IF domicilio IS NOT NULL THEN
      IF nacimiento > limite_menor THEN
        RAISE EXCEPTION 'La edición del domicilio en Mi cuenta corresponde a mayores de edad.'
          USING ERRCODE = '42501';
      END IF;
      IF jsonb_typeof(domicilio) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Domicilio inválido.' USING ERRCODE = '23514';
      END IF;
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(domicilio) campo
                 WHERE campo NOT IN ('calle', 'numeroExterior', 'numeroInterior', 'coloniaLocalidad',
                                     'codigoPostal', 'municipio', 'estadoProvincia')) THEN
        RAISE EXCEPTION 'Campos de domicilio no editables.' USING ERRCODE = '22023';
      END IF;
      PERFORM privado.validar_domicilio_registro(jsonb_strip_nulls(domicilio));
    END IF;

    IF responsable IS NOT NULL THEN
      IF nacimiento <= limite_menor THEN
        RAISE EXCEPTION 'La cuenta ya no requiere el contacto de la persona responsable.'
          USING ERRCODE = '42501';
      END IF;
      IF jsonb_typeof(responsable) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Contacto de la persona responsable inválido.' USING ERRCODE = '23514';
      END IF;
      IF NOT (responsable ?| ARRAY['telefono', 'correo'])
         OR EXISTS (SELECT 1 FROM jsonb_object_keys(responsable) campo
                    WHERE campo NOT IN ('telefono', 'correo')) THEN
        RAISE EXCEPTION 'Campos de contacto no editables o cambios vacíos.' USING ERRCODE = '22023';
      END IF;
      IF (responsable ? 'telefono' AND (jsonb_typeof(responsable->'telefono') IS DISTINCT FROM 'string'
            OR btrim(responsable->>'telefono') !~ '^[0-9]{10}$'))
         OR (responsable ? 'correo' AND (jsonb_typeof(responsable->'correo') IS DISTINCT FROM 'string'
            OR length(btrim(responsable->>'correo')) > 254
            OR btrim(responsable->>'correo') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) THEN
        RAISE EXCEPTION 'Teléfono o correo de la persona responsable inválido.' USING ERRCODE = '23514';
      END IF;

      UPDATE public."contactoTutor" t
      SET telefono = coalesce(btrim(responsable->>'telefono'), t.telefono),
          correo = coalesce(btrim(responsable->>'correo'), t.correo)
      WHERE t."usuarioId" = actor;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró el contacto de la persona responsable.' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    -- Se avanza la versión del perfil también si el único cambio fue el contacto.
    UPDATE public.perfil p
    SET nombres = coalesce(btrim(datos->>'nombres'), p.nombres),
        telefono = coalesce(btrim(datos->>'telefono'), p.telefono),
        calle = coalesce(btrim(domicilio->>'calle'), p.calle),
        "numeroExterior" = coalesce(btrim(domicilio->>'numeroExterior'), p."numeroExterior"),
        "numeroInterior" = CASE WHEN domicilio IS NOT NULL THEN btrim(domicilio->>'numeroInterior')
                               ELSE p."numeroInterior" END,
        "coloniaLocalidad" = coalesce(btrim(domicilio->>'coloniaLocalidad'), p."coloniaLocalidad"),
        "codigoPostal" = coalesce(domicilio->>'codigoPostal', p."codigoPostal"),
        municipio = coalesce(btrim(domicilio->>'municipio'), p.municipio),
        "estadoProvincia" = coalesce(btrim(domicilio->>'estadoProvincia'), p."estadoProvincia")
    WHERE p.id = actor;
  END IF;

  SELECT jsonb_build_object(
    'id', p.id, 'correo', u.email, 'nombres', p.nombres, 'primerApellido', p."primerApellido",
    'segundoApellido', p."segundoApellido", 'fechaNacimiento', p."fechaNacimiento",
    'telefono', p.telefono, 'actualizadoA', p."actualizadoA", 'esMenor', p."fechaNacimiento" > limite_menor,
    'domicilio', CASE WHEN p."fechaNacimiento" <= limite_menor THEN jsonb_build_object(
      'calle', p.calle, 'numeroExterior', p."numeroExterior", 'numeroInterior', p."numeroInterior",
      'coloniaLocalidad', p."coloniaLocalidad", 'codigoPostal', p."codigoPostal",
      'municipio', p.municipio, 'estadoProvincia', p."estadoProvincia") END,
    'responsable', CASE WHEN t."usuarioId" IS NOT NULL THEN jsonb_build_object(
      'nombre', concat_ws(' ', t.nombres, t.apellidos), 'telefono', t.telefono,
      'correo', t.correo, 'relacion', t.relacion) END
  ) INTO salida
  FROM public.perfil p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public."contactoTutor" t ON t."usuarioId" = p.id AND p."fechaNacimiento" > limite_menor
  WHERE p.id = actor;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado.' USING ERRCODE = 'P0002';
  END IF;
  RETURN salida;
END;
$$;

COMMIT;
