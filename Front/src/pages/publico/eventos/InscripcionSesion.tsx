import { useEffect, useRef, useState } from 'react';
import { mensajeError } from '../../../servicios/api';
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { cancelarInscripcionPropia, consultarInscripcionPropia, estadoInscripcionPropia,
    solicitarInscripcionPropia, type InscripcionPropia } from '../../../servicios/inscripciones';
import flechaBlanca from '../../../assets/comun/iconos/flecha-blanca.svg';

// Mi inscripción en una sesión (datos reales). Se usa en el detalle de la actividad y en Perfil › Mis eventos.
const TONO: Record<string, 'verde' | 'dorado' | 'guinda' | 'gris'> = { confirmada: 'verde', pendiente: 'dorado', cancelada: 'guinda', rechazada: 'gris' };

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
    const aviso = !datos ? '' : datos.estado === 'pendiente' ? 'El personal revisará tu solicitud. Tu lugar queda apartado cuando la confirme.'
        : datos.estado === 'confirmada' ? 'Tu lugar está apartado. Si no puedes asistir, cancela para que otra persona lo ocupe.'
        : !datos.estado && !puedeSolicitar ? (datos.registroAbierto ? 'Cupo completo por ahora. Regresa después: si alguien cancela, se libera un lugar.' : 'El registro de esta sesión está cerrado.')
        : !datos.estado ? 'Revisa los requisitos antes de solicitar tu lugar.' : '';

    return <div className="insc-sesion">
        {!datos && !error && <EsqueletoLista filas={1} texto="Consultando tu inscripción…" />}
        {datos && <>
            {datos.estado
                ? <p className={`insc-sesion__estado insc-sesion__estado--${TONO[datos.estado] ?? 'gris'}`} role="status"><span aria-hidden="true" />Tu inscripción: <strong>{estadoInscripcionPropia[datos.estado]}</strong></p>
                : <p className="insc-sesion__estado insc-sesion__estado--gris" role="status"><span aria-hidden="true" />Aún no estás inscrito en esta sesión</p>}
            {aviso && <p className="insc-sesion__texto">{aviso}</p>}
        </>}
        {!accion && (puedeSolicitar || datos?.puedeCancelar) && <div className="insc-sesion__botones">
            {puedeSolicitar && <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => setAccion('solicitar')}>Solicitar inscripción <img src={flechaBlanca} alt="" /></button>}
            {datos?.puedeCancelar && <button type="button" className="agenda-boton agenda-boton--contorno-verde insc-sesion__cancelar" onClick={() => setAccion('cancelar')}>Cancelar mi inscripción</button>}
        </div>}
        {accion && <div className={`insc-sesion__confirmar${accion === 'cancelar' ? ' insc-sesion__confirmar--cancelar' : ''}`}>
            <p>{accion === 'cancelar' ? '¿Confirmas que quieres cancelar tu participación en esta sesión? Tu lugar quedará libre para otra persona.' :
                'Confirma que revisaste los requisitos publicados para esta sesión. El personal confirmará tu lugar según el cupo.'}</p>
            <div className="insc-sesion__botones">
                <button type="button" className={`agenda-boton ${accion === 'cancelar' ? 'agenda-boton--guinda' : 'agenda-boton--verde'}`} disabled={ocupado} onClick={() => void guardar()}>
                    {ocupado ? 'Guardando…' : accion === 'cancelar' ? 'Sí, cancelar mi inscripción' : 'Enviar solicitud'}
                </button>
                <button type="button" className="agenda-boton agenda-boton--contorno-verde" disabled={ocupado} onClick={() => setAccion(undefined)}>Volver</button>
            </div>
        </div>}
        {error && <div className="insc-sesion__error" role="alert">
            <p>{error}</p>
            <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={() => { setError(''); setDatos(undefined); recargar(i => i + 1); }}>Consultar de nuevo</button>
        </div>}
    </div>;
}
