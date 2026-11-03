import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import {
    actualizarContenido, cuandoSeActualizo, enviarAAutorizacion, esEditable, fechaLarga, guardarBorrador, obtenerContenido, useContenidos, type Contenido,
} from "./datos";
import { ESQUEMAS, revisarImagen, tituloDe, todosLosCampos, validar, type Campo, type Grupo, type Valores } from "./esquemas";
import { ChipEstado, Columnas, Datos, EncabezadoTarjeta, EstadoVacio, Migas, Pagina, PieDatos, Tarjeta, Ventana } from "./piezas";
import { clasesBoton } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoArchivo from "../../../assets/admin/contenidos/tarjeta-archivo.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoBandera from "../../../assets/admin/contenidos/tarjeta-bandera.svg";
import iconoAlerta from "../../../assets/admin/contenidos/tarjeta-alerta.svg";
import iconoReloj from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const ICONOS_GRUPO: Record<Grupo["icono"], string> = { lapiz: iconoLapiz, archivo: iconoArchivo, lista: iconoLista };

type Aviso = null | "faltan" | "error";

// HU-12 · Editor: redactar o corregir un contenido (Figma 558:16627, 558:17112, 558:17619, 601:48088;
// observaciones 559:17575, faltan campos 559:18139, error al guardar 559:18360, confirmar 559:17005)
function EditarContenido() {
    const { folio } = useParams();
    useContenidos(); // se vuelve a pintar si el almacén cambia
    const contenido = obtenerContenido(folio);

    if (!contenido) return <NoEncontrado />;
    // Lo que ya se envió o publicó solo se consulta
    if (!esEditable(contenido.estado)) return <Navigate to={`/admin/contenidos/editor/${contenido.folio}/vista-previa`} replace />;

    // key: si cambia el folio, el formulario empieza de cero
    return <Formulario key={contenido.folio} contenido={contenido} />;
}

export function NoEncontrado({ ruta = "/admin/contenidos/editor", texto = "Volver a Mis contenidos" }: { ruta?: string; texto?: string }) {
    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <EstadoVacio icono={vacioBuscar} titulo="No encontramos ese contenido" texto="Puede que el folio no exista. Vuelve a la bandeja para elegir otro." />
                <div className="cn-acciones"><Link to={ruta} className={clasesBoton("verde")}>{texto}</Link></div>
            </Pagina>
        </PanelLayout>
    );
}

