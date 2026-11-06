### HU-13 / T-072: solicitudes de atención para credenciales - Stephanie

Se implementó el backend de solicitudes para obtener o renovar la credencial bibliotecaria en `Back/credenciales.py`, integrado en la aplicación FastAPI. Los endpoints requieren una sesión válida de Supabase:

- `POST /api/credenciales/solicitudes`: registra una solicitud propia, rechaza otra activa (`recibida`, `en_atencion` o `cita_programada`) y deja que la base aplique el estado inicial `recibida`.
- `GET /api/credenciales/solicitudes/me`: consulta las solicitudes del titular ordenadas de más reciente a más antigua.
- `GET /api/credenciales/solicitudes`: permite al personal con capacidad global `validar_credenciales` consultar y filtrar solicitudes. Un RPC hace el JOIN de lectura con `perfil` y entrega solo nombres, apellidos, teléfono y municipio.
- `PATCH /api/credenciales/solicitudes/{id}`: permite al personal autorizado actualizar el estado, la cita y las observaciones; registra su UUID en `atendidaPor`.

El envío no consulta ni modifica `credencialBibliotecaria` y no valida titulares. `Supabase/solicitudCredencial.sql` contiene las políticas RLS y el RPC requeridos, sin crear ni alterar tablas o registros. El RPC es necesario porque el RLS vigente de `perfil` limita la lectura directa al propio titular; evita ampliar el acceso del personal a otros campos personales. **El script está preparado, pero todavía no se ha aplicado ni validado contra CECANbd.**

Las pruebas con mocks están en `Back/tests/test_credenciales.py`; cubren estado inicial, ausencia de escrituras a la tabla de credenciales, duplicados, historial propio, consulta del personal con perfil mínimo y actualización de cita. Verificación local: 6 pruebas de credenciales y 50 pruebas combinadas de credenciales y módulos relacionados pasaron con `unittest`; también pasaron `compileall` y `git diff --check`.

### HU-15 / T-075: propuestas de eventos y clubes

Se implementó el backend en `Back/propuestas.py`, registrado en FastAPI. `POST /api/propuestas` crea la propuesta del usuario autenticado en estado `en_revision` y devuelve su UUID de seguimiento. La descripción debe declarar que la actividad es abierta al público y sin fines de lucro; los campos requeridos también se validan antes de acceder a Supabase. `GET /api/propuestas/me` lista las propuestas propias; `GET /api/propuestas` permite al personal con capacidad global `gestionar_actividades` o `moderar_foro` filtrar y consultar propuestas junto con los datos mínimos del perfil. `PATCH /api/propuestas/{id}` actualiza estado y observaciones, registrando al responsable en `revisadoPor`.

El envío no permite que el cliente imponga el estado, el proponente, `actividadId` ni datos de aprobación. La actualización tampoco permite asociar o crear una actividad; una actividad no se publica por el hecho de crear o revisar una propuesta. `Supabase/propuestaEvento.sql` prepara las políticas RLS y un RPC para el JOIN del perfil mínimo, sin alterar tablas ni registros existentes. El script aún no se ha aplicado ni validado contra CECANbd.

Las pruebas con mocks están en `Back/tests/test_propuestas.py`. Se ejecutaron 9 pruebas con pytest; también pasaron `compileall` y `git diff --check`.
