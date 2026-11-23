// Atención › Recuperación asistida (Figma 577:35507). 22 nov 2026: rehecha con las piezas del panel y la paleta
// (plantilla «Formulario»): verificar a la persona y escribir el correo de su cuenta | «Antes de enviar» con avance,
// confirmación en el lugar y lo atendido hoy. El envío es real (POST /auth/recuperar); el historial es de esta pestaña.
// Las rutas viejas por cuenta (/:id, /:id/verificar, /:id/enviado, /:id/fallida) regresan a esta pantalla.
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router";
import PanelLayout from "../../PanelLayout";
import { Migas } from "../../componentes";
import { Aviso, Cabecera, Chip, Cifra, Dato, Datos, Encabezado, Icono, Plegable, Segmentado, Tarjeta, Vacio } from "../../piezasPanel";
import { mensajeError } from "../../../../servicios/api";
import { enviarEnlaceRecuperacion } from "../../../../servicios/auth";
import { esCorreoValido } from "../../../../servicios/validaciones";
import { Paso } from "../comun/Paso";
import "./Recuperacion.css";
import { PUNTOS_VERIFICACION, enmascararCorreo, esDeHoy, horaCorta, puedeEnviar, registrarIntento, useHistorialRecuperacion, type IntentoRecuperacion } from "./datos";

const RUTA = "/admin/atencion/recuperacion";

function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Atención" tema="contenidos paleta">
            <Migas pasos={migas} />
            <div className="pz-pagina">{children}</div>
        </PanelLayout>
    );
}


// Fila compacta de un intento (lateral y historial)
function FilaIntento({ intento }: { intento: IntentoRecuperacion }) {
    const enviado = intento.resultado === "enviado";
    return (
        <article className={`pz-fila${enviado ? "" : " pz-fila--guinda"}`}>
            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={enviado ? "check" : "alerta"} /></span>
            <div className="pz-fila__textos">
                <h4 className="pz-fila__titulo">{intento.correo}</h4>
                <p className="pz-fila__detalle"><span className="pz-fila__folio">{intento.folio}</span><span>{horaCorta(intento.fecha)}</span></p>
            </div>
            <Chip tono={enviado ? "verde" : "guinda"}>{enviado ? "Enlace enviado" : "Sin verificar"}</Chip>
        </article>
    );
}

// ---------- Atender a una persona ----------