function Formulario({ contenido }: { contenido: Contenido }) {
    const navigate = useNavigate();
    const esquema = ESQUEMAS[contenido.tipo];
    const [valores, setValores] = useState<Valores>(contenido.valores);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [aviso, setAviso] = useState<Aviso>(null);
    const [ocupado, setOcupado] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const [nota, setNota] = useState("");

    const conObservaciones = contenido.estado === "observaciones";
    const sinGuardar = JSON.stringify(valores) !== JSON.stringify(contenido.valores);
    const faltantes = Object.keys(errores).filter((n) => errores[n]);

    function cambiar(nombre: string, valor: string | boolean) {
        setValores((v) => ({ ...v, [nombre]: valor }));
        if (errores[nombre]) setErrores((e) => ({ ...e, [nombre]: "" }));
        if (aviso === "faltan") setAviso(null);
    }

    async function guardar() {
        setOcupado(true);
        try {
            await guardarBorrador(contenido.folio, valores);
            setAviso(null);
        } catch {
            setAviso("error");
        } finally {
            setOcupado(false);
        }
    }

    function intentarEnviar() {
        const nuevos = validar(contenido.tipo, valores);
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) {
            setAviso("faltan");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setAviso(null);
        setConfirmar(true);
    }

    async function enviar() {
        setOcupado(true);
        try {
            await enviarAAutorizacion(contenido.folio, valores, nota);
            navigate(`/admin/contenidos/editor/${contenido.folio}/enviado`);
        } catch {
            setConfirmar(false);
            setAviso("error");
        } finally {
            setOcupado(false);
        }
    }

    function verVistaPrevia() {
        // La vista previa muestra lo que hay en pantalla, aunque no se haya guardado
        actualizarContenido(contenido.folio, { valores });
        navigate(`/admin/contenidos/editor/${contenido.folio}/vista-previa`);
    }

    const nombresFaltantes = todosLosCampos(esquema).filter((c) => faltantes.includes(c.nombre)).map((c) => c.etiqueta.toLowerCase());
    const miga = conObservaciones ? "Con observaciones" : aviso === "faltan" ? "Faltan campos obligatorios" : aviso === "error" ? "Error al guardar" : "Borrador";

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Editor de contenidos", "/admin/contenidos/editor"], [miga]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Mis contenidos", ruta: "/admin/contenidos/editor" }}
                    etiqueta={`Contenidos · Editor · ${esquema.etiqueta} ${contenido.folio}`}
                    titulo={conObservaciones ? esquema.tituloNuevo.replace(/^(Redactar|Editar)/, "Corregir") : esquema.tituloNuevo}
                    texto={conObservaciones ? "El Administrador dejó observaciones. Corrige y vuelve a enviar." : esquema.descripcion}
                />

                {conObservaciones && contenido.observaciones && (
                    <Tarjeta icono={iconoAlerta} titulo="Observaciones del Administrador" subtitulo={`Dejadas el ${fechaLarga(contenido.observaciones.fecha)} (ejemplo).`} tono="alerta">
                        <ol className="cn-observaciones">
                            {contenido.observaciones.puntos.map((p) => <li key={p}>{p}</li>)}
                        </ol>
                    </Tarjeta>
                )}

                {aviso === "faltan" && (
                    <div className="cn-aviso" role="alert">
                        <span className="cn-aviso__signo" aria-hidden="true">!</span>
                        <div className="cn-aviso__textos">
                            <strong>{faltantes.length === 1 ? "Falta 1 campo obligatorio" : `Faltan ${faltantes.length} campos obligatorios`}</strong>
                            <p>Completa {nombresFaltantes.join(", ")} para poder enviar a autorización.</p>
                        </div>
                    </div>
                )}

                {aviso === "error" && (
                    <div className="cn-aviso" role="alert">
                        <span className="cn-aviso__signo" aria-hidden="true">!</span>
                        <div className="cn-aviso__textos">
                            <strong>No se pudo guardar el borrador</strong>
                            <p>Hubo un problema de conexión. Tu texto sigue en pantalla; no cierres esta página y vuelve a intentarlo.</p>
                        </div>
                        <button type="button" className={clasesBoton("contorno-guinda", "cn-boton--chico")} onClick={guardar} disabled={ocupado}>Reintentar</button>
                    </div>
                )}

                <Columnas
                    principal={esquema.grupos.map((grupo) => (
                        <Tarjeta
                            key={grupo.titulo}
                            icono={ICONOS_GRUPO[grupo.icono]}
                            titulo={grupo.titulo === "Texto de la sección" ? String(valores.seccion || grupo.titulo) : grupo.titulo}
                            subtitulo={grupo.subtitulo}
                            id={`cn-grupo-${grupo.icono}-${grupo.campos[0].nombre}`}
                        >
                            <CamposEnFilas campos={grupo.campos} valores={valores} errores={errores} alCambiar={cambiar} />
                        </Tarjeta>
                    ))}
                    lateral={
                        <>
                            <Tarjeta icono={iconoBandera} titulo={esquema.publicacion.titulo} lateral>
                                <CamposEnFilas campos={esquema.publicacion.campos} valores={valores} errores={errores} alCambiar={cambiar} />
                            </Tarjeta>

                            <Tarjeta icono={iconoReloj} titulo="Estado" tono="crema" lateral>
                                <p className="cn-estado-linea" role="status">
                                    <ChipEstado estado={contenido.estado} />
                                    <span>{ocupado ? "Guardando…" : sinGuardar ? "Cambios sin guardar" : `Guardado ${cuandoSeActualizo(contenido.actualizado).toLowerCase()} (ejemplo)`}</span>
                                </p>
                                <div className="cn-botones-columna">
                                    <button type="button" className={clasesBoton("verde", "cn-boton--ancho")} onClick={intentarEnviar} disabled={ocupado || faltantes.length > 0}>
                                        {conObservaciones ? "Enviar de nuevo a autorización" : "Enviar a autorización"}
                                    </button>
                                    <button type="button" className={clasesBoton("suave", "cn-boton--ancho")} onClick={verVistaPrevia} disabled={ocupado}>Vista previa</button>
                                    <button type="button" className={clasesBoton("contorno", "cn-boton--ancho")} onClick={guardar} disabled={ocupado}>Guardar borrador</button>
                                </div>
                                <p className="cn-nota">Solo el Administrador autoriza y publica. Tu contenido no se verá en el portal hasta entonces.</p>
                            </Tarjeta>
                        </>
                    }
                />

                <PieDatos />
            </Pagina>

            {confirmar && (
                <Ventana
                    titulo="¿Enviar a autorización?"
                    texto={`El Administrador revisará ${esquema.enFrase} y podrá publicarl${esquema.genero}, pedirte cambios o rechazarl${esquema.genero}. Mientras tanto no podrás editarl${esquema.genero}.`}
                    alCerrar={() => setConfirmar(false)}
                    pie={
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => setConfirmar(false)}>Cancelar</button>
                            <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => void enviar()}>
                                {ocupado ? "Enviando…" : "Enviar a autorización"}
                            </button>
                        </>
                    }
                >
                    <Datos variante="caja" filas={[["Folio", contenido.folio], ["Tipo", esquema.nombre], ["Título", tituloDe(contenido.tipo, valores)]]} />
                    <div className="cn-campo">
                        <label htmlFor="cn-nota-envio" className="cn-campo__etiqueta">Nota para el Administrador <span className="cn-campo__opcional">(opcional)</span></label>
                        <textarea id="cn-nota-envio" className="cn-control cn-control--area" placeholder="Ej.: confirmar fecha con Servicios al Público." value={nota} onChange={(e) => setNota(e.target.value)} />
                    </div>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Junta los campos "mitad" de dos en dos y los "tercio" de tres en tres
