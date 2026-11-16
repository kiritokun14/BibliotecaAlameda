// Atención › Recuperación asistida (Figma 577:35507). Diseño del Editor de contenidos. Datos de ejemplo (./datos.ts, TODO backend).
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { AvisoResultado, Dato, Datos, EncabezadoPagina, ListaCotejo, Migas, Tarjeta } from "../../componentes";
import { Ventana } from "../../Ventana";
import { IconoAviso, IconoBuscar, IconoLista, IconoReloj } from "../../contenidos/piezas";
import { simulacion } from "../../../../servicios/simulacion";
import {
    CUENTAS, PUNTOS_VERIFICACION, buscarCuenta, enmascararCorreo, fechaCorta, obtenerCuenta, puedeEnviar, registrarIntento,
    useHistorialRecuperacion, type CuentaRecuperacion,
} from "./datos";
import iconoUsuario from "../../../../assets/admin/tarjeta-user.svg";
import iconoCheck from "../../../../assets/admin/tarjeta-check.svg";
import modalCheck from "../../../../assets/admin/modal-check.svg";

const RUTA = "/admin/atencion/recuperacion";

function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[["Recuperación asistida", RUTA], ...migas]} />
            {children}
        </PanelLayout>
    );
}

// Carga la cuenta de la ruta o regresa a buscar
function ConCuenta({ children }: { children: (c: CuentaRecuperacion) => ReactNode }) {
    const { id } = useParams();
    const cuenta = obtenerCuenta(id);
    if (!cuenta) return <Navigate to={RUTA} replace />;
    return <>{children(cuenta)}</>;
}

// ---------- Buscar cuenta (Figma 577:35508, no encontrada 577:35882) ----------

