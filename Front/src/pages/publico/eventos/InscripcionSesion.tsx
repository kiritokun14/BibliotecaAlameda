import { useEffect, useRef, useState } from 'react';
import { mensajeError } from '../../../servicios/api';
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { cancelarInscripcionPropia, consultarInscripcionPropia, estadoInscripcionPropia,
    solicitarInscripcionPropia, type InscripcionPropia } from '../../../servicios/inscripciones';
import { sesionSimulada } from '../perfil/usarSesion';
import { Chip } from '../credencial/piezas';

// Mi inscripción en una sesión (datos reales). Se usa en el detalle de la actividad y en Perfil › Mis eventos.
// Diseño normalizado (Aldahir, 20 nov: «algunos textos no están bien posicionados»): una fila con «Tu lugar» y el chip de
// su estado, y debajo qué significa; las acciones a la derecha como botones chicos; al elegir una, la confirmación crece
// en el lugar (nota crema para pedir el lugar, rosa para cancelar) con «Sí, …» y «Volver». El error, en nota rosa.
// Con ?simular=sesion se ven datos de ejemplo y las acciones solo cambian la vista (para revisar el diseño sin backend).
const COLOR = { confirmada: 'verde', pendiente: 'dorado', cancelada: 'gris', rechazada: 'guinda' } as const;
const EJEMPLO: InscripcionPropia = { id: null, estado: null, actualizadoA: null, registroAbierto: true, hayCupo: true, puedeCancelar: false };

export default function InscripcionSesion({ sesion, desdePerfil = false }: { sesion: string; desdePerfil?: boolean }) {
    const [datos, setDatos] = useState<InscripcionPropia | undefined>(sesionSimulada ? EJEMPLO : undefined);
    const [error, setError] = useState('');
    const [intento, recargar] = useState(0);
    const [accion, setAccion] = useState<'solicitar' | 'cancelar'>();
    const [ocupado, setOcupado] = useState(false);
    const bloqueo = useRef(false);

    useEffect(() => {
        if (sesionSimulada) return;
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
            if (sesionSimulada) setDatos(accion === 'solicitar'
                ? { ...datos, id: 'ejemplo', estado: 'pendiente', actualizadoA: 'ejemplo', puedeCancelar: true }
                : { ...datos, estado: 'cancelada', puedeCancelar: false });
            else if (accion === 'solicitar') setDatos(await solicitarInscripcionPropia(sesion));
            else if (datos.actualizadoA) setDatos(await cancelarInscripcionPropia(sesion, datos.actualizadoA));
        } catch (e) { setError(mensajeError(e)); }
        finally { bloqueo.current = false; setOcupado(false); setAccion(undefined); }
    }

    const puedeSolicitar = !desdePerfil && datos?.registroAbierto && datos.hayCupo
        && (!datos.estado || datos.estado === 'cancelada');
    const aviso = !datos ? '' : datos.estado === 'pendiente' ? 'El personal revisará tu solicitud. Tu lugar queda apartado cuando la confirme.'
        : datos.estado === 'confirmada' ? 'Tu lugar está apartado. Si no puedes asistir, cancela para que otra persona lo ocupe.'
        : datos.estado === 'rechazada' ? 'El personal no pudo confirmar tu lugar en esta sesión.'
        : datos.estado === 'cancelada' && puedeSolicitar ? 'Cancelaste tu lugar. Si cambias de opinión, puedes pedirlo de nuevo.'
        : !puedeSolicitar ? (datos.registroAbierto ? 'Cupo completo por ahora. Regresa después: si alguien cancela, se libera un lugar.' : 'El registro de esta sesión está cerrado.')
        : 'Revisa los materiales y requisitos antes de pedir tu lugar.';

    if (!datos && !error) return <div className="insc"><EsqueletoLista filas={1} texto="Consultando tu inscripción…" /></div>;

    return (
        <div className="insc">
            {datos && (
                <div className="insc__fila">
                    <div className="insc__estado" role="status">
                        <span className="insc__etiqueta">Tu lugar</span>
                        <Chip color={datos.estado ? COLOR[datos.estado] : 'gris'}>{datos.estado ? estadoInscripcionPropia[datos.estado] : 'Sin inscripción'}</Chip>
                        <p>{aviso}</p>
                    </div>
                    {!accion && (puedeSolicitar || datos.puedeCancelar) && (
                        <div className="insc__acciones">
                            {puedeSolicitar && <button type="button" className="perfil-boton perfil-boton--chico" onClick={() => setAccion('solicitar')}>Pedir mi lugar</button>}
                            {datos.puedeCancelar && <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={() => setAccion('cancelar')}>Cancelar mi lugar</button>}
                        </div>
                    )}
                </div>
            )}
            {accion && (
                <div key={accion} className={`perfil-nota insc__confirmar${accion === 'cancelar' ? ' perfil-nota--guinda' : ''}`} role="group" aria-labelledby="insc-confirmar">
                    <p>
                        <strong id="insc-confirmar">{accion === 'cancelar' ? '¿Cancelar tu lugar en esta sesión?' : '¿Pedir tu lugar en esta sesión?'}</strong>
                        {accion === 'cancelar' ? 'Tu lugar quedará libre para otra persona.' : 'Confirma que revisaste los materiales y requisitos. El personal confirma tu lugar según el cupo.'}
                    </p>
                    <div className="insc__acciones">
                        <button type="button" className={`perfil-boton perfil-boton--chico${accion === 'cancelar' ? ' perfil-boton--guinda' : ''}`} disabled={ocupado} onClick={() => void guardar()}>
                            {ocupado ? 'Guardando…' : accion === 'cancelar' ? 'Sí, cancelar' : 'Sí, pedir mi lugar'}
                        </button>
                        <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={ocupado} onClick={() => setAccion(undefined)}>Volver</button>
                    </div>
                </div>
            )}
            {error && (
                <div className="perfil-nota perfil-nota--guinda insc__error" role="alert">
                    <p>{error}</p>
                    <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => { setError(''); setDatos(undefined); recargar(i => i + 1); }}>Consultar de nuevo</button>
                </div>
            )}
        </div>
    );
}
