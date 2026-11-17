import { useEffect, useRef, useState } from 'react';
import { mensajeError } from '../../../servicios/api';
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { cancelarInscripcionPropia, consultarInscripcionPropia, estadoInscripcionPropia,
    solicitarInscripcionPropia, type InscripcionPropia } from '../../../servicios/inscripciones';

export default function InscripcionSesion({ sesion, desdePerfil = false }: { sesion: string; desdePerfil?: boolean }) {
    const [datos, setDatos] = useState<InscripcionPropia>();
    const [error, setError] = useState('');
    const [intento, recargar] = useState(0);
    const [accion, setAccion] = useState<'solicitar' | 'cancelar'>();
    const [ocupado, setOcupado] = useState(false);
    const bloqueo = useRef(false);

    useEffect(() => {
        let vigente = true;
        consultarInscripcionPropia(sesion).then(r => { if (vigente) setDatos(r); })
            .catch(e => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, [sesion, intento]);

    async function guardar() {
        if (bloqueo.current || !accion || !datos) return;
        bloqueo.current = true;
        setOcupado(true);
        setError('');
        try {
            if (accion === 'solicitar') setDatos(await solicitarInscripcionPropia(sesion));
            else if (datos.actualizadoA) setDatos(await cancelarInscripcionPropia(sesion, datos.actualizadoA));
        } catch (e) { setError(mensajeError(e)); }
        finally { bloqueo.current = false; setOcupado(false); setAccion(undefined); }
    }

    const puedeSolicitar = !desdePerfil && datos?.registroAbierto && datos.hayCupo
        && (!datos.estado || datos.estado === 'cancelada');
    return <div>
        {!datos && !error && <EsqueletoLista filas={1} texto="Consultando tu inscripción…" />}
        {datos?.estado && <p role="status"><strong>Tu inscripción:</strong> {estadoInscripcionPropia[datos.estado]}.</p>}
        {datos?.estado === 'pendiente' && <p>El personal revisará tu solicitud. Tu lugar queda reservado cuando se confirme.</p>}
        {datos && !datos.estado && !puedeSolicitar && <p>{datos.registroAbierto ? 'Cupo completo. Consulta más adelante.' : 'Registro cerrado.'}</p>}
        {!accion && puedeSolicitar && <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => setAccion('solicitar')}>Solicitar inscripción</button>}
        {!accion && datos?.puedeCancelar && <button type="button" className="agenda-boton agenda-boton--guinda" onClick={() => setAccion('cancelar')}>Cancelar mi inscripción</button>}
        {accion && <div>
            <p>{accion === 'cancelar' ? '¿Confirmas que quieres cancelar tu participación en esta sesión?' :
                'Confirma que revisaste los requisitos publicados para esta sesión.'}</p>
            <button type="button" className="agenda-boton agenda-boton--verde" disabled={ocupado} onClick={() => void guardar()}>
                {ocupado ? 'Guardando…' : accion === 'cancelar' ? 'Sí, cancelar mi inscripción' : 'Enviar solicitud'}
            </button>
            <button type="button" className="agenda-boton" disabled={ocupado} onClick={() => setAccion(undefined)}>Volver</button>
        </div>}
        {error && <p role="alert">{error} <button type="button" onClick={() => {
            setError(''); setDatos(undefined); recargar(i => i + 1);
        }}>Consultar de nuevo</button></p>}
    </div>;
}