export default function Recuperacion() {
    const navigate = useNavigate();
    const historial = useHistorialRecuperacion();
    const [texto, setTexto] = useState("");
    const [extra, setExtra] = useState("");
    const [error, setError] = useState("");
    const [noEncontrada, setNoEncontrada] = useState("");
    const hoy = new Date().toISOString().slice(0, 10);
    const mes = hoy.slice(0, 7);

    function buscar(e: FormEvent) {
        e.preventDefault();
        setNoEncontrada("");
        if (texto.trim().length < 3) { setError("Escribe al menos 3 letras del correo, nombre o credencial."); return; }
        setError("");
        const cuenta = buscarCuenta(CUENTAS, texto);
        if (cuenta) navigate(`${RUTA}/${cuenta.id}`);
        else setNoEncontrada(texto.trim());
    }

    const tarjetas: { tono: "azul" | "gris" | "guinda"; icono: ReactNode; cifra: number; titulo: string; texto: string }[] = [
        { tono: "azul", icono: <IconoReloj />, cifra: historial.filter((i) => i.fecha === hoy && i.resultado === "enviado").length, titulo: "Atendidas hoy", texto: "Enlace enviado." },
        { tono: "guinda", icono: <IconoAviso />, cifra: historial.filter((i) => i.resultado === "fallida").length, titulo: "Verificación fallida", texto: "Sin enlace enviado." },
        { tono: "gris", icono: <IconoLista />, cifra: historial.filter((i) => i.fecha.startsWith(mes)).length, titulo: "Del mes", texto: "Total (ejemplo)." },
    ];

    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[["Recuperación asistida"]]} />
            <EncabezadoPagina etiqueta="Atención · Recuperación asistida" titulo="Recuperación asistida"
                texto="Ayuda a una persona que no puede entrar a su cuenta. Nunca se te muestra ni se te pide su contraseña. Datos de ejemplo." />

            <section className="contenidos-resumen" aria-labelledby="rec-resumen-titulo">
                <h2 id="rec-resumen-titulo">Accesos rápidos</h2>
                <div className="contenidos-resumen__tarjetas">
                    {tarjetas.map((t) => (
                        <article key={t.titulo} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${t.tono}`}>
                            <div className="contenidos-resumen__fila"><span className="contenidos-resumen__icono">{t.icono}</span></div>
                            <p className="contenidos-resumen__cifra">{t.cifra}</p>
                            <p className="contenidos-resumen__titulo">{t.titulo}</p>
                            <p className="contenidos-resumen__texto">{t.texto}</p>
                        </article>
                    ))}
                </div>
            </section>

            <form onSubmit={buscar} noValidate>
                <section className="contenidos-panel" aria-labelledby="rec-buscar-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoBuscar /></span>
                        <div className="at-cabecera__textos"><h2 id="rec-buscar-titulo">Buscar la cuenta</h2><p>Pregunta a la persona su correo, nombre o número de credencial.</p></div>
                    </div>
                    <div className="at-fila">
                        <div className="contenidos-campo">
                            <label htmlFor="rec-texto">Correo, nombre o credencial <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                            <input id="rec-texto" type="text" value={texto} maxLength={100} onChange={(e) => { setTexto(e.target.value); setError(""); }}
                                className={error ? "contenidos-campo--error" : undefined} aria-invalid={!!error} aria-describedby={error ? "rec-texto-error" : undefined} />
                            {error && <p id="rec-texto-error" className="contenidos-campo__error" role="alert">{error}</p>}
                        </div>
                        <div className="contenidos-campo">
                            <label htmlFor="rec-extra">Dato adicional (opcional)</label>
                            <input id="rec-extra" type="text" value={extra} maxLength={100} onChange={(e) => setExtra(e.target.value)} placeholder="Ej.: teléfono o fecha de nacimiento" />
                        </div>
                    </div>
                    <button type="submit" className="contenidos-boton contenidos-boton--principal at-alinear-inicio">Buscar cuenta</button>
                </section>
            </form>

            {noEncontrada && (
                <AvisoResultado tono="error" titulo="Cuenta no encontrada" texto={`No hay una cuenta con «${noEncontrada}». Revisa cómo lo escribió la persona o sugiérele crear una cuenta.`} chip="Sin resultados" />
            )}

            <div className="contenidos-previa__acciones">
                <Link to={`${RUTA}/historial`} className="contenidos-boton contenidos-boton--suave-azul">Ver historial de recuperaciones</Link>
            </div>
        </PanelLayout>
    );
}

// ---------- Cuenta encontrada / bloqueada (Figma 577:36234, 577:37719) ----------

export function CuentaEncontrada() {
    return (
        <ConCuenta>
            {(c) => (
                <Pantalla migas={[[c.bloqueada ? "Cuenta bloqueada" : "Cuenta encontrada"]]}>
                    <EncabezadoPagina volver={{ texto: "Volver a Recuperación asistida", ruta: RUTA }} etiqueta={`Cuenta ${c.id}`} titulo={c.nombre}
                        texto={c.bloqueada ? "La cuenta está bloqueada. No se puede enviar el enlace desde aquí." : "Verifica la identidad de la persona antes de enviar el enlace."} />
                    {c.bloqueada
                        ? <AvisoResultado tono="error" titulo="Cuenta bloqueada" texto="Se bloqueó por intentos. Pide a un administrador revisarla en Consulta de cuentas." chip="Bloqueada" />
                        : <AvisoResultado tono="exito" titulo="Cuenta encontrada" texto="El enlace llegará solo al correo de la cuenta." chip="Activa" />}
                    <Tarjeta icono={iconoUsuario} titulo="Datos de la cuenta" subtitulo="El correo se muestra parcialmente.">
                        <Datos>
                            <Dato etiqueta="Correo">{enmascararCorreo(c.correo)}</Dato>
                            <Dato etiqueta="Credencial">{c.credencial}</Dato>
                            <Dato etiqueta="Creada">{fechaCorta(c.creada)}</Dato>
                        </Datos>
                    </Tarjeta>
                    <div className="contenidos-previa__acciones">
                        {!c.bloqueada && <Link to={`${RUTA}/${c.id}/verificar`} className="contenidos-boton contenidos-boton--principal">Verificar identidad</Link>}
                        <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul">Buscar otra cuenta</Link>
                    </div>
                </Pantalla>
            )}
        </ConCuenta>
    );
}

// ---------- Verificar identidad y confirmar envío (Figma 577:36593, 577:37302, error 577:38446) ----------

export function VerificarIdentidad() {
    return <ConCuenta>{(c) => (c.bloqueada ? <Navigate to={`${RUTA}/${c.id}`} replace /> : <Verificacion c={c} />)}</ConCuenta>;
}

function Verificacion({ c }: { c: CuentaRecuperacion }) {
    const navigate = useNavigate();
    const [marcados, setMarcados] = useState<boolean[]>(() => PUNTOS_VERIFICACION.map(() => false));
    const [confirmando, setConfirmando] = useState(false);
    const [aviso, setAviso] = useState("");
    const [error, setError] = useState(false);

    function enviar() {
        setConfirmando(false);
        // Para revisar el estado de error sin backend: ?simular=error-envio
        if (simulacion() === "error-envio") { setError(true); return; }
        registrarIntento(c, "enviado");
        navigate(`${RUTA}/${c.id}/enviado`);
    }

    function fallida() {
        registrarIntento(c, "fallida");
        navigate(`${RUTA}/${c.id}/fallida`);
    }

    return (
        <Pantalla migas={[[c.id, `${RUTA}/${c.id}`], ["Verificar identidad"]]}>
            <EncabezadoPagina volver={{ texto: "Volver a la cuenta", ruta: `${RUTA}/${c.id}` }} etiqueta="Verificación" titulo="Verificar identidad"
                texto="Marca lo que la persona mostró o respondió correctamente." />
            {error && <AvisoResultado tono="error" titulo="No se pudo enviar el enlace" texto="No se registró el envío. Inténtalo de nuevo en unos minutos." chip="Error" />}
            {aviso && <div className="at-bloque at-bloque--error" role="alert"><strong>Falta verificar</strong><p>{aviso}</p></div>}
            <Tarjeta icono={iconoCheck} titulo="Lista de verificación" subtitulo="Los tres primeros puntos son obligatorios.">
                <ListaCotejo puntos={PUNTOS_VERIFICACION.map((p) => ({ titulo: p.titulo, detalle: p.obligatorio ? undefined : "Opcional" }))} marcados={marcados}
                    alCambiar={(i) => { setAviso(""); setMarcados((m) => m.map((x, j) => (j === i ? !x : x))); }} />
            </Tarjeta>
            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--principal"
                    onClick={() => (puedeEnviar(marcados) ? setConfirmando(true) : setAviso("Marca los tres puntos obligatorios antes de enviar el enlace."))}>
                    Verificada, enviar enlace
                </button>
                <button type="button" className="contenidos-boton at-boton--guinda" onClick={fallida}>No pasó la verificación</button>
                <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul">Cancelar</Link>
            </div>
            {confirmando && (
                <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Enviar el enlace de recuperación?"
                    texto={`Llegará a ${enmascararCorreo(c.correo)}. La persona elegirá su nueva contraseña desde su correo; tú nunca la ves.`}
                    textoConfirmar="Sí, enviar enlace" alConfirmar={enviar} alCerrar={() => setConfirmando(false)} />
            )}
        </Pantalla>
    );
}

// ---------- Resultados (enlace enviado 577:37372, verificación fallida 577:36957) ----------

export function ResultadoRecuperacion({ tipo }: { tipo: "enviado" | "fallida" }) {
    return (
        <ConCuenta>
            {(c) => (
                <Pantalla migas={[[tipo === "enviado" ? "Enlace enviado" : "Verificación fallida"]]}>
                    <EncabezadoPagina etiqueta={`Cuenta ${c.id}`} titulo={tipo === "enviado" ? "Enlace enviado" : "Verificación fallida"}
                        texto={tipo === "enviado" ? "Pide a la persona que revise su correo, incluida la carpeta de no deseados." : "No se envió ningún enlace. El intento quedó registrado."} />
                    <AvisoResultado tono={tipo === "enviado" ? "exito" : "error"} titulo={c.nombre}
                        texto={tipo === "enviado" ? `Enlace enviado a ${enmascararCorreo(c.correo)} (ejemplo).` : "La persona puede volver con una identificación vigente."}
                        chip={tipo === "enviado" ? "Enviado" : "Sin enlace"} />
                    <div className="contenidos-previa__acciones">
                        <Link to={RUTA} className="contenidos-boton contenidos-boton--principal">Atender a otra persona</Link>
                        <Link to={`${RUTA}/historial`} className="contenidos-boton contenidos-boton--suave-azul">Ver historial</Link>
                    </div>
                </Pantalla>
            )}
        </ConCuenta>
    );
}

// ---------- Historial (Figma 577:38071) ----------

export function HistorialRecuperacion() {
    const historial = useHistorialRecuperacion();
    return (
        <Pantalla migas={[["Historial"]]}>
            <EncabezadoPagina volver={{ texto: "Volver a Recuperación asistida", ruta: RUTA }} etiqueta="Recuperación asistida · Historial" titulo="Historial de recuperaciones"
                texto="Quién atendió cada caso y qué pasó. Datos de ejemplo." />
            <section className="contenidos-lista" aria-labelledby="rec-historial-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoReloj /></span>
                    <div><h2 id="rec-historial-titulo">Recuperaciones atendidas</h2><p>De la más reciente a la más antigua.</p></div>
                </div>
                {historial.length === 0 ? (
                    <div className="contenidos-vacio"><span><span className="contenidos-vacio__icono"><IconoReloj /></span><strong>Todavía no hay recuperaciones</strong><span>Cuando atiendas a alguien, aparecerá aquí.</span></span></div>
                ) : (
                    <div className="contenidos-tabla recuperacion-tabla" tabIndex={0} role="table" aria-label="Recuperaciones atendidas">
                        <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                            {["Folio", "Persona", "Fecha", "Resultado", "Atendió"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                        </div>
                        {historial.map((i) => (
                            <div key={i.folio} className="contenidos-tabla__fila" role="row">
                                <span role="cell" className="contenidos-tabla__folio">{i.folio}</span>
                                <span role="cell" className="contenidos-tabla__titulo">{i.persona}</span>
                                <span role="cell">{fechaCorta(i.fecha)}</span>
                                <span role="cell"><span className={`contenidos-estado contenidos-estado--${i.resultado === "enviado" ? "publicado" : "con_observaciones"}`}>{i.resultado === "enviado" ? "Enlace enviado" : "Verificación fallida"}</span></span>
                                <span role="cell">{i.atendio}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </Pantalla>
    );
}
