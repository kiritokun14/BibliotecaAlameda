
from fastapi import FastAPI, HTTPException

from Back.conexion import crear_cliente
from Back.recuperacion import router as recuperacion_router

app = FastAPI(
    title="Biblioteca Alameda",
    version="0.2.0"
)

# Rutas para la recuperacion de contras
app.include_router(recuperacion_router)


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
