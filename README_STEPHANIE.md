# Cambios de Stephanie · Biblioteca Alameda

## Noticias culturales de Instagram

- Integré en el inicio de BibliotecaAlameda la sección «Cultura Nayarit» que estaba en BibliotecaAlameda-Aldahir. Aparece debajo de las noticias de la biblioteca y muestra hasta seis publicaciones de `@culturanayarit`.
- Adapté el carrusel a los componentes del portal. La sección muestra estados de carga, error y lista vacía, y ofrece un enlace a cada publicación disponible.
- Registré el endpoint de FastAPI. El backend consulta API.SH y conserva las publicaciones en una caché de seis horas. Si falla el proveedor y existe una copia previa, entrega esa copia al portal.
- La clave `APISH_KEY` se configura en `Back/.env`. El archivo `Back/.env.example` contiene un marcador y `Back/.cache/` se excluye de Git.

[Configuración y pruebas de Instagram](INSTAGRAM.md)

## Domicilio en el trámite de credencial

- El formulario toma el domicilio del perfil de la cuenta. Muestra calle, número exterior e interior cuando existe, colonia, código postal, municipio y estado.
- El domicilio de ejemplo se utiliza en modo de demostración. Si el perfil de una cuenta no devuelve una dirección, aparece «Domicilio no disponible».
- Se actualizó la función `mi_perfil` para incluir el domicilio almacenado en el perfil de la persona autenticada.

**Paso pendiente en Supabase.** Ejecutar [perfil_propio.sql](Supabase/perfil_propio.sql) en el entorno correspondiente para que el formulario reciba el domicilio real. La [prueba SQL](Supabase/pruebas_perfil_propio.sql) verifica que la función devuelva la dirección actual del perfil y revierte sus cambios. Su ejecución en Supabase sigue pendiente.

## Formulario de propuestas

- El campo «Material que necesitas» pasó a llamarse «Requerimientos».
- La tercera casilla indica que enviar la propuesta no la aprueba ni reserva el espacio y que la persona solicitante es responsable de revisar su seguimiento.
- La fecha es opcional y utiliza el selector del navegador. Al guardar una propuesta nueva o editar una existente, el formulario valida que la fecha no sea pasada, sábado, domingo ni un feriado federal de fecha fija o calculable.
- Los cierres locales de la biblioteca y las jornadas electorales requieren fechas específicas que esta validación aún no contempla.

## Verificación

- **Instagram:** 8 pruebas de backend con el proveedor simulado. Se comprobaron las rutas directa y a través del proxy.
- **Propuestas:** 7 pruebas, incluidas fechas hábiles, fines de semana y feriados.
- **Frontend:** se verificaron lint y compilación después de integrar Instagram y el cambio de domicilio. La validación final de feriados se verificó con las pruebas de propuestas.
- **Conexión local:** `/api/salud/bd` devolvió HTTP 200 y confirmó la conexión a Supabase. Esa comprobación valida el acceso a la base. La lectura del domicilio real requiere aplicar el SQL indicado arriba.
