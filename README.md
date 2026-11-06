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
