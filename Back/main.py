
from fastapi import FastAPI, HTTPException

from Back.conexion import crear_cliente

app = FastAPI(title='Biblioteca Alameda', version='0.1.0')


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
