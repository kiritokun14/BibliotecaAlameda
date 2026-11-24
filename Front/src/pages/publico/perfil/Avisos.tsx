import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ErrorServicio, mensajeError } from '../../../servicios/api';
import { consultarPreferenciasAvisos, guardarPreferenciasAvisos, type PreferenciasAvisos } from '../../../servicios/perfil';
import { EncabezadoSeccion, TarjetaPerfil } from './piezas';
import { Bloque } from '../../../components/portal/Esqueleto';
import tarjetaEnviar from '../../../assets/perfil/tarjeta-enviar.svg';
import tarjetaCampana from '../../../assets/perfil/tarjeta-campana.svg';
import { sesionSimulada } from './usarSesion';

// Con la sesión de ejemplo (?simular=sesion, solo en desarrollo) se muestran preferencias de ejemplo en vez de pedirlas al servidor.
const preferenciasEjemplo: PreferenciasAvisos = { canalPreferido: 'portal', recibirAvisosComunidad: true, recibirAvisosActividades: true, actualizadoEn: null };

const campos = [
    ['recibirAvisosComunidad', 'Difusión de comunidad', 'Noticias, convocatorias y avisos generales de la biblioteca.'],
    ['recibirAvisosActividades', 'Difusión de actividades', 'Talleres, clubes y eventos nuevos con inscripción abierta.'],
] as const;
// Canales como tarjetas de opción (una sola elegida)
const canales: { valor: PreferenciasAvisos['canalPreferido']; titulo: string; texto: string }[] = [
    { valor: 'portal', titulo: 'Portal', texto: 'Los ves en tus notificaciones.' },
    { valor: 'correo', titulo: 'Correo', texto: 'Te escribimos a tu correo.' },
    { valor: 'telefono', titulo: 'Teléfono', texto: 'El personal te llama.' },
    { valor: 'whatsapp_manual', titulo: 'WhatsApp', texto: 'El personal te envía un mensaje.' },
];

export default function Avisos() {
    const [consulta, setConsulta] = useState({ intento: 0 });
    const [carga, setCarga] = useState<{ intento: number; preferencias?: PreferenciasAvisos; error?: string }>();
    const { intento } = consulta;
    useEffect(() => {
        let vigente = true;
        (sesionSimulada ? Promise.resolve(preferenciasEjemplo) : consultarPreferenciasAvisos()).then(preferencias => {
            if (vigente) setCarga({ intento, preferencias });
        }).catch(error => {
            if (vigente) setCarga({ intento, error: mensajeError(error) });
        });
        return () => { vigente = false; };
    }, [intento]);
    const actual = carga?.intento === intento ? carga : undefined;
    const recargar = () => setConsulta(c => ({ intento: c.intento + 1 }));
    return <>
        <EncabezadoSeccion titulo="Preferencias de avisos" texto="Elige qué avisos de difusión quieres recibir y por dónde."
            accion={<Link to="/notificaciones" className="perfil-boton perfil-boton--contorno">Ver mis notificaciones</Link>} />
        {!actual && <div className="perfil-esqueleto__avisos" role="status" aria-label="Cargando preferencias">
            <Bloque clase="perfil-esqueleto__tarjeta perfil-esqueleto__tarjeta--baja" /><Bloque clase="perfil-esqueleto__tarjeta" />
        </div>}
        {actual?.error && <div className="perfil-aviso-error" role="alert">
            <strong>No pudimos cargar tus preferencias</strong><p>{actual.error}</p>
            <button type="button" className="perfil-boton perfil-boton--contorno perfil-boton--chico" onClick={recargar}>Reintentar</button>
        </div>}
        {actual?.preferencias && <Formulario key={intento} inicial={actual.preferencias} recargar={recargar} />}

    </>;
}

