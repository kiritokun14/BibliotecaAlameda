import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { mensajeError } from "../../../servicios/api";
import { enviarSolicitud, hoyLocal, type TipoSolicitudEspacio } from "../../../servicios/espacios";
import { Campo } from "../perfil/secciones";
import { iconosSeccion } from "../perfil/iconos";
import { sesionSimulada, useSesion } from "../perfil/usarSesion";
import { AyudaTramite, PasosTramite } from "../credencial/piezas";
import PedirSesion from "../sesion/PedirSesion";
import { espaciosEvento, pasosEspacio, rutasEspacio, zonaPorSlug } from "./datos";
import { DetalleEspacio } from "./piezas";
import { guardarSimulada, HORARIO, recordarSolicitud, validarSolicitud, type DatosSolicitud, type ErroresSolicitud } from "./datosSesion";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "../credencial/CredencialSesion.css";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";

// Espacios · paso 2: fecha y datos (plantilla C, como la solicitud de Credencial; Aldahir, 20 nov 2026).
// /espacios/solicitar?espacio=slug → formulario (qué necesitas, cuándo, cuántas personas y para qué) | el espacio elegido + ayuda.
// Enviar no reserva el espacio: el personal revisa la agenda y responde. Al enviar se va al seguimiento de la solicitud.
const vacio: DatosSolicitud = { tipo: "uso_espacio", fecha: "", horaInicio: "", horaFin: "", personas: "", motivo: "", institucion: "" };
const ORDEN: (keyof ErroresSolicitud)[] = ["fecha", "horaInicio", "horaFin", "personas", "institucion", "motivo"];

export default function Solicitar() {
    const sesion = useSesion();
    const [parametros] = useSearchParams();
    const slug = parametros.get("espacio") ?? "";
    const zona = zonaPorSlug(slug);

    if (sesion === null) {
        return (
            <PaginaPublica>
                <PedirSesion titulo="Inicia sesión para solicitar un espacio" texto="Puedes ver el mapa sin cuenta; para pedir un espacio y seguir tu solicitud, entra con tu cuenta." />
            </PaginaPublica>
        );
    }
    if (!zona) return <Navigate to="/espacios" replace />;

    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.espacios} etiqueta="Espacios" titulo={<>Solicita el <span>espacio</span></>}
                texto="Dinos cuándo y para qué lo necesitas; el personal revisa la agenda y te responde." />
            <section className="contacto-seccion contacto-seccion--crema cred-pagina esp-pagina">
                <div className="contacto-pila">
                    <PasosTramite nombres={pasosEspacio} rutas={rutasEspacio(slug)} actual={2} pagina={2} solicitar />
                    <Formulario slug={slug} />
                </div>
            </section>
        </PaginaPublica>
    );
}

