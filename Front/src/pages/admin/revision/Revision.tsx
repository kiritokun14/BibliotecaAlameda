import ImagenContenido from "../../../components/ImagenContenido";
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { CampoTexto, Datos, EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import './Revision.css';
import { mensajeError } from '../../../servicios/api';
import { decidirContenido, ESTADOS_PUBLICACION, listarRevision, obtenerRevision, rutaPublica,
    type ContenidoRevision, type DecisionPublicacion, type ListaRevision } from '../../../servicios/publicacion';

const TIPOS: Record<string, string> = { noticia: 'Noticia', resena: 'Reseña', memoria: 'Memoria', acerca: 'Acerca de' };

function EstadoRevision({ estado }: { estado: string }) {
    return <span className={`revision-estado revision-estado--${estado}`}>{ESTADOS_PUBLICACION[estado] ?? estado}</span>;
}

const BASE = '/admin/contenidos/revision';
const CAMPOS: Record<string, string> = { categoria: 'Categoría', fecha: 'Fecha', destacar: 'Destacar', verMas: 'Mostrar enlace', textoAlternativo: 'Descripción de imagen', autoria: 'Autoría o fuente', genero: 'Género', anio: 'Año', clasificacion: 'Clasificación', vista: 'Presentación', tema: 'Tema', memoriaPublica: 'Incluir en memoria pública', seccion: 'Sección', lineaTiempo: 'Línea del tiempo', tipoPieza: 'Tipo de pieza', periodo: 'Periodo', registroArchivo: 'Registro en archivo', publicacion: 'Destino de publicación', permisoImagen: 'Permiso de imagen' };
const ACCIONES: Record<string, string> = { envio: 'Envío a revisión', observaciones: 'Observaciones', aprobacion: 'Autorización', publicacion: 'Publicación', rechazo: 'Rechazo', retiro: 'Retiro' };
const fecha = (valor: string) => new Date(valor).toLocaleString('es-MX');

export function BandejaRevision({ historial = false }: { historial?: boolean }) {
    const [estado, setEstado] = useState(historial ? 'historial' : 'en_revision');
    const [texto, setTexto] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(0);
    const [recarga, setRecarga] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; datos?: ListaRevision; error?: string }>({ clave: '' });
    const clave = JSON.stringify([estado, busqueda, pagina, recarga]);
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        listarRevision(estado, busqueda, pagina).then(datos => {
            if (vigente) setResultado({ clave, datos });
        }).catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, estado, busqueda, pagina]);
    const cambiarEstado = (valor: string) => { setEstado(valor); setPagina(0); };
    return <PanelLayout titulo="Contenidos" tema="revision"><Pagina>
        <header className="revision-encabezado">
            <div><p className="cn-etiqueta">Contenidos</p><h1 className="cn-titulo">{historial ? 'Historial de publicaciones' : 'Revisión y publicación'}</h1></div>
            <Link className="boton-panel revision-boton-secundario" to={historial ? BASE : `${BASE}/historial`}>{historial ? 'Pendientes de revisión' : 'Historial de publicaciones'}</Link>
        </header>
        <section className="revision-bandeja" aria-labelledby="titulo-bandeja">
        <h2 id="titulo-bandeja" className="revision-franja">{historial ? 'Publicaciones' : 'Contenidos por revisar'}</h2>
        <div className="cn-tarjeta revision-bandeja__cuerpo">
        <form className="cn-barra revision-filtros" onSubmit={e => { e.preventDefault(); setBusqueda(texto); setPagina(0); }}>
            <label>Estado <select className="cn-control" value={estado} onChange={e => cambiarEstado(e.target.value)}>
                {historial ? <option value="historial">Todo el historial publicado</option> : <><option value="">Todos los enviados</option><option value="en_revision">Por autorizar</option><option value="con_observaciones">Con observaciones</option><option value="rechazado">Rechazados</option></>}
                <option value="publicado">Publicados</option><option value="retirado">Retirados</option>
            </select></label>
            <label className="revision-busqueda">Buscar por folio o título <input className="cn-control" value={texto} maxLength={100} onChange={e => setTexto(e.target.value)} /></label>
            <button className="boton-panel revision-boton-principal" type="submit">Buscar</button>
            <button type="button" className="boton-panel revision-boton-secundario" onClick={() => setRecarga(x => x + 1)}>Actualizar</button>
        </form>
        {!actual && <p role="status">Cargando contenidos…</p>}
        {actual?.error && <div className="revision-alerta" role="alert"><p>{actual.error}</p><button className="boton-panel revision-boton-secundario" onClick={() => setRecarga(x => x + 1)}>Reintentar</button></div>}
        {actual?.datos && <>
            <p className="revision-conteo" role="status">{actual.datos.total} {actual.datos.total === 1 ? 'contenido' : 'contenidos'}</p>
            {actual.datos.total === 0 ? <p className="revision-vacio">No hay contenidos para estos filtros.</p> : <div className="cn-tabla-contenedor" role="region" aria-label="Contenidos enviados" tabIndex={0}><table className="cn-tabla">
                <colgroup><col style={{ width: '11%' }} /><col style={{ width: '24%' }} /><col style={{ width: '10%' }} /><col style={{ width: '14%' }} /><col style={{ width: '17%' }} /><col style={{ width: '15%' }} /><col style={{ width: '9%' }} /></colgroup>
                <thead><tr><th scope="col">Folio</th><th scope="col">Título</th><th scope="col">Tipo</th><th scope="col">Redactó</th><th scope="col">Estado</th><th scope="col">Enviado</th><th scope="col">Acción</th></tr></thead>
                <tbody>{actual.datos.contenidos.map(c => <tr key={c.folio}><td>{c.folio}</td><td>{c.titulo}</td><td>{TIPOS[c.tipo] ?? c.tipo}</td><td>{c.autor}</td><td><EstadoRevision estado={c.estado} /></td><td>{c.enviadoEn ? fecha(c.enviadoEn) : '—'}</td><td><Link to={`${BASE}/${c.folio}`}>{c.estado === 'en_revision' ? 'Revisar' : 'Ver'}</Link></td></tr>)}</tbody>
            </table></div>}
            <div className="cn-acciones revision-paginacion"><button className="boton-panel" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button>
                <span>Página {pagina + 1} de {Math.max(1, Math.ceil(actual.datos.total / 10))}</span>
                <button className="boton-panel" disabled={(pagina + 1) * 10 >= actual.datos.total} onClick={() => setPagina(x => x + 1)}>Siguiente</button></div>
        </>}
        </div></section>
    </Pagina></PanelLayout>;
}

