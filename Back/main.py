
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from Back.conexion import crear_cliente
from Back.agenda import router as agenda_router
from Back.registro import router as registro_router
from Back.administracion import router as administracion_router
from Back.solicitudes import router as solicitudes_router
from Back.recuperacion import router as recuperacion_router
from Back.alta_asistida import router as alta_asistida_router
from Back.contenidos import router as contenidos_router
from Back.publicacion import router as publicacion_router
from Back.imagenes import router as imagenes_router

from Back.contacto import router as contacto_router

from Back.bibliocomunidad import router as bibliocomunidad_router

from Back.asistente_fuentes import router as asistente_fuentes_router

from Back.lectura import router as lectura_router

from Back.perfil import router as perfil_router
from Back.actividades import router as actividades_router
from Back.credenciales import router as credenciales_router
from Back.propuestas import router as propuestas_router
from Back.avisos import router as avisos_router
from Back.foro_moderacion import router as foro_router
from Back.foro import router as participacion_foro_router

app = FastAPI(title='Biblioteca Alameda', version='0.1.0')
app.include_router(agenda_router)
app.include_router(registro_router)
app.include_router(administracion_router)
app.include_router(solicitudes_router)
app.include_router(recuperacion_router)
app.include_router(alta_asistida_router)
app.include_router(contenidos_router)
app.include_router(publicacion_router)
app.include_router(imagenes_router)
app.include_router(lectura_router)
app.include_router(asistente_fuentes_router)
app.include_router(bibliocomunidad_router)
app.include_router(contacto_router)
app.include_router(perfil_router)
app.include_router(actividades_router)
app.include_router(credenciales_router)
app.include_router(propuestas_router)
app.include_router(avisos_router)
app.include_router(foro_router)
app.include_router(participacion_foro_router)


@app.exception_handler(RequestValidationError)
async def errores_validacion(_request, error):
    # FastAPI incluye por defecto el valor rechazado; omitirlo protege contraseñas y datos personales.
    return JSONResponse(status_code=422, content={'detail': [
        {'loc': list(e['loc']), 'type': e['type'], 'msg': e['msg']}
        for e in error.errors()
    ]})


@app.get("/salud")
def salud():
    return {"estado": "disponible"}


@app.get("/salud/bd")
def salud_bd():
    try:
        crear_cliente().table("actividad").select("id").limit(1).execute()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="No fue posible verificar la conexión con la base de datos."
        ) from None

    return {
        "estado": "conectada",
        "servicio": "Supabase"
    }
