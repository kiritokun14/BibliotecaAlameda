import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { Datos, EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import '../../publico/tramites/Tramites.css';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { consultarTramite, listarTramites, resolverTramite, estadoTramite, ESTADOS_CREDENCIAL, ESTADOS_PROPUESTA,
    type ListaTramites, type SolicitudAtencion, type TipoTramite } from '../../../servicios/tramites';
import { mensajeError } from '../../../servicios/api';
import { FichaTramite } from '../../publico/tramites/piezas';

export default function AtencionTramites() {
    const { pathname } = useLocation(); const { folio } = useParams();
    const identidad = useContext(ContextoPanel);
    const tipo: TipoTramite = pathname.includes('/credenciales') ? 'credencial' : 'propuesta';
    const base = `/admin/atencion/${tipo === 'credencial' ? 'credenciales' : 'propuestas'}`;
    const [pagina, setPagina] = useState(0); const [filtro, setFiltro] = useState(''); const [busqueda, setBusqueda] = useState('');
    const [intento, recargar] = useState(0);
    const clave = JSON.stringify([tipo, folio, identidad?.acceso.usuarioId, pagina, filtro, busqueda, intento]);
    const [resultado, setResultado] = useState<{ clave: string; lista?: ListaTramites; solicitud?: SolicitudAtencion; error?: string }>({ clave: '' });
    const actual = resultado.clave === clave ? resultado : undefined;
    const estados = tipo === 'credencial' ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA;
    useEffect(() => {
        let vigente = true;
        const consulta = folio ? consultarTramite(tipo, folio).then(solicitud => ({ solicitud }))
            : listarTramites(tipo, false, pagina, filtro, busqueda).then(lista => ({ lista }));
        consulta.then(datos => { if (vigente) setResultado({ clave, ...datos }); }).catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, tipo, folio, pagina, filtro, busqueda]);
    function filtrar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); const datos = new FormData(e.currentTarget);
        setFiltro(String(datos.get('estado') ?? '')); setBusqueda(String(datos.get('buscar') ?? '')); setPagina(0);
    }
    return <PanelLayout titulo="Atención"><Pagina>
        <EncabezadoTarjeta volver={{ texto: 'Volver a la bandeja', ruta: base }} etiqueta="Solicitudes reales"
            titulo={tipo === 'credencial' ? 'Atención de solicitudes de credencial' : 'Revisión de propuestas de eventos'}
            texto={tipo === 'credencial' ? 'Registra la atención y las citas. Este trámite no emite ni valida una credencial.' : 'Revisa, pide correcciones o resuelve propuestas. Aprobarlas no las publica automáticamente.'} />
        {!actual && <p role="status">Cargando solicitudes…</p>}
        {actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
        {!folio && <form onSubmit={filtrar} className="tramites-campos"><label>Estado<select name="estado" defaultValue={filtro}><option value="">Todos</option>{Object.entries(estados).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></label>
            <label>{tipo === 'credencial' ? 'Buscar por folio o nombre' : 'Buscar por folio o título'}<input name="buscar" maxLength={100} defaultValue={busqueda} /></label><button className="boton-panel">Filtrar</button></form>}
        {actual?.lista && <><p role="status">{actual.lista.total} solicitudes encontradas</p>
            <div className="cn-tabla-contenedor"><table className="cn-tabla"><thead><tr><th>Folio</th><th>Solicitud</th><th>Solicitante</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>{actual.lista.solicitudes.map(s => <tr key={s.id}><td>{s.id}</td><td>{s.tituloPropuesta || s.tipoSolicitud}</td><td>{s.perfil?.nombres} {s.perfil?.primerApellido}</td><td>{estados[estadoTramite(s)]}</td><td><Link to={`${base}/${s.id}`}>Atender solicitud</Link></td></tr>)}</tbody></table></div>
            <button disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button><span> Página {pagina + 1} </span><button disabled={(pagina + 1) * 20 >= actual.lista.total} onClick={() => setPagina(x => x + 1)}>Siguiente</button>
        </>}
        {actual?.solicitud && <section className="cn-tarjeta"><FichaTramite solicitud={actual.solicitud} />
            <Datos filas={[["Última actualización", new Date((actual.solicitud.actualizadaEn ?? actual.solicitud.actualizadoEn)!).toLocaleString('es-MX')]]} />
            <Resolver key={actual.solicitud.actualizadaEn ?? actual.solicitud.actualizadoEn} tipo={tipo} solicitud={actual.solicitud} alGuardar={() => recargar(x => x + 1)} />
            {actual.solicitud.estadoRevision === 'aprobada' && <p>La programación y publicación se realiza en la sección Actividades por el personal con esos permisos.</p>}
        </section>}
    </Pagina></PanelLayout>;
}
function Resolver({ tipo, solicitud: s, alGuardar }: { tipo: TipoTramite; solicitud: SolicitudAtencion; alGuardar: () => void }) {
    const estado = estadoTramite(s);
    const opciones = tipo === 'propuesta' ? estado === 'en_revision' ? ['requiere_correccion', 'aprobada', 'rechazada'] : []
        : estado === 'recibida' ? ['en_atencion', 'cita_programada', 'rechazada', 'cancelada'] : ['en_atencion', 'cita_programada'].includes(estado) ? ['en_atencion', 'cita_programada', 'atendida', 'rechazada', 'cancelada'].filter(e => e !== estado || e === 'cita_programada') : [];
    const [decision, setDecision] = useState(opciones[0] ?? ''); const [error, setError] = useState(''); const [guardando, setGuardando] = useState(false); const bloqueo = useRef(false);
    const etiquetas = tipo === 'credencial' ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA;
    if (!opciones.length) return <p>No hay decisiones pendientes para este estado.</p>;
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const f = new FormData(e.currentTarget); const nota = String(f.get('nota') ?? '').trim();
        setError('');
        if (['requiere_correccion', 'rechazada', 'cancelada'].includes(decision) && !nota) return setError('Escribe las observaciones o el motivo.');
        let cita: string | undefined;
        if (decision === 'cita_programada') {
            const fecha = new Date(String(f.get('cita')));
            if (!Number.isFinite(fecha.getTime()) || fecha.getTime() <= Date.now()) return setError('Elige una fecha y hora futuras para la cita.');
            cita = fecha.toISOString();
        }
        bloqueo.current = true; setGuardando(true);
        try { await resolverTramite(tipo, s, decision, nota, cita); alGuardar(); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <form onSubmit={enviar}><h3>Registrar atención o resolución</h3><fieldset className="tramites-campos" disabled={guardando}>
        <label>Decisión<select value={decision} onChange={e => setDecision(e.target.value)}>{opciones.map(op => <option value={op} key={op}>{etiquetas[op]}</option>)}</select></label>
        {decision === 'cita_programada' && <label>Cita (hora local de este equipo)<input name="cita" type="datetime-local" required /></label>}
        <label>Observaciones para la persona solicitante<textarea name="nota" maxLength={tipo === 'credencial' ? 1000 : 5000} required={['requiere_correccion', 'rechazada', 'cancelada'].includes(decision)} /></label>
        <label><input type="checkbox" required /> Revisé la solicitud y confirmo esta decisión.</label>
        <button className="boton-panel">{guardando ? 'Guardando…' : 'Confirmar decisión'}</button>
    </fieldset>{error && <p role="alert">{error} <button type="button" onClick={alGuardar}>Recargar versión actual</button></p>}</form>;
}