function Formulario({ inicial, recargar }: { inicial: PreferenciasAvisos; recargar: () => void }) {
    const [original, setOriginal] = useState(inicial);
    const [datos, setDatos] = useState(inicial);
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [error, setError] = useState('');
    const [conflicto, setConflicto] = useState(false);
    const bloqueo = useRef(false);
    const hayCambios = datos.canalPreferido !== original.canalPreferido || campos.some(([campo]) => datos[campo] !== original[campo]);
    function cambiar(cambios: Partial<PreferenciasAvisos>) {
        setDatos(d => ({ ...d, ...cambios }));
        setGuardado(false);
        setError('');
    }
    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (bloqueo.current || !hayCambios || conflicto) return;
        bloqueo.current = true;
        setGuardando(true);
        setError('');
        try {
            const nuevas = await guardarPreferenciasAvisos(datos);
            setDatos(nuevas);
            setOriginal(nuevas);
            setGuardado(true);
        } catch (e) {
            setError(mensajeError(e));
            setConflicto(e instanceof ErrorServicio && e.estado === 409);
        } finally {
            bloqueo.current = false;
            setGuardando(false);
        }
    }
    return <form className="perfil-formulario" onSubmit={guardar}>
        <TarjetaPerfil color="verde" icono={tarjetaEnviar} titulo="Canal preferido" texto="Por dónde quieres que te lleguen los avisos de difusión.">
            <div className="perfil-opciones" role="radiogroup" aria-label="Canal preferido">
                {canales.map(c => <label key={c.valor} className={`perfil-opcion${datos.canalPreferido === c.valor ? ' perfil-opcion--activa' : ''}`}>
                    <input type="radio" name="canal" value={c.valor} checked={datos.canalPreferido === c.valor} disabled={guardando || conflicto}
                        onChange={() => cambiar({ canalPreferido: c.valor })} />
                    <strong>{c.titulo}</strong>
                    <span>{c.texto}</span>
                </label>)}
            </div>
        </TarjetaPerfil>
        <TarjetaPerfil color="dorada" icono={tarjetaCampana} titulo="Tipos de difusión" texto="Activa solo lo que te interesa; puedes cambiarlo cuando quieras.">
            <ul className="perfil-preferencias">
                {campos.map(([campo, etiqueta, descripcion]) => <li className="perfil-preferencia" key={campo}>
                    <label className="perfil-interruptor">
                        <span className="perfil-interruptor__textos"><strong>{etiqueta}</strong><span>{descripcion}</span></span>
                        <input type="checkbox" role="switch" checked={datos[campo]} disabled={guardando || conflicto}
                            onChange={e => cambiar({ [campo]: e.target.checked })} />
                    </label>
                </li>)}
            </ul>
        </TarjetaPerfil>
        {guardado && <p className="perfil-exito" role="status">Tus preferencias se guardaron.</p>}
        {error && <p className="perfil-error" role="alert">{error}</p>}
        {/* Barra de guardar del catálogo: hasta abajo y acompaña al bajar */}
        <div className={`perfil-acciones perfil-guardar${hayCambios ? ' perfil-guardar--pendiente' : ''}`}>
            <p className="perfil-guardar__estado" role="status">
                <strong>{guardando ? 'Guardando tus preferencias…' : hayCambios ? 'Tienes cambios sin guardar' : 'Sin cambios por ahora'}</strong>
                <span>{hayCambios ? 'Guarda para que el personal use tus nuevas preferencias.' : 'Elige un canal o activa un tipo de aviso.'}</span>
            </p>
            <div className="perfil-guardar__botones">
                <button type="button" className="perfil-boton perfil-boton--contorno" disabled={!hayCambios || guardando || conflicto}
                    onClick={() => cambiar(original)}>Cancelar</button>
                {conflicto
                    ? <button type="button" className="perfil-boton perfil-boton--guardar" onClick={recargar}>Cargar las preferencias actuales</button>
                    : <button className="perfil-boton perfil-boton--guardar" disabled={!hayCambios || guardando}>{guardando ? 'Guardando…' : 'Guardar preferencias'}</button>}
            </div>
        </div>
    </form>;
}
