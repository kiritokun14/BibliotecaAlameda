# T-094 Cambios y cancelaciones de actividades y solicitudes

Titular: Luis. Apoyo: Roberto. Revisor: Aldahir. Historia relacionada: HU-17 / BDLAG-27. Predecesora oficial: T-093.

Estado: implementación local y pruebas automatizadas preparadas para revisión. La revisión de Aldahir y la validación contra la base compartida siguen pendientes. No se acredita cierre de T-093 ni se contabilizan horas trabajadas a partir de la estimación de 20 horas de la tarjeta.

## Alcance

Se conserva la implementación de actividades aprobadas descrita en `HU-17.md`: solicitudes por sesión, resolución institucional, aplicación, liberación de ocupación, historial y avisos del portal.

Este complemento incorpora corrección y cancelación de propuestas sin actividad vinculada, edición de solicitudes propias de visita o espacio aún en revisión, versiones completas de los expedientes y comprobación de versión para cancelar o responder alternativas de espacios.

Las solicitudes de credencial no forman parte de este complemento. Las propuestas vinculadas a una actividad se gestionan mediante HU-17. La cancelación directa por el titular de propuestas se limita a borrador, en revisión o requiere corrección; las propuestas aprobadas sin actividad admiten corrección y regresan a revisión. Las reservas de espacio aprobadas conservan su atención autorizada por el personal: el titular no sobrescribe ni cancela una reserva aprobada desde la edición de solicitudes pendientes.

## Criterios y evidencia

| Criterio oficial | Comportamiento | Evidencia |
| --- | --- | --- |
| Solo el titular actúa sobre lo propio | La base toma la identidad de la sesión; rechaza correcciones y cancelaciones de expedientes ajenos. El personal conserva sus operaciones de resolución y su ámbito en actividades. | Pruebas HTTP, SQL de T-094 y regresión SQL de HU-17. |
| Correcciones guardan versión y motivo | Se exige motivo separado de la descripción y la versión leída. Se conservan copias anterior y posterior con responsable y fecha en la tabla privada `versionSolicitud`. | Pruebas de contenido de ambas copias, rechazo de versiones obsoletas y campos obligatorios. |
| Cambio relevante reingresa a revisión | Corregir una propuesta, incluso aprobada sin actividad vinculada, la devuelve a `en_revision` y exige nueva resolución. Corregir una solicitud de espacio o responder una alternativa también vuelve a revisión y no reserva. | Pruebas SQL de transiciones, autorización y ocupación. |
| Cancelación conserva historial y expediente | Se cambia el estado, se exige motivo y se conserva el registro, las versiones y la bitácora. No se usa DELETE. | Pruebas SQL de existencia posterior y secuencia de versiones. |

## Archivos para desplegar

1. Revisar y aplicar `Supabase/cambios_actividad.sql` si aún no está instalado; no repetirlo si ya se aplicó.
2. Revisar y aplicar la migración nueva `Supabase/t094_correcciones_solicitudes.sql`. Parte de las migraciones vigentes de propuestas y espacios, incluida `correcciones_integracion_espacios.sql`; no repetir los archivos históricos sobre CECANbd.
3. Ejecutar `Supabase/pruebas_t094_solicitudes.sql` y la regresión `Supabase/pruebas_cambios_actividad.sql` en la base de prueba. Ambas terminan con ROLLBACK y no envían correos.
4. Publicar juntos backend y frontend. Las correcciones de propuestas ahora requieren `motivoCambio`; las cancelaciones y respuestas de espacio requieren `actualizadoEn`. Los clientes anteriores deben recargar y usar el formulario actualizado.

La migración cambia los triggers de versión de `propuestaEvento` y `solicitudEspacio` para que cada actualización avance la marca temporal incluso dentro de la misma transacción. No modifica el contenido de expedientes existentes ni asigna permisos a cuentas.

## Prueba manual para revisión

1. Iniciar sesión como usuario titular y enviar una propuesta desde `/proponer`. Abrirla desde Mis propuestas.
2. Corregir su horario o descripción, indicando un motivo. Comprobar mismo identificador, estado En revisión y apartado Versiones guardadas.
3. En otra sesión, intentar corregir o cancelar el identificador anterior como usuario ajeno: debe rechazarse.
4. Como personal autorizado, aprobar una propuesta sin publicarla. Como titular, corregirla: debe volver a revisión. Si ya se publicó y vinculó una actividad, usar el enlace a HU-17.
5. Cancelar una propuesta pendiente con motivo. Comprobar estado Cancelada y conservación de seguimiento y versiones.
6. En Mis espacios, abrir una solicitud pendiente y pulsar Editar datos solicitados. Cambiar fecha u horario, indicar motivo y guardar: debe permanecer o volver a revisión, sin confirmar reserva.
7. Abrir la misma solicitud en dos pestañas. Modificarla en una y luego cancelar o responder en la otra: la segunda debe recibir conflicto y requerir recargar.
8. Comprobar que cancelar una solicitud pendiente conserva el expediente y su motivo. Una solicitud de espacio aprobada sigue requiriendo atención del personal.
9. Realizar el recorrido de actividad aprobada de `HU-17.md` para los cambios y cancelaciones autorizados, avisos y liberación de espacios.

## Registro de validación y revisión

- Pruebas HTTP con servicios simulados: 224 aprobadas; no crean usuarios reales ni escriben en Supabase.
- Pruebas SQL: ejecutadas sobre PostgreSQL temporal en memoria con los esquemas del repositorio y una emulación local de las tablas y funciones básicas de Supabase Auth. No sustituyen la comprobación del esquema desplegado ni pruebas concurrentes entre conexiones reales.
- Frontend: 318 pruebas aprobadas y una omitida; lint y compilación correctos. Ejecutar los comandos de abajo para reproducir la validación.
- La suite SQL de T-094 y la regresión SQL de HU-17 pasaron con la migración nueva instalada en la base temporal. El recorrido manual de interfaz con cuentas reales sigue pendiente.
- El usuario confirmó que ambas pruebas SQL pasaron en Supabase y mostró la propuesta de prueba cancelada en Mis propuestas. La validación manual completa sigue pendiente.
- Revisión de Aldahir: pendiente. Fecha, observaciones y resolución de defectos deben registrarse después de la revisión real; no se da por aprobada con estas pruebas locales.

```powershell
# Desde la raíz
.\.venv\Scripts\python.exe -m unittest discover -s Back/tests -v

# Dentro de Front
npm.cmd test -- --maxWorkers=4
npm.cmd run lint
npm.cmd run build
```
