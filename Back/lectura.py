"""T-056: compatibilidad de consultas de lecturas con la publicación vigente.

Reutiliza la proyección autorizada; no amplía permisos de tablas ni firma evidencias.
Los adjuntos y evidencias conservan su modelo de acceso existente.
"""
from fastapi import APIRouter, HTTPException, Query
from Back.publicacion import consultar_publicados
router=APIRouter(prefix='/public',tags=['Lecturas públicas'])

def _listar(autor,tema,tipo,busqueda,page,limit):
    if tipo not in (None,'contenido','resena','memoria'):
        raise HTTPException(400,'tipoRecurso debe ser contenido, resena o memoria.')
    if (page-1)*limit+limit>1000:
        raise HTTPException(400,'La ventana de consulta no puede superar 1000 elementos.')
    filas=[]
    # Proyección segura compartida con Inicio, Noticias y Lecturas; sin acceder a columnas privadas.
    for desplazamiento in range(0,1000,50):
        lote=consultar_publicados('memoria' if tipo=='memoria' else 'resena' if tipo=='resena' else None,
                                  limite=50,desplazamiento=desplazamiento)
        filas.extend(c for c in lote if c['tipo'] in ('resena','memoria'))
        if len(lote)<50: break
    def coincide(c):
        datos=c.get('datos') or {}
        return (not autor or autor.casefold() in str(datos.get('autoria','')).casefold()) and (
            not tema or tema.casefold() in str(datos.get('tema',datos.get('genero',''))).casefold()) and (
            not busqueda or busqueda.casefold() in (c['titulo']+' '+c.get('resumen','')+' '+c.get('cuerpo','')).casefold())
    filas=[c for c in filas if coincide(c)]
    filas.sort(key=lambda c:(c['publicadoEn'],c['folio']),reverse=True)
    inicio=(page-1)*limit
    return {'items':filas[inicio:inicio+limit],'page':page,'limit':limit}

@router.get('/lecturas-y-resenas')
def listar_lecturas_resenas_memoria(autor:str|None=Query(None,max_length=100),
    tema:str|None=Query(None,max_length=100),tipo_recurso:str|None=Query(None,alias='tipoRecurso'),
    busqueda:str|None=Query(None,max_length=100),page:int=Query(1,ge=1),limit:int=Query(20,ge=1,le=100)):
    return _listar(autor,tema,tipo_recurso,busqueda,page,limit)

@router.get('/lecturas/{slug}')
def obtener_lectura_publica(slug:str):
    filas=consultar_publicados(None,slug)
    if not filas or filas[0]['tipo'] not in ('resena','memoria'):
        raise HTTPException(404,'La lectura no existe o no está publicada.')
    return filas[0]

@router.get('/memoria-publica')
def listar_memoria_publica(tema:str|None=Query(None,max_length=100),
    busqueda:str|None=Query(None,max_length=100),page:int=Query(1,ge=1),limit:int=Query(20,ge=1,le=100)):
    return _listar(None,tema,'memoria',busqueda,page,limit)
