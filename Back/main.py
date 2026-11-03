"""Aplicación FastAPI y registro de rutas de Biblioteca Alameda."""

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from Back.conexion import crear_cliente
from Back.autenticacion import router as autenticacion_router
from Back.recuperacion import router as recuperacion_router
from Back.perfil import router as perfil_router

app = FastAPI(title="Biblioteca Alameda", version="0.2.0")

app.include_router(autenticacion_router)
app.include_router(recuperacion_router)
app.include_router(perfil_router)


@app.exception_handler(RequestValidationError)
async def errores_validacion(_request, error):
    """Evita devolver contraseñas y tokens en los errores de validación."""
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"loc": list(e["loc"]), "type": e["type"], "msg": e["msg"]}
                for e in error.errors()
            ]
        },
    )


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
            detail="No fue posible verificar la conexión con la base de datos.",
        ) from None
    return {"estado": "conectada", "servicio": "Supabase"}