function Formulario({ slug }: { slug: string }) {
    const navegar = useNavigate();
    const zona = zonaPorSlug(slug)!;
    const evento = espaciosEvento[zona.id];
    const hoy = hoyLocal();
    const [datos, setDatos] = useState(vacio);
    const [errores, setErrores] = useState<ErroresSolicitud>({});
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState("");
    const bloqueo = useRef(false);
    const cambiar = (campo: keyof DatosSolicitud, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));

    function enviar(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        const encontrados = validarSolicitud(datos, hoy, evento.capacidad);
        setErrores(encontrados);
        const primero = ORDEN.find((c) => encontrados[c]);
        if (primero) { document.getElementById(`esp-${primero}`)?.focus(); return; }
        bloqueo.current = true; setEnviando(true); setErrorEnvio("");
        if (sesionSimulada) {
            const s = guardarSimulada(datos, { slug, nombre: zona.nombre });
            navegar(`/espacios/solicitud/${s.folio}`, { state: { enviada: true } });
            return;
        }
        // Se registra en el servidor; si falla, lo escrito se conserva para reintentar
        enviarSolicitud({
            tipo: datos.tipo, areaId: slug, fecha: datos.fecha, horaInicio: datos.horaInicio, horaFin: datos.horaFin,
            personas: Number(datos.personas), motivo: datos.motivo.trim(), institucion: datos.institucion.trim() || undefined,
        })
            .then((s) => { recordarSolicitud(s); navegar(`/espacios/solicitud/${encodeURIComponent(s.folio)}`, { state: { enviada: true } }); })
            .catch((error) => { setErrorEnvio(mensajeError(error)); bloqueo.current = false; setEnviando(false); });
    }

    const opciones: { valor: TipoSolicitudEspacio; titulo: string; texto: string }[] = [
        { valor: "uso_espacio", titulo: "Una actividad o evento", texto: "Presentación, taller, charla, exposición…" },
        { valor: "visita", titulo: "Una visita guiada", texto: "Para una escuela o un grupo." },
    ];

    return (
        <div className="contacto-columnas contacto-columnas--nuevo">
            <form className="formulario-contacto cred-formulario esp-formulario" onSubmit={enviar} noValidate aria-labelledby="titulo-solicitud-espacio" aria-busy={enviando}>
                <h2 id="titulo-solicitud-espacio" className="formulario-contacto__titulo">Tu solicitud</h2>

                <fieldset className="cred-grupo" disabled={enviando}>
                    <legend className="cred-grupo__titulo">¿Qué necesitas?</legend>
                    <div className="perfil-opciones cred-opciones-tipo">
                        {opciones.map((o) => (
                            <label key={o.valor} className={`perfil-opcion${datos.tipo === o.valor ? " perfil-opcion--activa" : ""}`}>
                                <input type="radio" name="tipo" value={o.valor} checked={datos.tipo === o.valor} onChange={() => cambiar("tipo", o.valor)} />
                                <strong>{o.titulo}</strong>
                                <span>{o.texto}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="cred-grupo" disabled={enviando}>
                    <legend className="cred-grupo__titulo">¿Cuándo?</legend>
                    <div className="perfil-fila esp-fila-tres">
                        <Campo id="esp-fecha" etiqueta="Fecha" tipo="date" valor={datos.fecha} alCambiar={(v) => cambiar("fecha", v)} error={errores.fecha} icono={iconosSeccion.eventos}
                            ayuda={errores.fecha ? undefined : HORARIO.texto} />
                        <Campo id="esp-horaInicio" etiqueta="Desde" tipo="time" valor={datos.horaInicio} alCambiar={(v) => cambiar("horaInicio", v)} error={errores.horaInicio} />
                        <Campo id="esp-horaFin" etiqueta="Hasta" tipo="time" valor={datos.horaFin} alCambiar={(v) => cambiar("horaFin", v)} error={errores.horaFin} />
                    </div>
                </fieldset>

                <fieldset className="cred-grupo" disabled={enviando}>
                    <legend className="cred-grupo__titulo">¿Para qué y para cuántas personas?</legend>
                    <div className="perfil-fila">
                        <Campo id="esp-personas" etiqueta="Personas" valor={datos.personas} modoTeclado="numeric" maximo={3}
                            marcador={`Hasta ${evento.capacidad}`} alCambiar={(v) => cambiar("personas", v.replace(/\D/g, ""))} error={errores.personas} icono={iconosSeccion.datos} />
                        {datos.tipo === "visita" ? (
                            <Campo id="esp-institucion" etiqueta="Escuela o grupo" obligatorio={false} valor={datos.institucion} maximo={150}
                                marcador="Ej. Primaria Amado Nervo" alCambiar={(v) => cambiar("institucion", v)} error={errores.institucion} />
                        ) : <div aria-hidden="true" />}
                    </div>
                    <div className="perfil-campo">
                        <label htmlFor="esp-motivo">Describe la actividad<span>(obligatorio)</span></label>
                        <textarea id="esp-motivo" rows={3} maxLength={300} value={datos.motivo} placeholder="Qué harán, quién la organiza y qué necesitan"
                            onChange={(e) => cambiar("motivo", e.target.value)} aria-invalid={errores.motivo ? true : undefined}
                            aria-describedby={errores.motivo ? "esp-motivo-error" : undefined} />
                        {errores.motivo && <p id="esp-motivo-error" className="perfil-campo__error">{errores.motivo}</p>}
                    </div>
                </fieldset>

                <div className="perfil-nota perfil-nota--dorada">
                    <img src={notaInfoDorada} alt="" />
                    <p>Enviar la solicitud no reserva el espacio: el personal revisa la agenda y te responde en tu cuenta.</p>
                </div>
                {errorEnvio && <p className="cred-error-campo" role="alert">No pudimos enviar tu solicitud: {errorEnvio}</p>}
                <div className="perfil-acciones">
                    <button type="submit" className="perfil-boton" disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</button>
                    <Link to={`/espacios?espacio=${slug}`} className="perfil-boton perfil-boton--contorno">Cambiar de espacio</Link>
                </div>
                <p className="solo-lectores" role="status">{enviando ? "Enviando, espera un momento." : ""}</p>
            </form>

            <div className="contacto-lateral">
                <section className="esp-tarjeta" aria-label={`Tu espacio: ${zona.nombre}`}>
                    <DetalleEspacio key={zona.id} zona={zona} />
                </section>
                <AyudaTramite compacta texto="El personal te orienta con tu solicitud." />
            </div>
        </div>
    );
}
