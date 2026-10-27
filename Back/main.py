
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from Back.conexion import crear_cliente
from Back.registro import router as registro_router
from Back.administracion import router as administracion_router
from Back.solicitudes import router as solicitudes_router
from Back.recuperacion import router as recuperacion_router
from Back.alta_asistida import router as alta_asistida_router

app = FastAPI(title='Biblioteca Alameda', version='0.1.0')
app.include_router(registro_router)
app.include_router(administracion_router)
app.include_router(solicitudes_router)
app.include_router(recuperacion_router)
app.include_router(alta_asistida_router)


@app.exception_handler(RequestValidationError)
async def errores_validacion(_request, error):
    # FastAPI incluye por defecto el valor rechazado; omitirlo protege contraseñas y datos personales.
    return JSONResponse(status_code=422, content={'detail': [
        {'loc': list(e['loc']), 'type': e['type'], 'msg': e['msg']}
        for e in error.errors()
    ]})


@app.get('/salud')
def salud():
    return {'estado': 'disponible'}


@app.get('/salud/bd')
def salud_bd():
    try:
        # Consulta real y mínima a una tabla con lectura pública, sin devolver datos.
        crear_cliente().table('actividad').select('id').limit(1).execute()
    except Exception:
        raise HTTPException(status_code=503, detail='No fue posible verificar la conexión con la base de datos.') from None
    return {'estado': 'conectada', 'servicio': 'Supabase'}
