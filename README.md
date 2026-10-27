# Biblioteca Alameda

Backend inicial en FastAPI conectado a Supabase (proyecto CECANbd).

Trabajo realizado y pendientes de Roberto: [AVANCES_ROBERTO.md](AVANCES_ROBERTO.md).

## Preparación en Windows

Desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r Back/requirements.txt
Copy-Item Back/.env.example Back/.env
```

Completar `Back/.env` con la clave **publicable** de CECANbd. El archivo local está excluido de Git; cada integrante configura el suyo. No colocar claves secretas en el frontend ni en archivos versionados.

## Ejecutar

```powershell
.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload --reload-dir Back
```

- Documentación de la API: http://127.0.0.1:8000/docs
- Estado del backend: http://127.0.0.1:8000/salud
- Verificación real de lectura en Supabase: http://127.0.0.1:8000/salud/bd

La verificación consulta `actividad` sin devolver registros. Que responda correctamente demuestra conexión y acceso de lectura; no demuestra permisos de escritura ni que estén implementados el registro, el inicio de sesión o la administración de cuentas.

La conexión usa la clave publicable y respeta las políticas de acceso de la base. El autorregistro usa Supabase Auth y el disparador privado descrito abajo; no requiere una clave secreta en el backend ni abre escrituras públicas sobre los perfiles.

## T-027: autorregistro (habilitado localmente)

`POST /cuentas/registro` recibe datos personales, domicilio, correo, contraseña, aceptación del aviso y contacto del tutor cuando la persona es menor de 18 años. El segundo apellido y número interior son opcionales; se omiten o se envían como `null`. Teléfonos de 10 dígitos y código postal de 5. La contraseña tiene entre 8 y 128 caracteres y no se guarda en el perfil. FastAPI no devuelve los valores rechazados en los errores de validación.

Los nombres de campos y el ejemplo se consultan en `/docs`. El domicilio del usuario es obligatorio conforme a CU-05/HU-05 y la BD, aunque aún no aparece en las pantallas revisadas de Figma. El tutor tiene su propio domicilio; no obtiene una cuenta ni acceso automático a la cuenta del menor. La confirmación de contraseña se valida en el formulario, no se persiste ni se manda a Auth como metadata.

### Guardado en la base compartida

La parte de registro atómico de `Supabase/registro_usuarios.sql` **ya se aplicó en CECANbd con autorización**. Añade `perfil.avisoAceptadoEn` y un disparador privado de inserción en `auth.users` que valida y crea perfil y tutor en la misma transacción. Si fallan los datos, se cancela el alta completa. El registro no concede roles del personal, credenciales ni escrituras públicas; la corrección vigente asigna automáticamente el rol básico Usuario. La metadata nunca se usa para autorizar acciones.

El bloque `limpiar_metadata_registro` ya está aplicado y se verificó que elimina únicamente el payload `registro` en actualizaciones de Auth. La cuenta de prueba conserva su perfil y su correo confirmado, sin esa copia de datos personales en metadata.

El disparador es `SECURITY DEFINER`, privado y sin ejecución pública: el servicio Auth no dispone de permiso directo para escribir perfiles. **Toda nueva alta de Auth necesita los datos de registro completos**, incluidas las altas desde herramientas administrativas o futuros proveedores de acceso. No modifica usuarios existentes ni sincroniza cambios posteriores de metadata hacia perfiles. Coordinar este contrato con Luis antes de activar otros métodos de alta.

En este equipo `REGISTRO_HABILITADO=true` ya habilita el endpoint. Para otros entornos permanece desactivado por defecto hasta configurar y verificar la misma estructura. Se comprobó un alta real mediante Auth: perfil creado, correo enviado y confirmado, sin roles del personal. La redirección posterior apunta actualmente a localhost; en un celular no es accesible. Falta acordar con Alda la URL de retorno del frontend y validar el texto definitivo del aviso; las pantallas existentes ya están conectadas para la prueba local; no se ha publicado un servidor de producción.

Una solicitud aceptada devuelve 202 con respuesta genérica tanto para correo nuevo como para correo ya registrado; no revela existencia de cuentas ni devuelve sesiones, UUID o contraseñas. Los límites de Auth se devuelven como 429 y las indisponibilidades como 503. Un fallo de entrega de correo puede dejar una cuenta pendiente de verificación en Auth; no se afirma que el mensaje haya llegado ni se crea otra cuenta para reintentar. El reenvío y el inicio de sesión se coordinan con las tareas de autenticación.

### Pruebas locales

```powershell
.\.venv\Scripts\python.exe -m unittest Back.tests.test_registro -v
```

Las pruebas de autorregistro simulan Auth, no envían correos ni crean usuarios reales. Comprueban adultos, menores, límite de 18 años, campos obligatorios, rechazo de privilegios enviados por el cliente, duplicados, fallos y ausencia de contraseñas en respuestas.

`Supabase/pruebas_registro.sql` se ejecutó contra CECANbd con `ROLLBACK`: verificó adulto, menor con tutor, ocho casos inválidos sin filas residuales, aceptación del aviso, aislamiento de metadata y ausencia de roles del personal o escrituras públicas. La revisión de seguridad de Supabase no reportó alertas. Las pruebas reversibles no dejan registros ficticios. Posteriormente se confirmó el correo de la cuenta real autorizada; la redirección del correo sigue pendiente del frontend.

La comprobación manual opcional `python -m Back.tests.verificar_auth_real --correo CORREO_AUTORIZADO` llama a Auth con datos ficticios y una contraseña aleatoria que no se imprime. Solo se ejecuta con autorización sobre ese correo y coordinando después la limpieza de la cuenta de prueba. No ejecutar repetidamente: aplica el límite de envíos de Auth.


La última revisión de seguridad no reportó problemas en las funciones/tablas de registro; Auth sí advierte que la protección contra contraseñas filtradas está deshabilitada. No se modificó esa configuración. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Modelo de acceso vigente

CECANbd distingue Usuario / Cliente, Editor, Responsable de actividades y Administrador del portal, conforme a 3.1b. Visitante conserva acceso público. Servicios Digitales y Préstamos se representan mediante concesiones específicas sin requerir Editor, como las casillas de Figma. El usuario puede proponer eventos y solicitar inscripción; enviar no equivale a aprobar o publicar.

Supabase/alinear_actores_documentados.sql ya se aplicó después de las migraciones anteriores. El autorregistro concede únicamente Usuario / Cliente. La administración requiere una asignación expresa en Supabase y sigue pendiente la comprobación HTTP con una cuenta administradora real. Los endpoints de los demás módulos no quedan implementados por declarar sus permisos. Verificación vigente: 43 pruebas del backend, 12 de integración del frontend y pruebas SQL reversibles de registro y administración.

## Ejecutar el frontend integrado

En otra terminal, dentro de Front, ejecutar npm ci y luego npm run dev. Abrir http://localhost:5173, manteniendo FastAPI en el puerto 8000. El servidor de desarrollo de Vite reenvía /api al backend; los dos procesos deben estar encendidos. La compilación estática requiere configurar ese mismo reenvío en el servidor que la publique.

El frontend obtiene únicamente URL y clave publicable desde /cuentas/configuracion. No requiere copiar claves a Front ni usar claves secretas. El registro llama a FastAPI; el acceso, reenvío y recuperación usan Supabase Auth y la sesión se comprueba contra el backend.

FRONTEND_URL en Back/.env permite configurar el origen de retorno del registro; por defecto es http://localhost:5173. En Supabase Auth → URL Configuration se deben permitir las rutas /auth/retorno?flujo=confirmacion y /auth/retorno?flujo=recuperacion de ese origen. La lista permitida todavía requiere verificación en el panel. localhost funciona en la computadora de desarrollo; abrirlo desde el teléfono apunta al propio teléfono.

Pruebas: npm test, npm run build y npm run lint dentro de Front; python -m unittest discover -s Back/tests -v desde la raíz usando el entorno virtual. El avance individual y los pendientes se mantienen únicamente en AVANCES_ROBERTO.md.

## Scripts de base de datos y T-034

Los scripts de Supabase incluidos son el historial de cambios ya aplicados en CECANbd, no una exportación completa de la base ni un instalador para ejecutar sin revisión. El esquema inicial está en Supabase/Main.sql; el orden completo para reconstruir la base desde cero, los datos de prueba y su limpieza se describen en [Supabase/README.md](Supabase/README.md). El orden histórico fue registro_usuarios.sql, administracion_cuentas.sql, endurecimiento_administracion.sql, corregir_roles_y_capacidades.sql y alinear_actores_documentados.sql. El último define el catálogo vigente; los anteriores contienen modelos provisionales ya sustituidos. No volver a ejecutar los scripts antiguos sobre CECANbd. Las suites pruebas_registro.sql y pruebas_administracion.sql usan ROLLBACK y no dejan sus registros ficticios.

T-034, adaptada del trabajo de Stephanie: GET /mis-solicitudes requiere un Bearer token válido y devuelve solicitudes de espacios, credenciales y propuestas de eventos del titular. limite y desplazamiento se aplican por categoría; los totales incluyen todos los registros propios. No exige rol Administrador. Devuelve estados actuales, no una bitácora de transiciones. La pantalla de seguimiento todavía no está implementada.
