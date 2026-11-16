import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import '../../publico/tramites/Tramites.css';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { listarReportesForo, resolverReporteForo, medidasDisponibles, type MedidaForo, type ReporteForo } from '../../../servicios/moderacion';
import { mensajeError } from '../../../servicios/api';
import { consultarPendientesForo, revisarContenidoForo, type ContenidoPendiente } from '../../../servicios/foro';

const etiquetas: Record<MedidaForo, string> = { revisar: 'Tomar en revisión', ocultar: 'Ocultar contenido', retirar: 'Retirar contenido', descartar: 'Descartar reporte sin cambiar el contenido' };
export default function ModeracionForo() {
    const identidad = useContext(ContextoPanel);
    return <PanelLayout titulo="Moderación del foro"><div key={identidad?.acceso.usuarioId ?? 'sin-cuenta'}><RevisionPrevia /><Bandeja /></div></PanelLayout>;
}
function RevisionPrevia() {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0); const clave = `${pagina}:${intento}`;
    const [carga, setCarga] = useState<{ clave: string; total?: number; contenidos?: ContenidoPendiente[]; error?: string }>({ clave: '' });
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        consultarPendientesForo(pagina).then(datos => { if (vigente) setCarga({ clave, ...datos }); }).catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [pagina, clave]);
    return <Pagina><h1>Publicaciones por revisar</h1><p>Temas nuevos, primeras respuestas y ediciones propias. Publicar exige revisar las normas y registrar un motivo.</p>
        {!actual && <p role="status">Cargando publicaciones…</p>}{actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
        {actual?.contenidos && <><p role="status">{actual.total} publicaciones pendientes.</p>{actual.contenidos.map(c => <RevisionPendiente key={`${c.id}:${c.version}`} contenido={c} alGuardar={() => recargar(x => x + 1)} />)}
            <button className="boton-panel" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button><span> Página {pagina + 1} </span><button className="boton-panel" disabled={(pagina + 1) * 20 >= (actual.total ?? 0)} onClick={() => setPagina(p => p + 1)}>Siguiente</button></>}
    </Pagina>;
}
function RevisionPendiente({ contenido, alGuardar }: { contenido: ContenidoPendiente; alGuardar: () => void }) {
    const [medida, setMedida] = useState<'publicar' | 'rechazar'>('publicar'); const [ocupado, setOcupado] = useState(false); const [error, setError] = useState(''); const bloqueo = useRef(false);
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const motivo = String(new FormData(e.currentTarget).get('motivo') ?? '').trim(); if (!motivo) return setError('Escribe el motivo de la decisión.');
        bloqueo.current = true; setOcupado(true); setError('');
        try { await revisarContenidoForo(contenido, medida, motivo); alGuardar(); } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    return <section className="cn-tarjeta"><h2>{contenido.titulo ?? 'Respuesta por revisar'}</h2><p>Folio: {contenido.id} · {contenido.tipo}</p><p style={{ whiteSpace: 'pre-wrap' }}>{contenido.texto}</p>
        <form onSubmit={enviar}><fieldset className="tramites-campos" disabled={ocupado}><label>Decisión<select value={medida} onChange={e => setMedida(e.target.value as 'publicar' | 'rechazar')}><option value="publicar">Publicar</option><option value="rechazar">Rechazar</option></select></label>
            <label>Motivo<textarea name="motivo" maxLength={2000} required /></label><label><input type="checkbox" required /> Revisé el contenido conforme a las normas del foro.</label><button className="boton-panel">{ocupado ? 'Guardando…' : 'Confirmar revisión'}</button></fieldset></form>
        {error && <p role="alert">{error} <button onClick={alGuardar}>Recargar versión actual</button></p>}
    </section>;
}
function Bandeja() {
    const [estado, setEstado] = useState('pendiente'); const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const clave = `${estado}:${pagina}:${intento}`;
    const [resultado, setResultado] = useState<{ clave: string; total?: number; reportes?: ReporteForo[]; error?: string }>({ clave: '' });
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        listarReportesForo(pagina, estado).then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, estado, pagina]);
    return <Pagina><EncabezadoTarjeta volver={{ texto: 'Volver al resumen', ruta: '/admin/resumen' }} etiqueta="T-078 · HU-27"
        titulo="Reportes del foro" texto="Atiende reportes dentro del ámbito autorizado. Cada medida requiere un motivo y conserva responsable e historial. Los logros no conceden permisos." />
        <label>Estado del reporte<select value={estado} onChange={e => { setEstado(e.target.value); setPagina(0); }}>
            <option value="">Todos</option><option value="pendiente">Pendiente</option><option value="en_revision">En revisión</option><option value="resuelto">Resuelto</option><option value="descartado">Descartado</option>
        </select></label>
        {!actual && <p role="status">Cargando reportes…</p>}
        {actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
        {actual?.reportes && <><p role="status">{actual.total} reportes encontrados.</p>{actual.reportes.map(reporte => <Ficha key={`${reporte.reporteId}:${reporte.actualizadoEn}`} reporte={reporte} alGuardar={() => recargar(x => x + 1)} />)}
            <button className="boton-panel" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button><span> Página {pagina + 1} </span>
            <button className="boton-panel" disabled={(pagina + 1) * 20 >= (actual.total ?? 0)} onClick={() => setPagina(x => x + 1)}>Siguiente</button></>}
    </Pagina>;
}
function Ficha({ reporte, alGuardar }: { reporte: ReporteForo; alGuardar: () => void }) {
    const opciones = medidasDisponibles(reporte); const [medida, setMedida] = useState<MedidaForo>(opciones[0] ?? 'descartar');
    const [ocupado, setOcupado] = useState(false); const [error, setError] = useState(''); const bloqueo = useRef(false);
    async function resolver(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const motivo = String(new FormData(e.currentTarget).get('motivo') ?? '').trim();
        if (!motivo) return setError('Escribe el motivo de la medida.');
        bloqueo.current = true; setOcupado(true); setError('');
        try { await resolverReporteForo(reporte, medida, motivo); alGuardar(); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    return <section className="cn-tarjeta"><h2>{reporte.contenido.titulo ?? 'Comentario reportado'}</h2>
        <p>Folio: {reporte.reporteId} · Estado: {reporte.estadoReporte.replace('_', ' ')}</p>
        <p><strong>Motivo del reporte:</strong> {reporte.motivo}</p><p><strong>Contenido ({reporte.contenido.estado}):</strong></p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{reporte.contenido.texto}</p>
        {reporte.resolucion && <p>Última resolución: {reporte.resolucion}</p>}
        {opciones.length > 0 && <form onSubmit={resolver}><fieldset className="tramites-campos" disabled={ocupado}>
            <label>Medida<select value={medida} onChange={e => setMedida(e.target.value as MedidaForo)}>{opciones.map(opcion => <option key={opcion} value={opcion}>{etiquetas[opcion]}</option>)}</select></label>
            <label>Motivo de la medida<textarea name="motivo" maxLength={2000} required /></label>
            <label><input type="checkbox" required /> Revisé el contenido y confirmo esta medida.</label>
            <button className="boton-panel">{ocupado ? 'Guardando…' : 'Registrar medida'}</button>
        </fieldset></form>}
        {error && <p role="alert">{error} <button onClick={alGuardar}>Recargar versión actual</button></p>}
        <details><summary>Historial de moderación</summary><ul>{reporte.historial.map((h, i) => <li key={i}>
            {new Date(h.fecha).toLocaleString('es-MX')} · {etiquetas[h.medida]} · {h.estadoAnterior} → {h.estadoNuevo} · {h.motivo} · Responsable: {h.realizadoPor}
        </li>)}</ul></details>
    </section>;
}
