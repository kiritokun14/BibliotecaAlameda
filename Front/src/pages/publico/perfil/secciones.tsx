import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { guardarPerfil, type PerfilPropio } from "../../../servicios/perfil";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { Dato, EncabezadoSeccion, TarjetaPerfil } from "./piezas";
import {
    cancelarCambioCorreo, consultarCorreoPendiente, consultarDomicilio, formatearFecha, guardarDomicilio,
    nombreCompleto, porcentajeProgreso, resumenCredencial, resumenEjemplo, consultarResponsable, guardarResponsable, validarResponsable, solicitarCambioCorreo, validarCorreo, validarDatos,
    type Domicilio, type ErroresDatos,
} from "./datos";
import { sinLeer, useNotificaciones } from "../notificaciones/datos";
import { useTramite } from "../credencial/datos";
import iconoArchivo from "../../../assets/perfil/acceso-archivo.svg";
import iconoBuscar from "../../../assets/perfil/acceso-buscar.svg";
import iconoSala from "../../../assets/perfil/acceso-sala.svg";
import flechaBlanca from "../../../assets/perfil/acceso-flecha.svg";
import flechaOscura from "../../../assets/comun/iconos/flecha-oscura.svg";
import circuloProgreso from "../../../assets/perfil/progreso-circulo.svg";
import filaCampana from "../../../assets/perfil/fila-campana.svg";
import filaCalendario from "../../../assets/perfil/fila-calendario.svg";
import filaArchivo from "../../../assets/perfil/fila-archivo.svg";
import filaPin from "../../../assets/perfil/fila-pin.svg";
import tarjetaUsuario from "../../../assets/perfil/tarjeta-usuario.svg";
import tarjetaPin from "../../../assets/perfil/tarjeta-pin.svg";
import tarjetaCorreo from "../../../assets/perfil/tarjeta-correo.svg";
import iconoEditar from "../../../assets/perfil/boton-editar.svg";
import notaCandado from "../../../assets/perfil/nota-candado.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";
import tarjetaUsuarios from "../../../assets/perfil/tarjeta-usuarios.svg";
import puntoDorado from "../../../assets/comun/iconos/punto-dorado.svg";

