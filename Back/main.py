from fastapi import FastAPI, HTTPException

# Importaciones locales dentro de la misma carpeta
from conexion import crear_cliente
import registro_menores
import solicitudes
import auth_prueba

app = FastAPI(title="Biblioteca Alameda", version="0.1.0")


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


# ------------------------------------------------------------------
# ROUTERS INCLUIDOS
# ------------------------------------------------------------------
app.include_router(registro_menores.router)
app.include_router(solicitudes.router)

#Prueba 
app.include_router(auth_prueba.router)