export function HistorialPublicaciones() { return <BandejaRevision historial />; }

export function RevisarContenido({ propio = false }: { propio?: boolean }) {
    const { folio = '' } = useParams();
    const { pathname } = useLocation();
    const [recarga, setRecarga] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; contenido?: ContenidoRevision; error?: string }>({ clave: '' });
    const clave = JSON.stringify([folio, propio, recarga]);
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        obtenerRevision(folio, propio).then(contenido => { if (vigente) setResultado({ clave, contenido }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, folio, propio]);
    return <PanelLayout titulo="Contenidos" tema="revision"><Pagina>
        <EncabezadoTarjeta volver={{ texto: propio ? 'Volver a Mis contenidos' : 'Volver a revisión', ruta: propio ? '/admin/contenidos/editor' : BASE }}
            etiqueta={folio} titulo={propio ? 'Consulta de mi contenido' : 'Revisión del contenido'}
            texto="Consulta la versión enviada y el historial de decisiones." />
        {!actual && <p role="status">Cargando contenido…</p>}
        {actual?.error && <><p role="alert">{actual.error}</p><button onClick={() => setRecarga(x => x + 1)}>Reintentar</button></>}
        {actual?.contenido && <Detalle key={`${clave}:${pathname}`} contenido={actual.contenido} propio={propio} alRecargar={() => setRecarga(x => x + 1)} />}
    </Pagina></PanelLayout>;
}

