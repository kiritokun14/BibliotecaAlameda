# Biblioteca Alameda

Backend inicial en FastAPI conectado a Supabase (proyecto CECANbd).

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
.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload
```

- Documentación de la API: http://127.0.0.1:8000/docs
- Estado del backend: http://127.0.0.1:8000/salud
- Verificación real de lectura en Supabase: http://127.0.0.1:8000/salud/bd

La verificación consulta `actividad` sin devolver registros. Que responda correctamente demuestra conexión y acceso de lectura; no demuestra permisos de escritura ni que estén implementados el registro, el inicio de sesión o la administración de cuentas.

La conexión usa la clave publicable y respeta las políticas de acceso de la base. Las operaciones privadas y de escritura se implementarán con la autenticación y autorización correspondientes. No se modifican tablas ni políticas desde esta aplicación inicial.

## Base de datos (Supabase)

El esquema de CECANbd vive en `supabase/migrations/`. Cada archivo es un cambio, en orden de fecha, y es la fuente de verdad: **no se modifican tablas a mano desde el dashboard de Supabase**.

```
supabase/
├── config.toml      # configuración de la base local
├── migrations/      # esquema, en orden (las 9 actuales ya están aplicadas en CECANbd)
└── seed.sql         # datos ficticios solo para la base local
```

### Preparación (una vez por persona)

Requisitos: Node.js y [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto.

```powershell
npx supabase login
npx supabase link --project-ref wggybysntrpnkfaefvxj
npx supabase migration list   # Local y Remote deben mostrar las mismas 9 versiones
```

### Base local de pruebas

```powershell
npx supabase start      # levanta Postgres, Auth y la API en Docker
npx supabase db reset   # borra la base local, aplica todas las migraciones y carga seed.sql
npx supabase stop       # al terminar
```

`npx supabase db reset` es el procedimiento para reiniciar la base de pruebas: siempre deja la misma base desde cero. `npx supabase status` muestra la URL local (`http://127.0.0.1:54321`), la clave publicable y el Studio local (`http://127.0.0.1:54323`). Para probar el backend contra la base local, usar esos valores en `Back/.env`.

Cuentas de prueba (en la base local la contraseña es `Prueba123!`; en CECANbd es otra):

| Correo | Rol / permiso |
| --- | --- |
| admin@biblioteca.test | administrador |
| editor@biblioteca.test | editor (preparar y publicar contenidos) |
| responsable@biblioteca.test | responsable de actividades (agenda, inscripciones, asistencia, foro, recompensas) |
| personal@biblioteca.test | Servicios Digitales: alta asistida, recuperación y atención |
| prestamos@biblioteca.test | préstamos: valida credenciales |
| lector@biblioteca.test | usuario con credencial validada y vigente |
| menor@biblioteca.test | usuario menor de edad, con tutor |

### Datos de prueba en CECANbd

CECANbd es la base de desarrollo del equipo (no la que se entregará a la biblioteca) y ya tiene cargados los datos de `supabase/seed.sql`. Están basados en la documentación del proyecto; los espacios, categorías y el número de nivel de las recompensas son provisionales.

- En CECANbd las cuentas de prueba usan **otra contraseña**, que no está en el repositorio (el repositorio es público). Pídela al equipo.
- Para volver a cargarlos: copiar `supabase/seed.sql`, cambiar `Prueba123!` por la contraseña del equipo y ejecutarlo en el SQL Editor de Supabase. Si los datos ya existen, marcará error por duplicados y no cambiará nada.
- Para borrarlos: ejecutar `supabase/limpiar_datos_prueba.sql` en el SQL Editor. Solo borra los registros de prueba (identificadores `00000000-0000-4000-…` y correos `@biblioteca.test`); si algún dato real depende de ellos, se detiene sin borrar nada.

### Hacer un cambio a la base

1. `npx supabase migration new descripcion_del_cambio` crea un archivo vacío en `supabase/migrations/`.
2. Escribir el SQL del cambio en ese archivo.
3. Probarlo con `npx supabase db reset`.
4. Abrir un PR con la migración y esperar revisión.
5. Ya aprobado, `npx supabase db push` lo aplica en CECANbd. `db push` no carga `seed.sql`.

Nunca editar una migración que ya se aplicó en CECANbd: si algo está mal, se corrige con una migración nueva.