export default function Recuperacion() {
    const id = useId();
    const historial = useHistorialRecuperacion();
    const [marcados, setMarcados] = useState<boolean[]>(() => PUNTOS_VERIFICACION.map(() => false));
    const [correo, setCorreo] = useState("");
    const [errorCorreo, setErrorCorreo] = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [resultado, setResultado] = useState<{ intento: IntentoRecuperacion } | null>(null);

    const verificada = puedeEnviar(marcados);
    const correoValido = esCorreoValido(correo.trim());
    const requisitos = [verificada, correoValido];
    const marcadosObligatorios = PUNTOS_VERIFICACION.filter((p, i) => p.obligatorio && marcados[i]).length;
    const listos = [verificada, correoValido].filter(Boolean).length;
    const completo = verificada && correoValido;
    const deHoy = historial.filter((i) => esDeHoy(i.fecha));

    function reiniciar() {
        setMarcados(PUNTOS_VERIFICACION.map(() => false));
        setCorreo("");
        setErrorCorreo("");
        setConfirmando(false);
        setError("");
        setResultado(null);
    }

    function pedirConfirmacion(e: FormEvent) {
        e.preventDefault();
        setError("");
        if (!correoValido) { setErrorCorreo("Escribe un correo válido, por ejemplo nombre@ejemplo.mx."); document.getElementById(`${id}-correo-campo`)?.focus(); return; }
        if (!verificada) { setError("Marca los tres puntos obligatorios antes de enviar el enlace."); return; }
        setConfirmando(true);
    }

    async function enviar() {
        setEnviando(true);
        setError("");
        try {
            await enviarEnlaceRecuperacion(correo);
            setResultado({ intento: registrarIntento(correo, "enviado") });
        } catch (e) {
            setError(mensajeError(e));
            setConfirmando(false);
        } finally { setEnviando(false); }
    }

    function noPaso() {
        setResultado({ intento: registrarIntento(correo, "fallida") });
    }

    const encabezado = (
        <Encabezado titulo="Recuperación asistida" texto="Ayuda a una persona que no puede entrar a su cuenta. Nunca se te muestra ni se te pide su contraseña.">
            <Cifra icono="check" valor={deHoy.filter((i) => i.resultado === "enviado").length} texto="enlaces hoy" />
            <Cifra icono="alerta" tono="vino" valor={deHoy.filter((i) => i.resultado === "fallida").length} texto="sin verificar hoy" />
        </Encabezado>
    );

    if (resultado) {
        const enviado = resultado.intento.resultado === "enviado";
        return (
            <Pantalla migas={[["Recuperación asistida"]]}>
                {encabezado}
                <div className="pz-columnas pz-columnas--libre">
                    <Tarjeta icono={enviado ? "check" : "alerta"} id={`${id}-resultado`} titulo={enviado ? "Enlace enviado" : "No pasó la verificación"}
                        texto={enviado ? "Pídele que revise su correo, incluida la carpeta de no deseados" : "No se envió ningún enlace"}
                        accion={<Chip tono={enviado ? "verde" : "guinda"}>{enviado ? "Enviado" : "Sin enlace"}</Chip>}>
                        {enviado ? (
                            <div className="pz-envio-ok" role="status">
                                <span className="pz-envio-ok__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                                <p><strong>Si {resultado.intento.correo} tiene una cuenta, le llegará el enlace en unos minutos.</strong> Por seguridad, la respuesta es la misma aunque el correo no esté registrado.</p>
                            </div>
                        ) : (
                            <Aviso tono="espera" titulo="La persona puede volver con una identificación vigente." texto="El intento quedó en el historial de esta pestaña." />
                        )}
                        <Datos>
                            <Dato icono="lista" etiqueta="Folio">{resultado.intento.folio}</Dato>
                            <Dato icono="reloj" etiqueta="Hora">{horaCorta(resultado.intento.fecha)}</Dato>
                            <Dato icono="mensajes" etiqueta="Correo" ancho>{resultado.intento.correo}</Dato>
                        </Datos>
                        <div className="pz-acciones pz-acciones--fila">
                            <button type="button" className="pz-boton pz-boton--chico" onClick={reiniciar}>Atender a otra persona</button>
                            <Link to={`${RUTA}/historial`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver historial</Link>
                        </div>
                    </Tarjeta>
                    <aside className="pz-lateral" aria-label="Qué sigue">
                        <Tarjeta icono="revision" id={`${id}-sigue`} titulo="¿Qué sigue?" texto={enviado ? "Lo que hace la persona" : "Para volver a intentarlo"}>
                            {enviado ? <ol className="pz-linea">
                                <Paso tono="verde" icono="check" titulo="Identidad verificada" texto="Revisaste su identificación en el módulo." />
                                <Paso tono={enviado ? "dorado" : "gris"} icono="mensajes" titulo="Abre el enlace" texto="Le llega al correo de su cuenta; vence en unas horas." actual={enviado} />
                                <Paso tono="gris" icono="usuario" titulo="Elige su nueva contraseña" texto="Desde su correo; tú nunca la ves ni la escribes." />
                            </ol> : <ol className="pz-linea">
                                <Paso tono="guinda" icono="alerta" titulo="Sin enlace" texto="No se pudo confirmar que es la titular de la cuenta." actual />
                                <Paso tono="gris" icono="usuario" titulo="Vuelve con su identificación" texto="Una identificación oficial vigente con el nombre de la cuenta." />
                                <Paso tono="gris" icono="mensajes" titulo="Se atiende de nuevo" texto="Verifícala otra vez y envía el enlace a su correo." />
                            </ol>}
                        </Tarjeta>
                    </aside>
                </div>
            </Pantalla>
        );
    }

    return (
        <Pantalla migas={[["Recuperación asistida"]]}>
            {encabezado}
            <ol className="pz-etapas" aria-label="Pasos para recuperar el acceso">
                {[
                    { texto: "Verifica a la persona", hecho: verificada, actual: !verificada },
                    { texto: "Escribe el correo de su cuenta", hecho: correoValido, actual: verificada && !correoValido },
                    { texto: "Envía el enlace", hecho: false, actual: completo },
                ].map((e, i) => (
                    <li key={e.texto} className={`pz-etapas__paso${e.hecho ? " pz-etapas__paso--hecho" : ""}${e.actual ? " pz-etapas__paso--actual" : ""}`} aria-current={e.actual ? "step" : undefined}>
                        <span className="pz-etapas__numero" aria-hidden="true">{e.hecho ? <Icono nombre="check" /> : i + 1}</span>
                        <span className="pz-etapas__texto">{e.texto}</span>
                    </li>
                ))}
            </ol>
            <form className="pz-columnas pz-columnas--libre" onSubmit={pedirConfirmacion} noValidate aria-label="Enviar enlace de recuperación">
                <div className="pz-principal">
                    <Tarjeta icono="buscarCuenta" id={`${id}-verificar`} titulo="1. Verifica a la persona" texto="Marca lo que mostró o respondió correctamente"
                        accion={<Chip tono={verificada ? "verde" : "dorado"}>{verificada ? "Verificada" : `${marcadosObligatorios} de 3 obligatorios`}</Chip>}>
                        <ul className="rec-verifica" aria-label="Puntos para verificar a la persona">
                            {PUNTOS_VERIFICACION.map((p, i) => (
                                <li key={p.titulo}>
                                    <label className={`rec-punto${marcados[i] ? " rec-punto--hecho" : ""}${p.obligatorio ? "" : " rec-punto--opcional"}`}>
                                        <input type="checkbox" className="rec-punto__casilla" checked={marcados[i]} disabled={confirmando}
                                            onChange={() => { setError(""); setMarcados((m) => m.map((x, j) => (j === i ? !x : x))); }} />
                                        <span className="rec-punto__icono" aria-hidden="true"><Icono nombre={p.icono} /></span>
                                        <span className="rec-punto__textos">
                                            <strong>{p.titulo}</strong>
                                            <small>{p.detalle}</small>
                                        </span>
                                        <span className="rec-punto__tipo">{p.obligatorio ? "Obligatorio" : "Opcional"}</span>
                                        <span className="rec-punto__marca" aria-hidden="true">{marcados[i] && <Icono nombre="check" />}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </Tarjeta>

                    <Tarjeta icono="mensajes" id={`${id}-correo`} titulo="2. Correo de su cuenta" texto="El enlace llega solo a ese correo">
                        <div className={`pz-campo pz-campo--lleno${errorCorreo ? " pz-campo--error" : ""}`}>
                            <label htmlFor={`${id}-correo-campo`} className="rec-etiqueta">Correo con el que se registró *</label>
                            <input id={`${id}-correo-campo`} type="email" value={correo} maxLength={254} placeholder="nombre@ejemplo.mx" autoComplete="off" disabled={confirmando}
                                aria-invalid={!!errorCorreo} aria-describedby={`${id}-correo-nota`}
                                onChange={(e) => { setCorreo(e.target.value); setErrorCorreo(""); }} />
                            {errorCorreo ? <p id={`${id}-correo-nota`} className="pz-campo__error" role="alert">{errorCorreo}</p>
                                : <small id={`${id}-correo-nota`} className="pz-campo__ayuda">Por seguridad no se te dice si existe una cuenta con ese correo.</small>}
                        </div>
                    </Tarjeta>

                    <Plegable titulo="Si la persona ya no usa ese correo">
                        <ul>
                            <li>No envíes el enlace a otro correo: solo llega al de la cuenta.</li>
                            <li>Pide a un administrador que revise la cuenta en Consulta de cuentas.</li>
                            <li>Si nunca tuvo cuenta, puede registrarse con un alta asistida.</li>
                        </ul>
                    </Plegable>
                </div>

                <aside className="pz-lateral" aria-label="Enviar el enlace">
                    <section className={`pz-tarjeta pz-guardar pz-envio${completo ? " pz-envio--listo" : ""}`} aria-labelledby={`${id}-enviar`}>
                        <Cabecera icono={completo ? "check" : "lista"} id={`${id}-enviar`} titulo={completo ? "3. Listo para enviar" : "3. Envía el enlace"}
                            texto={completo ? "Confirma y se manda al correo de la cuenta" : "Se activa al completar los pasos 1 y 2"} />
                        <div className="pz-envio__avance">
                            <p><strong>{listos} de {requisitos.length}</strong> pasos listos</p>
                            <span className="pz-envio__barra" aria-hidden="true"><span style={{ width: `${(listos / requisitos.length) * 100}%` }} /></span>
                        </div>
                        <Datos>
                            <Dato icono="usuario" etiqueta="Identidad" ancho>{verificada ? "Verificada en el módulo" : "Falta verificarla"}</Dato>
                            <Dato icono="mensajes" etiqueta="El enlace llegará a" ancho>{correoValido ? enmascararCorreo(correo) : "Escribe el correo"}</Dato>
                        </Datos>
                        {error && <Aviso tono="error" titulo="No se pudo enviar." texto={error} />}
                        {confirmando ? (
                            <div className="pz-decision" role="group" aria-label="Confirmar envío">
                                <p className="rec-pregunta"><strong>¿Enviar el enlace a {enmascararCorreo(correo)}?</strong> La persona elegirá su nueva contraseña desde su correo.</p>
                                <div className="pz-acciones">
                                    <button type="button" className="pz-boton" disabled={enviando} onClick={() => void enviar()}>{enviando ? "Enviando…" : "Sí, enviar enlace"}</button>
                                    <button type="button" className="pz-boton pz-boton--contorno" disabled={enviando} onClick={() => setConfirmando(false)}>Volver</button>
                                </div>
                            </div>
                        ) : (
                            <div className="pz-acciones">
                                <button type="submit" className="pz-boton" disabled={!completo}>Enviar enlace de recuperación</button>
                                <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno" onClick={noPaso}>No pasó la verificación</button>
                            </div>
                        )}
                    </section>

                    <Tarjeta icono="reloj" id={`${id}-hoy`} titulo="Atendidas hoy" texto={deHoy.length ? `${deHoy.length} en esta pestaña` : "Aún nadie en esta pestaña"}
                        accion={<Link to={`${RUTA}/historial`} className="pz-boton pz-boton--contorno pz-boton--chico">Historial</Link>}>
                        {deHoy.length === 0 ? <p className="pz-ayuda">Cuando envíes un enlace, aparecerá aquí.</p> : (
                            <ul className="pz-filas">{deHoy.slice(0, 3).map((i) => <li key={i.folio}><FilaIntento intento={i} /></li>)}</ul>
                        )}
                    </Tarjeta>
                </aside>
            </form>
        </Pantalla>
    );
}

// ---------- Rutas viejas por cuenta: ya no hay cuentas de ejemplo; regresan a atender ----------

export function CuentaEncontrada() { return <Navigate to={RUTA} replace />; }
export function VerificarIdentidad() { return <Navigate to={RUTA} replace />; }
export function ResultadoRecuperacion(_: { tipo: "enviado" | "fallida" }) { void _; return <Navigate to={RUTA} replace />; }

// ---------- Historial (Figma 577:38071) ----------

type FiltroHistorial = "todos" | "enviado" | "fallida";

export function HistorialRecuperacion() {
    const id = useId();
    const historial = useHistorialRecuperacion();
    const [filtro, setFiltro] = useState<FiltroHistorial>("todos");
    const visibles = historial.filter((i) => filtro === "todos" || i.resultado === filtro);
    const enviados = historial.filter((i) => i.resultado === "enviado").length;

    return (
        <Pantalla migas={[["Recuperación asistida", RUTA], ["Historial"]]}>
            <Encabezado titulo="Historial de recuperaciones" texto="Lo que se atendió en esta pestaña: a qué correo se envió el enlace y qué pasó.">
                <Cifra icono="check" valor={enviados} texto="enlaces enviados" activa={filtro === "enviado"} alPresionar={() => setFiltro(filtro === "enviado" ? "todos" : "enviado")} />
                <Cifra icono="alerta" tono="vino" valor={historial.length - enviados} texto="sin verificar" activa={filtro === "fallida"} alPresionar={() => setFiltro(filtro === "fallida" ? "todos" : "fallida")} />
            </Encabezado>
            <div className="pz-columnas">
                <Tarjeta icono="recuperacion" id={`${id}-lista`} titulo="Recuperaciones atendidas" texto="De la más reciente a la más antigua" className="pz-pendientes"
                    accion={<Link to={RUTA} className="pz-boton pz-boton--chico">Atender a una persona</Link>}>
                    <Segmentado<FiltroHistorial> etiqueta="Filtrar por resultado" valor={filtro} alCambiar={setFiltro}
                        opciones={[
                            { valor: "todos", texto: "Todos", cantidad: historial.length },
                            { valor: "enviado", texto: "Enlace enviado", cantidad: enviados },
                            { valor: "fallida", texto: "Sin verificar", cantidad: historial.length - enviados },
                        ]} />
                    {visibles.length === 0 ? (
                        <Vacio icono="recuperacion" titulo={historial.length ? "Nada con este filtro" : "Todavía no hay recuperaciones"}
                            texto={historial.length ? "Prueba con otro resultado." : "Cuando atiendas a alguien, aparecerá aquí."} />
                    ) : (
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label="Recuperaciones atendidas">
                            <ul className="pz-filas">{visibles.map((i) => <li key={i.folio}><FilaIntento intento={i} /></li>)}</ul>
                        </div>
                    )}
                    <div className="pz-tarjeta__pie"><p aria-live="polite">{visibles.length} de {historial.length} recuperaciones</p></div>
                </Tarjeta>
                <aside className="pz-lateral" aria-label="Sobre el historial">
                    <Tarjeta icono="info" id={`${id}-sobre`} titulo="Sobre este historial" texto="Mientras se conecta al servidor" className="pz-tarjeta--actividades">
                        <ol className="pz-linea">
                            <Paso tono="dorado" icono="reloj" titulo="Solo esta pestaña" texto="Al cerrarla, la lista se borra. El servidor todavía no guarda quién atendió cada caso." />
                            <Paso tono="verde" icono="check" titulo="Sin datos de más" texto="El correo se guarda parcial y nunca se registra una contraseña." />
                        </ol>
                    </Tarjeta>
                </aside>
            </div>
        </Pantalla>
    );
}
