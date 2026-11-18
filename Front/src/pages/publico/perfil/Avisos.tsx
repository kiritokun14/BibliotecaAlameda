import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ErrorServicio, mensajeError } from '../../../servicios/api';
import { consultarPreferenciasAvisos, guardarPreferenciasAvisos, type PreferenciasAvisos } from '../../../servicios/perfil';
import { EncabezadoSeccion, TarjetaPerfil } from './piezas';
import { Bloque } from '../../../components/portal/Esqueleto';
import tarjetaEnviar from '../../../assets/perfil/tarjeta-enviar.svg';
import tarjetaCampana from '../../../assets/perfil/tarjeta-campana.svg';

const campos = [
    ['recibirAvisosComunidad', 'Difusión de comunidad'],
    ['recibirAvisosActividades', 'Difusión de actividades'],
] as const;

export default function Avisos() {
    const [consulta, setConsulta] = useState({ intento: 0 });
    const [carga, setCarga] = useState<{ intento: number; preferencias?: PreferenciasAvisos; error?: string }>();
    const { intento } = consulta;
    useEffect(() => {
        let vigente = true;
        consultarPreferenciasAvisos().then(preferencias => {
            if (vigente) setCarga({ intento, preferencias });
        }).catch(error => {
            if (vigente) setCarga({ intento, error: mensajeError(error) });
        });
        return () => { vigente = false; };
    }, [intento]);
    const actual = carga?.intento === intento ? carga : undefined;
    const recargar = () => setConsulta(c => ({ intento: c.intento + 1 }));
    return <>
        <EncabezadoSeccion sobretitulo="AVISOS" titulo="Preferencias de avisos" texto="Elige qué avisos de difusión quieres recibir y tu canal preferido." />
        {!actual && <div className="perfil-esqueleto__avisos" role="status" aria-label="Cargando preferencias">
            <Bloque clase="perfil-esqueleto__tarjeta perfil-esqueleto__tarjeta--baja" /><Bloque clase="perfil-esqueleto__tarjeta" />
        </div>}
        {actual?.error && <div className="perfil-aviso-error" role="alert">
            <strong>No pudimos cargar tus preferencias</strong><p>{actual.error}</p>
            <button type="button" className="perfil-boton perfil-boton--contorno perfil-boton--chico" onClick={recargar}>Reintentar</button>
        </div>}
        {actual?.preferencias && <Formulario key={intento} inicial={actual.preferencias} recargar={recargar} />}
        <TarjetaPerfil color="blanca" icono={tarjetaCampana} titulo="Mis notificaciones">
            <p className="perfil-tarjeta__texto perfil-tarjeta__texto--suave">Aquí eliges qué avisos recibir. Los que ya te llegaron están en tus notificaciones.</p>
            <div className="perfil-acciones"><Link to="/notificaciones" className="perfil-boton perfil-boton--contorno perfil-boton--chico">Ver mis notificaciones</Link></div>
        </TarjetaPerfil>
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
    return <form onSubmit={guardar}>
        <TarjetaPerfil color="verde" icono={tarjetaEnviar} titulo="Canal">
            <label>Canal preferido <select value={datos.canalPreferido} disabled={guardando || conflicto}
                onChange={e => cambiar({ canalPreferido: e.target.value as PreferenciasAvisos['canalPreferido'] })}>
                <option value="portal">Portal</option>
                <option value="correo">Correo</option>
                <option value="telefono">Teléfono</option>
                <option value="whatsapp_manual">WhatsApp</option>
            </select></label>
            <p>El personal puede preparar difusión por WhatsApp si eliges ese canal y activas el tipo de aviso.</p>
        </TarjetaPerfil>
        <TarjetaPerfil color="dorada" icono={tarjetaCampana} titulo="Tipos de difusión">
            <ul className="perfil-preferencias">
                {campos.map(([campo, etiqueta]) => <li className="perfil-preferencia" key={campo}>
                    <label><input type="checkbox" checked={datos[campo]} disabled={guardando || conflicto}
                        onChange={e => cambiar({ [campo]: e.target.checked })} /> {etiqueta}</label>
                </li>)}
            </ul>
        </TarjetaPerfil>
        {guardado && <p className="perfil-exito" role="status">Tus preferencias se guardaron.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="perfil-acciones">
            <button className="perfil-boton" disabled={!hayCambios || guardando || conflicto}>{guardando ? 'Guardando…' : 'Guardar preferencias'}</button>
            <button type="button" className="perfil-boton perfil-boton--contorno" disabled={!hayCambios || guardando || conflicto}
                onClick={() => cambiar(original)}>Cancelar</button>
            {conflicto && <button type="button" onClick={recargar}>Cargar las preferencias actuales</button>}
        </div>
    </form>;
}
