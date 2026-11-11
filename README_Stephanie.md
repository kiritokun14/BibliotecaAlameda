# HU-19 / T-097 — Sprint 5
## Consulta de inscripciones y control de cupos

### 1. Descripción general

En esta actividad desarrollé la parte del backend que permite a los responsables de cursos y talleres consultar las personas que solicitaron una inscripción, revisar los lugares disponibles y decidir si una solicitud se confirma, rechaza o cancela.

El objetivo principal es llevar un mejor control de los participantes, evitar que se inscriban más personas de las permitidas y proteger su información personal.

Para realizarlo, utilicé el backend existente en **FastAPI**, la autenticación de **Supabase** y la base de datos **PostgreSQL**.

### 2. Endpoints implementados

Los endpoints son las rutas que permiten consultar información o realizar acciones desde el backend.

Para utilizarlos, es necesario que el usuario haya iniciado sesión y envíe su token de autenticación.

GET `/responsable/actividades` : Muestra los cursos y talleres que el responsable tiene permiso de administrar. 
GET `/sesiones/{sesionId}/inscripciones`:Muestra las solicitudes de las personas que quieren participar en una sesión. 
GET  `/sesiones/{sesionId}/cupos` Permite saber cuántos lugares tiene una sesión, cuántos están ocupados y cuántos quedan disponibles. 
---------------------------------------------------------------------
PATCH `/inscripciones/{inscripcionId}/confirmar` Confirma la inscripción de una persona cuando cumple los requisitos y hay espacio. 
PATCH `/inscripciones/{inscripcionId}/rechazar` Rechaza una solicitud y guarda el motivo de la decisión.
PATCH `/inscripciones/{inscripcionId}/cancelar` Cancela una inscripción pendiente o confirmada.
-----------------------------------------------------------------------
GET  `/sesiones/{sesionId}/inscripciones/conteos` Muestra cuántas solicitudes hay en cada estado, sin mostrar información personal. 

Las rutas de consulta permiten limitar la cantidad de resultados y consultar los siguientes mediante los parámetros `limite` y `desplazamiento`.

Para confirmar, rechazar o cancelar una inscripción es necesario enviar un motivo. Por ejemplo:

{
  "motivo": "Se revisaron los requisitos de inscripción."
}


### 3. ¿Qué implementé?

**Consulta de actividades e inscripciones**

Implementé las funciones necesarias para que los responsables puedan consultar las actividades que tienen asignadas y revisar las solicitudes de inscripción de cada sesión.

También se muestran los requisitos de las actividades para que el encargado pueda verificarlos antes de confirmar a una persona.

**Control de cupos**

Agregué una función que permite conocer los lugares disponibles en cada curso o taller.

El cálculo se realiza restando los participantes confirmados a la capacidad máxima de la sesión.

Por ejemplo, si un taller tiene capacidad para 30 personas y ya hay 24 confirmadas, quedan 6 lugares disponibles.

Además, se agregó un control para evitar que dos solicitudes se confirmen al mismo tiempo cuando solamente queda un lugar.

**Confirmación, rechazo y cancelación**

Implementé las funciones para que el personal autorizado pueda confirmar, rechazar o cancelar inscripciones.

Cada vez que se toma una decisión, el sistema guarda:

- El nuevo estado de la inscripción.
- El responsable que realizó el cambio.
- El motivo de la decisión.
- La fecha y hora en que se realizó.

También se registra el cambio en el historial de inscripciones.

Cuando se cancela una inscripción que estaba confirmada, el lugar vuelve a estar disponible. Esta acción no modifica los registros de asistencia.

**Seguridad y permisos**

Agregué validaciones para que solamente los usuarios con el permiso `confirmar_inscripciones` puedan consultar las listas completas y gestionar las solicitudes.

El permiso puede ser para una actividad específica o para todas las actividades, dependiendo de cómo esté asignado.

Estar registrado como personal de una sesión no es suficiente para obtener acceso si el usuario no tiene el permiso necesario.

**Protección de datos personales**

Para proteger la privacidad de los participantes, las consultas solamente proporcionan la información necesaria, como el nombre, identificador, estado de inscripción y fecha de solicitud.

No se muestran teléfonos, correos electrónicos ni documentos privados a los usuarios sin autorización.

Los creadores o proponentes aprobados que no tengan permiso de inscripción pueden consultar únicamente la cantidad de solicitudes por estado, sin ver los datos de las personas.

### 4. Archivos 

`Back/inscripciones.py` Contiene las funciones del backend para consultar inscripciones, revisar cupos y gestionar solicitudes. 

`Back/main.py` Se modificó para integrar las nuevas rutas al servidor FastAPI. 

 `Supabase/inscripciones_responsable.sql` Contiene el código SQL necesario para realizar las operaciones de forma segura y registrar los cambios. 

El archivo SQL utiliza una función RPC de PostgreSQL, que permite realizar varias operaciones relacionadas dentro de una sola transacción. Esto evita que una inscripción se actualice parcialmente si ocurre un error.

**Importante:** el script SQL ya está preparado, pero todavía no se ha aplicado a la base de datos `CECANbd`.


### 7. Pendientes

Antes de considerar terminada la implementación, todavía se necesita:

1. Aplicar el archivo `Supabase/inscripciones_responsable.sql` en el entorno correspondiente, después de revisarlo.

---------------------------------------------------------------------------

Durante este Sprint 5 desarrollé el backend para consultar y administrar las inscripciones de cursos y talleres.

Se implementaron siete endpoints que permiten consultar actividades, revisar participantes, verificar los cupos disponibles y gestionar solicitudes mediante confirmaciones, rechazos y cancelaciones.

También se agregaron validaciones de permisos, protección de datos personales y registros de las decisiones realizadas por los responsables.