function CamposEnFilas({ campos, valores, errores, alCambiar }: { campos: Campo[]; valores: Valores; errores: Record<string, string>; alCambiar: (nombre: string, valor: string | boolean) => void }) {
    const filas: Campo[][] = [];
    for (const campo of campos) {
        const ultima = filas[filas.length - 1];
        const cabe = campo.ancho === "mitad" ? 2 : campo.ancho === "tercio" ? 3 : 1;
        if (cabe > 1 && ultima && ultima[0].ancho === campo.ancho && ultima.length < cabe) ultima.push(campo);
        else filas.push([campo]);
    }
    return (
        <div className="cn-campos">
            {filas.map((fila) => (
                <div key={fila[0].nombre} className="cn-campos__fila">
                    {fila.map((campo) => (
                        <CampoContenido key={campo.nombre} campo={campo} valor={valores[campo.nombre]} error={errores[campo.nombre]} alCambiar={(v) => alCambiar(campo.nombre, v)} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function CampoContenido({ campo, valor, error, alCambiar }: { campo: Campo; valor: string | boolean | undefined; error?: string; alCambiar: (valor: string | boolean) => void }) {
    const id = `campo-${campo.nombre}`;
    const texto = typeof valor === "string" ? valor : "";
    const clase = `cn-control ${error ? "cn-control--error" : ""}`;
    const descripcion = error ? `${id}-error` : campo.ayuda ? `${id}-ayuda` : undefined;
    const [errorArchivo, setErrorArchivo] = useState("");

    if (campo.tipo === "interruptor") {
        return (
            <div className="cn-interruptor-campo">
                <button type="button" role="switch" id={id} aria-checked={valor === true} className="cn-interruptor" onClick={() => alCambiar(valor !== true)} aria-describedby={error ? `${id}-error` : undefined}>
                    <span className="cn-solo-lectores">{campo.etiqueta}</span>
                </button>
                <label htmlFor={id}>
                    <strong>{campo.etiqueta}</strong>
                    {campo.descripcion && <small>{campo.descripcion}</small>}
                    {error && <small id={`${id}-error`} className="cn-campo__error">{error}</small>}
                </label>
            </div>
        );
    }

    let control;
    if (campo.tipo === "fijo") {
        control = <p id={id} className="cn-control cn-control--fijo">{texto || "Por confirmar"}</p>;
    } else if (campo.tipo === "chips") {
        control = (
            <div className="cn-pastillas" role="radiogroup" aria-labelledby={`${id}-grupo`}>
                {campo.opciones?.map((opcion) => (
                    <button key={opcion} type="button" role="radio" aria-checked={texto === opcion} className="cn-pastilla" onClick={() => alCambiar(opcion)}>
                        {opcion}
                    </button>
                ))}
            </div>
        );
    } else if (campo.tipo === "select") {
        control = (
            <select id={id} className={clase} value={texto} onChange={(e) => alCambiar(e.target.value)} aria-describedby={descripcion} aria-invalid={!!error}>
                <option value="">Elige una opción</option>
                {campo.opciones?.map((o) => <option key={o}>{o}</option>)}
            </select>
        );
    } else if (campo.tipo === "archivo") {
        control = texto ? (
            <div className="cn-archivo-elegido">
                <span>{texto}</span>
                <button type="button" className={clasesBoton("contorno", "cn-boton--chico")} onClick={() => alCambiar("")}>Quitar</button>
            </div>
        ) : (
            <label className={`cn-archivo ${errorArchivo ? "cn-archivo--error" : ""}`}>
                <input
                    id={id}
                    type="file"
                    accept="image/jpeg,image/png"
                    aria-describedby={descripcion}
                    onChange={(e) => {
                        const archivo = e.target.files?.[0];
                        if (!archivo) return;
                        const problema = revisarImagen(archivo);
                        setErrorArchivo(problema ?? "");
                        // TODO backend: subir la imagen; por ahora solo se guarda su nombre
                        if (!problema) alCambiar(archivo.name);
                        e.target.value = "";
                    }}
                />
                <strong>{campo.placeholder}</strong>
                <small>{campo.ayuda}</small>
            </label>
        );
    } else if (campo.tipo === "area" || campo.tipo === "area-grande") {
        control = (
            <textarea
                id={id}
                className={`${clase} cn-control--area ${campo.tipo === "area-grande" ? "cn-control--grande" : ""}`}
                value={texto}
                placeholder={campo.placeholder}
                onChange={(e) => alCambiar(e.target.value)}
                aria-describedby={descripcion}
                aria-invalid={!!error}
            />
        );
    } else {
        control = (
            <input
                id={id}
                type={campo.tipo === "fecha" ? "date" : "text"}
                className={clase}
                value={texto}
                placeholder={campo.placeholder}
                onChange={(e) => alCambiar(e.target.value)}
                aria-describedby={descripcion}
                aria-invalid={!!error}
            />
        );
    }

    return (
        <div className="cn-campo">
            {campo.tipo === "chips" ? (
                <p id={`${id}-grupo`} className="cn-campo__etiqueta">{campo.etiqueta}{campo.obligatorio && <span className="cn-campo__obligatorio" aria-hidden="true">*</span>}</p>
            ) : (
                <label htmlFor={id} className="cn-campo__etiqueta">
                    {campo.etiqueta}
                    {campo.obligatorio && <span className="cn-campo__obligatorio" aria-label="obligatorio">*</span>}
                </label>
            )}
            {control}
            {error && <p id={`${id}-error`} className="cn-campo__error">{error}</p>}
            {errorArchivo && <p className="cn-campo__error" role="alert">{errorArchivo}</p>}
            {!error && campo.ayuda && campo.tipo !== "archivo" && (
                <p id={`${id}-ayuda`} className="cn-campo__ayuda">
                    {campo.ayuda}
                    {campo.max && texto ? ` (${texto.length}/${campo.max})` : ""}
                </p>
            )}
        </div>
    );
}

export default EditarContenido;
