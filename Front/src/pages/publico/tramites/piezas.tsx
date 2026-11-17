import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { cancelarPropuesta, enviarPropuesta, puedeCancelarPropuesta, puedeCorregirPropuesta, ESTADOS_CREDENCIAL, ESTADOS_PROPUESTA, estadoTramite, type DatosPropuesta, type SolicitudAtencion } from '../../../servicios/tramites';
import { mensajeError } from '../../../servicios/api';
import { useCuentaTramites } from '../../../servicios/useCuentaTramites';

export function HistorialTramite({ solicitud: s }: { solicitud: SolicitudAtencion }) {
    return <section><h3>Seguimiento</h3><p>Solicitud registrada: {new Date(s.creadaEn).toLocaleString('es-MX')}</p>
        {s.historial.length ? <ol>{s.historial.map((h, i) => <li key={i}>
            {new Date(h.fecha).toLocaleString('es-MX')} · {(ESTADOS_CREDENCIAL[h.estadoNuevo] ?? ESTADOS_PROPUESTA[h.estadoNuevo]) || h.estadoNuevo}
            {h.nota && <p>{h.nota}</p>}
            {h.acuerdoDireccion && <p>Acuerdo de dirección: {h.acuerdoDireccion.responsable} · {h.acuerdoDireccion.fecha} · Referencia: {h.acuerdoDireccion.referencia}. Registrado por la cuenta de coordinación: {h.registradoPor}.</p>}
        </li>)}</ol> : <p>No hay decisiones posteriores registradas.</p>}
        {!!s.versiones?.length && <><h3>Versiones guardadas</h3><ol>{s.versiones.map(v => <li key={v.numero}>Versión {v.numero} · {v.accion} · {v.motivo} · {new Date(v.fecha).toLocaleString('es-MX')}</li>)}</ol></>}
    </section>;
}
export function FichaTramite({ solicitud: s }: { solicitud: SolicitudAtencion }) {
    return <>
        <h2>{s.tituloPropuesta || (s.tipoSolicitud === 'renovacion' ? 'Renovación de credencial' : 'Obtención de credencial')}</h2>
        <p>Folio: {s.id}</p><p>Estado: {(s.estadoSolicitud ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA)[estadoTramite(s)]}</p>
        {s.perfil && <p>Solicitante: {s.perfil.nombres} {s.perfil.primerApellido} {s.perfil.segundoApellido} · Teléfono: {s.perfil.telefono}{s.perfil.municipio && ` · ${s.perfil.municipio}`}</p>}
        {s.descripcion && <><p style={{ whiteSpace: 'pre-wrap' }}>{s.descripcion}</p><dl>
            {([['Tipo', s.tipoPropuesta], ['Público', s.publicoDirigido], ['Espacio solicitado', s.necesidadEspacio], ['Frecuencia', s.frecuenciaReunion], ['Días solicitados', s.diasSolicitados], ['Horario solicitado', s.horarioSolicitado]]).map(([campo, valor]) => <div key={campo}><dt>{campo}</dt><dd>{valor}</dd></div>)}
        </dl></>}
        {s.fechaCita && <p>Cita: {new Date(s.fechaCita).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })} · hora de Tepic</p>}
        {(s.observacionesInstitucionales || s.observaciones) && <p>Observaciones: {s.observacionesInstitucionales ?? s.observaciones}</p>}
        {s.estadoRevision === 'aprobada' && <p>La propuesta fue aprobada. La biblioteca debe programar y publicar la actividad por separado.</p>}
        {s.estadoSolicitud === 'atendida' && <p>Se registró la atención del trámite; este estado no emite ni valida una credencial automáticamente.</p>}
        <HistorialTramite solicitud={s} />
    </>;
}
const campos = [
    ['tituloPropuesta', 'Título de la propuesta', 200], ['descripcion', 'Descripción', 5000], ['tipoPropuesta', 'Tipo: evento, taller o club', 100],
    ['publicoDirigido', 'Público al que va dirigido', 500], ['necesidadEspacio', 'Espacio que necesitas', 5000],
    ['frecuenciaReunion', 'Frecuencia de reunión', 200], ['diasSolicitados', 'Días solicitados', 200], ['horarioSolicitado', 'Horario solicitado', 200],
] as const;
export function FormularioPropuesta({ anterior, alGuardar }: { anterior?: SolicitudAtencion; alGuardar: (solicitud: SolicitudAtencion) => void }) {
    const [error, setError] = useState(''); const [guardando, setGuardando] = useState(false); const bloqueo = useRef(false);
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const formulario = new FormData(e.currentTarget);
        const datos = Object.fromEntries(campos.map(([campo]) => [campo, String(formulario.get(campo) ?? '').trim()])) as unknown as DatosPropuesta;
        datos.abiertaAlPublico = formulario.get('abiertaAlPublico') === 'on'; datos.sinFinesDeLucro = formulario.get('sinFinesDeLucro') === 'on';
        bloqueo.current = true; setGuardando(true); setError('');
        try { alGuardar(await enviarPropuesta(datos, anterior, anterior ? String(formulario.get('motivoCambio') ?? '') : undefined)); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <form onSubmit={enviar}><h2>{anterior ? 'Corregir y reenviar propuesta' : 'Proponer un evento o club'}</h2>
        <p>Las fechas y los espacios solicitados quedan sujetos a revisión; enviar esta propuesta no reserva ni publica una actividad.</p>
        {anterior && <p>Al guardar, la propuesta vuelve a revisión y necesita una nueva resolución. Se conserva la versión anterior y el motivo.</p>}
        <fieldset disabled={guardando} className="tramites-campos">
            {campos.map(([campo, etiqueta, maximo]) => <label key={campo}>{etiqueta}
                {maximo === 5000 ? <textarea name={campo} required maxLength={maximo} defaultValue={String(anterior?.[campo] ?? '')} />
                    : <input name={campo} required maxLength={maximo} defaultValue={String(anterior?.[campo] ?? '')} />}
            </label>)}
            {anterior && <label>Motivo de la corrección<textarea name="motivoCambio" required maxLength={1000} /></label>}
            <label><input type="checkbox" name="abiertaAlPublico" required /> Confirmo que la actividad será abierta al público.</label>
            <label><input type="checkbox" name="sinFinesDeLucro" required /> Confirmo que será sin fines de lucro.</label>
            <button className="boton-panel">{guardando ? 'Enviando…' : anterior ? 'Guardar corrección y reenviar' : 'Enviar a revisión'}</button>
        </fieldset>{error && <p role="alert">{error}</p>}
    </form>;
}
export function AccionesPropuesta({ solicitud: s, alGuardar }: { solicitud: SolicitudAtencion; alGuardar: () => void }) {
    const usuario = useCuentaTramites();
    const [motivo, setMotivo] = useState('');
    const [confirmar, setConfirmar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    async function cancelar(e: FormEvent) {
        e.preventDefault(); if (guardando) return;
        setGuardando(true); setError('');
        try { await cancelarPropuesta(s, motivo); alGuardar(); }
        catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    }
    if (!usuario || s.propuestoPor !== usuario) return null;
    return <>
        {s.actividadId ? <p>Esta propuesta ya tiene una actividad vinculada. <Link to="/mis-actividades/cambios">Solicitar cambios o cancelación de sus sesiones</Link></p> :
            puedeCorregirPropuesta(s) && <FormularioPropuesta key={s.actualizadoEn} anterior={s} alGuardar={alGuardar} />}
        {puedeCancelarPropuesta(s) && <>
            <button className="boton-panel" disabled={guardando} onClick={() => setConfirmar(true)}>Cancelar propuesta</button>
            {confirmar && <form onSubmit={e => void cancelar(e)}>
                <h3>Confirmar cancelación de la propuesta</h3><p>Se conserva el expediente y su historial. No se publicará esta propuesta.</p>
                <label>Motivo<textarea required maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} disabled={guardando} /></label>
                <button disabled={guardando}>{guardando ? 'Cancelando…' : 'Confirmar cancelación'}</button>
                <button type="button" disabled={guardando} onClick={() => setConfirmar(false)}>Mantener propuesta</button>
            </form>}
        </>}
        {error && <p role="alert">{error}</p>}
    </>;
}
export function AccesoTramites() { return <p>Inicia sesión para consultar o enviar solicitudes. <Link to="/iniciar-sesion">Iniciar sesión</Link></p>; }