// ---------- Resumen ----------
// Resumen: lo primero que se ve al entrar al perfil. Bienvenida con lo pendiente, tres accesos principales,
// el progreso y accesos rápidos. Las demás secciones están en el menú de la izquierda (no se repiten aquí).
function saludo(hora = new Date().getHours()) {
    return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

export function Resumen({ menor = false, nombre = "" }: { menor?: boolean; nombre?: string }) {
    const r = resumenEjemplo; // TODO backend: ver datos.ts
    const tramite = useTramite();
    const avisos = sinLeer(useNotificaciones());
    const accesos = [
        { ...resumenCredencial(tramite.estado), icono: iconoArchivo, color: "dorado", ruta: "/mi-perfil/credencial" },
        { ...r.actividades, icono: iconoBuscar, color: "verde", ruta: "/mi-perfil/eventos" },
        { ...r.asistencias, icono: iconoSala, color: "rosa", ruta: "/mi-perfil/progreso" },
    ];
    // Lo que conviene atender primero, según el estado de la cuenta
    // Tarjeta «Credencial» de la bienvenida: siempre aparece, con lo que conviene hacer según el estado
    const credencial = {
        "sin-solicitud": { titulo: "Aún no tienes credencial", texto: "Solicítala en línea en pocos minutos.", accion: "Solicitar credencial", ruta: "/credencial", atender: true },
        correccion: { titulo: "Corrección solicitada", texto: "La biblioteca pidió corregir un dato de tu solicitud.", accion: "Revisar corrección", ruta: "/credencial/seguimiento", atender: true },
        vencida: { titulo: "Tu credencial venció", texto: "Puedes renovarla en línea.", accion: "Renovar credencial", ruta: "/credencial/solicitud?tipo=renovacion", atender: true },
        "en-revision": { titulo: "Credencial en revisión", texto: "El personal está revisando tu solicitud.", accion: "Ver seguimiento", ruta: "/credencial/seguimiento", atender: false },
        vigente: { titulo: "Credencial vigente", texto: "Tu credencial está validada.", accion: "Ver mi credencial", ruta: "/mi-perfil/credencial", atender: false },
    }[tramite.estado];
    const rapidos = [
        { texto: "Ver eventos", icono: filaCalendario, ruta: "/eventos" },
        ...(menor ? [] : [
            { texto: "Solicitar un espacio", icono: filaPin, ruta: "/espacios" },
            { texto: "Proponer una actividad", icono: filaArchivo, ruta: "/proponer" },
        ]),
        { texto: "Escribir a la biblioteca", icono: filaCampana, ruta: "/contacto" },
    ];
    const avance = porcentajeProgreso(r.progreso.actuales, r.progreso.meta);
    const primerNombre = nombre.trim().split(/\s+/)[0];
    return (
        <>
            <section className="perfil-bienvenida" aria-labelledby="titulo-bienvenida">
                <p className="perfil-sobretitulo">RESUMEN DE MI CUENTA</p>
                <h2 id="titulo-bienvenida">{saludo()}{primerNombre ? `, ${primerNombre}` : ""}</h2>
                <p className="perfil-bienvenida__texto">
                    {menor ? "Cuenta de persona menor de edad: algunos trámites los realiza la persona responsable."
                        : "Aquí ves de un vistazo tu credencial, tus actividades y tu progreso en la biblioteca."}
                </p>
                {/* Dos tarjetas con la misma estructura: ícono, título, texto y acción */}
                <div className="perfil-bienvenida__estado">
                    <Link to="/notificaciones" className="perfil-estado">
                        <span className="perfil-estado__icono"><img src={filaCampana} alt="" /></span>
                        <span className="perfil-estado__textos">
                            <strong>{avisos ? `${avisos} ${avisos === 1 ? "aviso sin leer" : "avisos sin leer"}` : "Estás al día"}</strong>
                            <span>{avisos ? "Revisa lo que te envió la biblioteca." : "No tienes avisos pendientes."}</span>
                        </span>
                        <span className="perfil-estado__accion">Ver avisos <img src={flechaOscura} alt="" /></span>
                    </Link>
                    <Link to={credencial.ruta} className={`perfil-estado${credencial.atender ? " perfil-estado--atender" : ""}`}>
                        <span className="perfil-estado__icono"><img src={iconoArchivo} alt="" /></span>
                        <span className="perfil-estado__textos">
                            <strong>{credencial.titulo}</strong>
                            <span>{credencial.texto}</span>
                        </span>
                        <span className="perfil-estado__accion">{credencial.accion} <img src={flechaOscura} alt="" /></span>
                    </Link>
                </div>
            </section>
            {menor && (
                <div className="perfil-nota perfil-nota--dorada">
                    <img src={notaInfoDorada} alt="" />
                    <p><strong>Cuenta de menor de edad</strong>Se requiere el registro de una persona responsable. Algunos trámites los realiza ella o él.</p>
                </div>
            )}
            <div className="perfil-accesos">
                {accesos.map((a) => (
                    <Link key={a.titulo} to={a.ruta} className={`tarjeta-acceso tarjeta-acceso--${a.color}`}>
                        <span className="tarjeta-acceso__icono"><img src={a.icono} alt="" /></span>
                        <h3>{a.titulo}</h3>
                        <p>{a.texto}</p>
                        <span className="tarjeta-acceso__flecha"><img src={flechaBlanca} alt="" /></span>
                    </Link>
                ))}
            </div>
            <section className="perfil-progreso" aria-labelledby="titulo-mi-progreso">
                <img className="perfil-progreso__circulo" src={circuloProgreso} alt="" />
                <div className="perfil-progreso__cabecera">
                    <div>
                        <p id="titulo-mi-progreso" className="perfil-sobretitulo perfil-sobretitulo--claro">MI PROGRESO</p>
                        <p className="perfil-progreso__cifra"><strong>{r.progreso.actuales}</strong> de {r.progreso.meta} asistencias para el siguiente nivel</p>
                    </div>
                    <Link to="/mi-perfil/progreso" className="perfil-boton perfil-boton--dorado">
                        Ver mi progreso <img src={flechaOscura} alt="" />
                    </Link>
                </div>
                <div className="perfil-progreso__barra" role="progressbar" aria-valuemin={0} aria-valuemax={r.progreso.meta}
                    aria-valuenow={r.progreso.actuales} aria-label="Asistencias para el siguiente nivel">
                    <span style={{ width: `${avance}%` }} />
                </div>
            </section>
            {menor && <TarjetaResponsable compacta />}
            <section className="perfil-rapidos" aria-labelledby="titulo-rapidos">
                <p id="titulo-rapidos" className="perfil-sobretitulo">ACCESOS RÁPIDOS</p>
                <ul>
                    {rapidos.map((q) => (
                        <li key={q.texto}>
                            <Link to={q.ruta} className="perfil-rapido">
                                <span className="perfil-rapido__icono"><img src={q.icono} alt="" /></span>
                                {q.texto}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}

// ---------- Mis datos (solo lectura) ----------
export function MisDatos({ perfil, menor = false }: { perfil: PerfilPropio; menor?: boolean }) {
    const domicilio = consultarDomicilio();
    const pendiente = consultarCorreoPendiente();
    const guardado = (useLocation().state as { guardado?: boolean } | null)?.guardado;
    return (
        <>
            {menor
                ? <EncabezadoSeccion sobretitulo="MIS DATOS" titulo="Mis datos y persona responsable" texto="Consulta los datos de la cuenta y de la persona responsable." />
                : <EncabezadoSeccion sobretitulo="MIS DATOS" titulo="Mis datos" texto="Consulta tus datos personales y de contacto." />}
            {guardado && <p className="perfil-exito" role="status">Tus datos se guardaron correctamente.</p>}
            {pendiente && (
                <p className="perfil-aviso" role="status">
                    <img src={puntoDorado} alt="" />Falta confirmar {pendiente}.{" "}
                    <Link to="/mi-perfil/datos/correo-pendiente">Ver cambio de correo</Link>
                </p>
            )}
            {menor ? <>
                <TarjetaPerfil color="verde" icono={tarjetaUsuario} titulo="Datos de la persona usuaria">
                    <dl className="perfil-datos">
                        <Dato etiqueta="NOMBRE COMPLETO" valor={nombreCompleto(perfil)} />
                        <Dato etiqueta="FECHA DE NACIMIENTO" valor={formatearFecha(perfil.fechaNacimiento)} nota="Para cambiarla, acude con el personal." />
                        <Dato etiqueta="CORREO DE LA CUENTA" valor={perfil.correo} nota="Es el que se usa para iniciar sesión." />
                    </dl>
                </TarjetaPerfil>
                <TarjetaResponsable />
                <NotaConsentimiento />
            </> : <>
                <TarjetaPerfil color="verde" icono={tarjetaUsuario} titulo="Datos personales">
                    <dl className="perfil-datos">
                        <Dato etiqueta="NOMBRE(S)" valor={perfil.nombres} />
                        <Dato etiqueta="PRIMER APELLIDO" valor={perfil.primerApellido} />
                        <Dato etiqueta="SEGUNDO APELLIDO" valor={perfil.segundoApellido ?? ""} />
                        <Dato etiqueta="FECHA DE NACIMIENTO" valor={formatearFecha(perfil.fechaNacimiento)} nota="Para cambiarla, acude con el personal." />
                        <Dato etiqueta="TELÉFONO" valor={perfil.telefono} nota="Dato de contacto; no sustituye al correo." />
                        <Dato etiqueta="CORREO ELECTRÓNICO" valor={perfil.correo} nota="Es el que usas para iniciar sesión." />
                    </dl>
                </TarjetaPerfil>
                <TarjetaPerfil color="dorada" icono={tarjetaPin} titulo="Domicilio">
                    <dl className="perfil-datos">
                        <Dato etiqueta="CALLE" valor={[domicilio.calle, domicilio.numeroExterior, domicilio.numeroInterior && `int. ${domicilio.numeroInterior}`].filter(Boolean).join(" ")} />
                        <Dato etiqueta="COLONIA O LOCALIDAD" valor={domicilio.colonia} />
                        <Dato etiqueta="CÓDIGO POSTAL" valor={domicilio.codigoPostal} />
                        <Dato etiqueta="MUNICIPIO" valor={domicilio.municipio} />
                        <Dato etiqueta="ESTADO" valor={domicilio.estado} />
                    </dl>
                </TarjetaPerfil>
            </>}
            <div className="perfil-acciones">
                <Link to="/mi-perfil/datos/editar" className="perfil-boton">Editar mis datos <img src={iconoEditar} alt="" /></Link>
            </div>
            <NotaDatos />
        </>
    );
}

function NotaDatos() {
    return (
        <div className="perfil-nota">
            <img src={notaCandado} alt="" />
            <p><strong>Tus datos</strong>Solo el personal autorizado de la biblioteca puede verlos. Consulta el aviso de privacidad.</p>
        </div>
    );
}

// ---------- Editar mis datos ----------
type CampoProps = {
    id: string; etiqueta: string; valor: string; alCambiar: (v: string) => void; error?: string;
    obligatorio?: boolean; ayuda?: string; marcador?: string; deshabilitado?: boolean;
    tipo?: string; maximo?: number; autocompletar?: string; modoTeclado?: "numeric" | "email" | "text";
};
function Campo({ id, etiqueta, valor, alCambiar, error, obligatorio = true, ayuda, marcador, deshabilitado, tipo = "text", maximo, autocompletar, modoTeclado }: CampoProps) {
    const descripcion = [error && `${id}-error`, ayuda && `${id}-ayuda`].filter(Boolean).join(" ") || undefined;
    return (
        <div className="perfil-campo">
            <label htmlFor={id}>{etiqueta}{obligatorio && <span>(obligatorio)</span>}</label>
            <input id={id} name={id} type={tipo} value={valor} placeholder={marcador} disabled={deshabilitado}
                onChange={(e) => alCambiar(e.target.value)} maxLength={maximo} autoComplete={autocompletar} inputMode={modoTeclado}
                required={obligatorio && !deshabilitado} aria-invalid={error ? true : undefined} aria-describedby={descripcion} />
            {error && <p id={`${id}-error`} className="perfil-campo__error">{error}</p>}
            {ayuda && <p id={`${id}-ayuda`} className="perfil-campo__ayuda">{ayuda}</p>}
        </div>
    );
}

export function EditarDatos({ perfil, menor = false, alGuardar, alRecargar }: {
    perfil: PerfilPropio; menor?: boolean; alGuardar: (actualizado: PerfilPropio) => void; alRecargar: () => void;
}) {
    const [responsable, setResponsable] = useState(consultarResponsable);
    const navegar = useNavigate();
    const [nombres, setNombres] = useState(perfil.nombres);
    const [telefono, setTelefono] = useState(perfil.telefono);
    const [domicilio, setDomicilio] = useState<Domicilio>(consultarDomicilio);
    const [correo, setCorreo] = useState(perfil.correo);
    const [errores, setErrores] = useState<ErroresDatos & Record<string, string | undefined>>({});
    const [error, setError] = useState("");
    const [conflicto, setConflicto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);
    const cambiarDomicilio = (campo: keyof Domicilio) => (v: string) => setDomicilio((d) => ({ ...d, [campo]: v }));

    async function guardar(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        setError("");
        const encontrados: Record<string, string | undefined> = menor
            ? { ...validarResponsable(responsable), nombres: validarDatos({ nombres, telefono: perfil.telefono }, domicilio).nombres }
            : validarDatos({ nombres, telefono }, domicilio);
        for (const k of Object.keys(encontrados)) if (!encontrados[k]) delete encontrados[k];
        setErrores(encontrados);
        if (Object.keys(encontrados).length) {
            document.getElementById(Object.keys(encontrados)[0])?.focus();
            return;
        }
        bloqueo.current = true; setGuardando(true);
        try {
            const cambio = nombres.trim() !== perfil.nombres || (!menor && telefono.trim() !== perfil.telefono);
            const actualizado = cambio ? await guardarPerfil(perfil, { nombres: nombres.trim(), telefono: menor ? perfil.telefono : telefono.trim() }) : perfil;
            if (menor) guardarResponsable({ nombre: responsable.nombre.trim(), telefono: responsable.telefono.trim(), relacion: responsable.relacion.trim() });
            else guardarDomicilio({ ...domicilio, numeroInterior: domicilio.numeroInterior.trim() });
            alGuardar(actualizado);
            navegar("/mi-perfil/datos", { state: { guardado: true } });
        } catch (e) {
            setError(mensajeError(e));
            if (e instanceof ErrorServicio && e.estado === 409) setConflicto(true);
        } finally { bloqueo.current = false; setGuardando(false); }
    }

    function cambiarCorreo() {
        const problema = validarCorreo(correo, perfil.correo);
        setErrores((x) => ({ ...x, correo: problema || undefined }));
        if (problema) { document.getElementById("correo")?.focus(); return; }
        solicitarCambioCorreo(correo);
        navegar("/mi-perfil/datos/correo-pendiente");
    }

    return (
        <form className="perfil-formulario" onSubmit={guardar} noValidate>
            <EncabezadoSeccion sobretitulo="MIS DATOS" titulo="Editar mis datos"
                texto={menor ? "Mantén actualizados los datos de la cuenta y de la persona responsable." : "Mantén tu información actualizada."} />
            <fieldset disabled={guardando || conflicto}>
                {menor ? <>
                    <TarjetaPerfil color="verde" icono={tarjetaUsuario} titulo="Datos de la persona usuaria">
                        <div className="perfil-fila">
                            <Campo id="nombres" etiqueta="Nombre(s)" valor={nombres} alCambiar={setNombres} error={errores.nombres}
                                marcador="Ejemplo: Mateo" maximo={150} autocompletar="given-name" />
                            <Campo id="fecha" etiqueta="Fecha de nacimiento" valor={formatearFecha(perfil.fechaNacimiento)} alCambiar={() => {}}
                                deshabilitado ayuda="Para cambiarla, acude con el personal." />
                        </div>
                    </TarjetaPerfil>
                    <TarjetaPerfil color="rosa" icono={tarjetaUsuarios} titulo="Persona responsable">
                        <div className="perfil-fila perfil-fila--tres">
                            <Campo id="responsableNombre" etiqueta="Nombre del responsable" valor={responsable.nombre}
                                alCambiar={(v) => setResponsable((r) => ({ ...r, nombre: v }))} error={errores.responsableNombre}
                                marcador="Ejemplo: Ana López" maximo={200} />
                            <Campo id="responsableTelefono" etiqueta="Teléfono del responsable" valor={responsable.telefono}
                                alCambiar={(v) => setResponsable((r) => ({ ...r, telefono: v.replace(/\D/g, "") }))} error={errores.responsableTelefono}
                                marcador="10 dígitos" tipo="tel" maximo={10} modoTeclado="numeric" ayuda="Obligatorio para menores." />
                            <Campo id="responsableRelacion" etiqueta="Parentesco o relación" valor={responsable.relacion}
                                alCambiar={(v) => setResponsable((r) => ({ ...r, relacion: v }))} error={errores.responsableRelacion}
                                marcador="Madre, padre, tutor…" maximo={60} />
                        </div>
                    </TarjetaPerfil>
                    <NotaConsentimiento />
                </> : <>
                    <TarjetaPerfil color="verde" icono={tarjetaUsuario} titulo="Datos personales" texto="Mantén tu información actualizada.">
                        <div className="perfil-fila">
                            <Campo id="nombres" etiqueta="Nombre(s)" valor={nombres} alCambiar={setNombres} error={errores.nombres}
                                marcador="Ejemplo: Ana" maximo={150} autocompletar="given-name" />
                            <Campo id="telefono" etiqueta="Teléfono de contacto" valor={telefono} alCambiar={(v) => setTelefono(v.replace(/\D/g, ""))}
                                error={errores.telefono} marcador="10 dígitos" tipo="tel" maximo={10} autocompletar="tel-national" modoTeclado="numeric"
                                ayuda="Obligatorio. El personal lo usa para localizarte." />
                        </div>
                        <div className="perfil-fila">
                            <Campo id="fecha" etiqueta="Fecha de nacimiento" valor={formatearFecha(perfil.fechaNacimiento)} alCambiar={() => {}}
                                deshabilitado ayuda="Para cambiarla, acude con el personal." />
                        </div>
                    </TarjetaPerfil>
                    <TarjetaPerfil color="dorada" icono={tarjetaPin} titulo="Domicilio">
                        <div className="perfil-fila perfil-fila--tres">
                            <Campo id="calle" etiqueta="Calle" valor={domicilio.calle} alCambiar={cambiarDomicilio("calle")} error={errores.calle}
                                marcador="Nombre de la calle" maximo={150} autocompletar="address-line1" />
                            <Campo id="numeroExterior" etiqueta="Número exterior" valor={domicilio.numeroExterior} alCambiar={cambiarDomicilio("numeroExterior")}
                                error={errores.numeroExterior} marcador="Número o «sin número»" maximo={20} />
                            <Campo id="numeroInterior" etiqueta="Número interior" valor={domicilio.numeroInterior} alCambiar={cambiarDomicilio("numeroInterior")}
                                obligatorio={false} marcador="Si existe" maximo={20} />
                        </div>
                        <div className="perfil-fila">
                            <Campo id="colonia" etiqueta="Colonia o localidad" valor={domicilio.colonia} alCambiar={cambiarDomicilio("colonia")}
                                error={errores.colonia} marcador="Escribe la colonia o localidad" maximo={150} />
                            <Campo id="codigoPostal" etiqueta="Código postal" valor={domicilio.codigoPostal}
                                alCambiar={(v) => cambiarDomicilio("codigoPostal")(v.replace(/\D/g, ""))} error={errores.codigoPostal}
                                marcador="5 dígitos" maximo={5} autocompletar="postal-code" modoTeclado="numeric" />
                        </div>
                        <div className="perfil-fila">
                            <Campo id="municipio" etiqueta="Municipio" valor={domicilio.municipio} alCambiar={cambiarDomicilio("municipio")}
                                error={errores.municipio} marcador="Escribe el municipio" maximo={100} />
                            <Campo id="estado" etiqueta="Estado" valor={domicilio.estado} alCambiar={cambiarDomicilio("estado")}
                                error={errores.estado} marcador="Nayarit" maximo={100} />
                        </div>
                    </TarjetaPerfil>
                    <TarjetaPerfil color="blanca" icono={tarjetaCorreo} titulo="Correo de la cuenta"
                        texto="Si lo cambias, te enviaremos un enlace para verificar el nuevo correo.">
                        <div className="perfil-fila perfil-fila--boton">
                            <Campo id="correo" etiqueta="Correo electrónico" valor={correo} alCambiar={setCorreo} error={errores.correo}
                                tipo="email" marcador="nombre@ejemplo.mx" maximo={254} autocompletar="email" modoTeclado="email" />
                            <button type="button" className="perfil-boton perfil-boton--contorno" onClick={cambiarCorreo}>Cambiar correo</button>
                        </div>
                    </TarjetaPerfil>
                </>}
            </fieldset>
            {error && <p className="perfil-error" role="alert">{error}</p>}
            <div className="perfil-acciones">
                {conflicto
                    ? <button type="button" className="perfil-boton" onClick={alRecargar}>Volver a cargar mis datos</button>
                    : <button type="submit" className="perfil-boton" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>}
                <Link to="/mi-perfil/datos" className="perfil-boton perfil-boton--contorno">Cancelar</Link>
            </div>
        </form>
    );
}

// ---------- Cambio de correo pendiente ----------
export function CorreoPendiente() {
    const navegar = useNavigate();
    const pendiente = consultarCorreoPendiente();
    if (!pendiente) {
        return (
            <>
                <EncabezadoSeccion sobretitulo="MIS DATOS" titulo="Sin cambios de correo" texto="No tienes un cambio de correo pendiente." />
                <div className="perfil-acciones"><Link to="/mi-perfil/datos" className="perfil-boton">Volver a mis datos</Link></div>
            </>
        );
    }
    return (
        <>
            <EncabezadoSeccion sobretitulo="MIS DATOS" titulo="Verifica tu nuevo correo" texto="Tu correo actual sigue activo mientras no confirmes." />
            <TarjetaPerfil color="dorada" icono={tarjetaCorreo} titulo="Verifica tu nuevo correo" texto="Tu correo actual sigue activo mientras no confirmes.">
                <p className="perfil-chip-pendiente"><img src={puntoDorado} alt="" />Falta confirmar {pendiente}</p>
                <p className="perfil-tarjeta__texto">Abre el enlace que te enviamos. Hasta entonces seguirás entrando con tu correo actual.</p>
            </TarjetaPerfil>
            <div className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--contorno"
                    onClick={() => { cancelarCambioCorreo(); navegar("/mi-perfil/datos"); }}>Cancelar cambio</button>
                <Link to="/mi-perfil/datos" className="perfil-boton">Volver a mis datos</Link>
            </div>
        </>
    );
}

// ---------- Persona responsable (cuenta de persona menor de edad) ----------
function TarjetaResponsable({ compacta = false }: { compacta?: boolean }) {
    const r = consultarResponsable(); // TODO backend: ver datos.ts
    return (
        <TarjetaPerfil color="rosa" icono={tarjetaUsuarios} titulo="Persona responsable"
            texto={compacta ? "Algunos trámites los realiza ella o él." : "Se requiere para menores de edad."}>
            <dl className="perfil-datos">
                <Dato etiqueta={compacta ? "NOMBRE" : "NOMBRE DEL RESPONSABLE"} valor={r.nombre} />
                {compacta ? <>
                    <Dato etiqueta="PARENTESCO" valor={r.relacion} />
                    <Dato etiqueta="TELÉFONO" valor={r.telefono} />
                </> : <>
                    <Dato etiqueta="TELÉFONO DEL RESPONSABLE" valor={r.telefono} nota="Obligatorio para menores." />
                    <Dato etiqueta="PARENTESCO O RELACIÓN" valor={r.relacion} />
                </>}
            </dl>
        </TarjetaPerfil>
    );
}

function NotaConsentimiento() {
    return (
        <div className="perfil-nota perfil-nota--dorada">
            <img src={notaInfoDorada} alt="" />
            <p><strong>¿Por qué se pide?</strong>Las actividades y la credencial de menores requieren el consentimiento de una persona responsable.</p>
        </div>
    );
}