function Detalle({ contenido: c, propio, alRecargar }: { contenido: ContenidoRevision; propio: boolean; alRecargar: () => void }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [nota, setNota] = useState('');
    const [referencia, setReferencia] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [confirmacion, setConfirmacion] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const bloqueo = useRef(false);
    const modo = pathname.endsWith('/cambios') ? 'observaciones' : pathname.endsWith('/rechazar') ? 'rechazar'
        : pathname.endsWith('/retirar') ? 'retirar' : 'publicar';
    const pendiente = c.estado === 'en_revision';
    const soloPrevia = pathname.endsWith('/vista-previa');
    const puedeDecidir = !propio && !soloPrevia && (pendiente || (modo === 'retirar' && c.estado === 'publicado'));
    async function decidir() {
        if (bloqueo.current) return;
        setError('');
        if (!confirmacion) return setError('Confirma que revisaste el contenido y la decisión.');
        const lineas = observaciones.split('\n').map(x => x.trim()).filter(Boolean);
        if (modo === 'publicar' && !referencia.trim()) return setError('Escribe la referencia de autorización institucional.');
        if (modo === 'observaciones' && (!lineas.length || lineas.length > 20 || lineas.some(x => x.length > 500))) return setError('Escribe de 1 a 20 observaciones, de máximo 500 caracteres cada una.');
        if ((modo === 'rechazar' || modo === 'retirar') && !nota.trim()) return setError('Escribe el motivo.');
        bloqueo.current = true; setGuardando(true);
        const datos: DecisionPublicacion = modo === 'publicar' ? { referencia: referencia.trim(), ...(nota.trim() ? { nota: nota.trim() } : {}) }
            : modo === 'observaciones' ? { observaciones: lineas, ...(nota.trim() ? { nota: nota.trim() } : {}) } : { nota: nota.trim() };
        try {
            await decidirContenido(c, modo, datos);
            navigate(`${BASE}/${c.folio}`, { replace: true });
            alRecargar();
        } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <>
        <Datos filas={[["Folio", c.folio], ["Estado", <EstadoRevision estado={c.estado} />], ["Redactó", c.autor], ["Última actualización", fecha(c.actualizadoEn)]]} />
        <article className="cn-tarjeta revision-articulo"><h2>{c.titulo}</h2><p>{c.resumen}</p><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.cuerpo}</div>
            <dl className="revision-metadatos">{Object.entries(c.datos).map(([campo, valor]) => <div key={campo}><dt>{CAMPOS[campo] ?? campo}</dt><dd>{typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}</dd></div>)}</dl>
            {c.tieneImagen ? <ImagenContenido folio={c.folio} version={c.actualizadoEn} revision={!propio} texto={String(c.datos.textoAlternativo ?? c.titulo)} /> : <p>Sin imagen principal.</p>}</article>
        {c.estado === 'publicado' && <a href={rutaPublica(c)} target="_blank" rel="noopener noreferrer">Ver publicación en el portal ↗</a>}
        {!propio && !soloPrevia && <div className="cn-acciones revision-decisiones">
            {pendiente && <><Link className="boton-panel" aria-current={modo === 'publicar' ? 'page' : undefined} to={`${BASE}/${c.folio}`}>Autorizar y publicar</Link><Link className="boton-panel" aria-current={modo === 'observaciones' ? 'page' : undefined} to={`${BASE}/${c.folio}/cambios`}>Pedir cambios</Link><Link className="boton-panel" aria-current={modo === 'rechazar' ? 'page' : undefined} to={`${BASE}/${c.folio}/rechazar`}>Rechazar</Link></>}
            {c.estado === 'publicado' && <Link className="boton-panel" to={`${BASE}/${c.folio}/retirar`}>Retirar del portal</Link>}
        </div>}
        {puedeDecidir && <section className="cn-tarjeta revision-formulario"><h2>{modo === 'publicar' ? 'Autorizar y publicar ahora' : modo === 'observaciones' ? 'Pedir cambios al editor' : modo === 'rechazar' ? 'Rechazar contenido' : 'Retirar publicación'}</h2>
            {modo === 'publicar' && <CampoTexto id="referencia-publicacion" etiqueta="Referencia de autorización institucional" obligatorio><input id="referencia-publicacion" className="cn-control" maxLength={200} value={referencia} onChange={e => setReferencia(e.target.value)} disabled={guardando} /></CampoTexto>}
            {modo === 'observaciones' && <CampoTexto id="observaciones-publicacion" etiqueta="Observaciones: una por línea (máximo 20, de 500 caracteres cada una)" obligatorio><textarea id="observaciones-publicacion" className="cn-control cn-control--area" value={observaciones} onChange={e => setObservaciones(e.target.value)} disabled={guardando} /></CampoTexto>}
            <CampoTexto id="nota-publicacion" etiqueta={modo === 'rechazar' || modo === 'retirar' ? 'Motivo' : 'Nota opcional'} obligatorio={modo === 'rechazar' || modo === 'retirar'}><textarea id="nota-publicacion" className="cn-control cn-control--area" maxLength={1000} value={nota} onChange={e => setNota(e.target.value)} disabled={guardando} /></CampoTexto>
            <label className="revision-confirmacion"><input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} disabled={guardando} /> Revisé el contenido y confirmo esta decisión.</label>
            {error && <p role="alert">{error} <button onClick={alRecargar} disabled={guardando}>Recargar versión actual</button></p>}
            <div className="cn-acciones"><button className="boton-panel revision-boton-principal" disabled={guardando} onClick={() => void decidir()}>{guardando ? 'Guardando decisión…' : 'Confirmar decisión'}</button></div>
        </section>}
        <section className="cn-tarjeta revision-historial"><h2>Historial de decisiones</h2>{c.historial.length === 0 ? <p>Sin decisiones registradas.</p> : <ol>{c.historial.map((evento, i) => <li key={`${evento.fecha}:${i}`}>
            <strong>{ACCIONES[evento.accion] ?? evento.accion}</strong> · {fecha(evento.fecha)} · {evento.responsable}
            {evento.detalles.referencia && <p>Autorización: {evento.detalles.referencia}</p>}{evento.nota && <p>{evento.nota}</p>}
            {evento.observaciones.length > 0 && <ul>{evento.observaciones.map((texto, n) => <li key={n}>{texto}</li>)}</ul>}
        </li>)}</ol>}</section>
    </>;
}

export function ContenidoPropio() { return <RevisarContenido propio />; }
export default RevisarContenido;
