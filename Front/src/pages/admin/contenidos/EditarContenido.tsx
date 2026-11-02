import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Chip, EncabezadoPagina, EstadoVacio } from "../componentes";
import { Ventana } from "../Ventana";
import "./Contenidos.css";
import {
    NOMBRE_ESTADO,
    actualizarContenido,
    cuandoSeActualizo,
    enviarAAutorizacion,
    esEditable,
    fechaLarga,
    guardarBorrador,
    obtenerContenido,
    useContenidos,
    type Contenido,
} from "./datos";
import { ESQUEMAS, revisarImagen, tituloDe, todosLosCampos, validar, type Campo, type Grupo, type Valores } from "./esquemas";
import { TONO_ESTADO } from "./tonos";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoArchivo from "../../../assets/admin/contenidos/tarjeta-archivo.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoBandera from "../../../assets/admin/contenidos/tarjeta-bandera.svg";
import iconoAlerta from "../../../assets/admin/contenidos/tarjeta-alerta.svg";
import iconoReloj from "../../../assets/admin/tarjeta-clock.svg";
import iconoModal from "../../../assets/admin/modal-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";

const ICONOS_GRUPO: Record<Grupo["icono"], string> = { lapiz: iconoLapiz, archivo: iconoArchivo, lista: iconoLista };

type Aviso = null | "faltan" | "error";

// HU-12 · Editor: redactar o corregir un contenido (borrador o con observaciones)
function EditarContenido() {
    const { folio } = useParams();
    useContenidos(); // se vuelve a pintar si el almacén cambia
    const contenido = obtenerContenido(folio);

    if (!contenido) {
        return (
            <PanelLayout titulo="Contenidos">
                <EstadoVacio
                    icono={vacioBuscar}
                    titulo="No encontramos ese contenido"
                    texto="Puede que el folio no exista. Vuelve a Mis contenidos para elegir otro."
                />
                <Link to="/admin/contenidos/editor" className="boton-panel boton-panel--verde boton-panel--mediano">Volver a Mis contenidos</Link>
            </PanelLayout>
        );
    }
    // Lo que ya se envió o publicó solo se consulta
    if (!esEditable(contenido.estado)) return <Navigate to={`/admin/contenidos/editor/${contenido.folio}/vista-previa`} replace />;

    // key: si cambia el folio, el formulario empieza de cero
    return <Formulario key={contenido.folio} contenido={contenido} />;
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

    const nombresFaltantes = todosLosCampos(esquema)
        .filter((c) => faltantes.includes(c.nombre))
        .map((c) => c.etiqueta.toLowerCase());

    return (
        <PanelLayout titulo="Contenidos">
            <nav className="migas-panel" aria-label="Ruta">
                <span>Contenidos</span> › <span>Editor de contenidos</span> ›{" "}
                <strong>{conObservaciones ? "Con observaciones" : aviso === "faltan" ? "Faltan campos obligatorios" : "Borrador"}</strong>
            </nav>

            <div className="encabezado-tarjeta">
                <EncabezadoPagina
                    volver={{ texto: "Volver a Mis contenidos", ruta: "/admin/contenidos/editor" }}
                    etiqueta={`CONTENIDOS · EDITOR · ${esquema.etiqueta} ${contenido.folio}`}
                    titulo={conObservaciones ? esquema.tituloNuevo.replace(/^(Redactar|Editar)/, "Corregir") : esquema.tituloNuevo}
                    texto={conObservaciones ? "El Administrador dejó observaciones. Corrige y vuelve a enviar." : esquema.descripcion}
                />
            </div>

            {conObservaciones && contenido.observaciones && (
                <section className="aviso-contenido aviso-contenido--observaciones" aria-labelledby="titulo-observaciones">
                    <div className="aviso-contenido__cabecera">
                        <span className="icono-tarjeta icono-tarjeta--verde"><img src={iconoAlerta} alt="" /></span>
                        <div>
                            <h2 id="titulo-observaciones">Observaciones del Administrador</h2>
                            <p>Dejadas el {fechaLarga(contenido.observaciones.fecha)} (ejemplo).</p>
                        </div>
                    </div>
                    <ol className="observaciones-lista">
                        {contenido.observaciones.puntos.map((p) => <li key={p}>{p}</li>)}
                    </ol>
                </section>
            )}

            {aviso === "faltan" && (
                <div className="aviso-contenido aviso-contenido--error" role="alert">
                    <span className="aviso-contenido__signo" aria-hidden="true">!</span>
                    <div>
                        <strong>{faltantes.length === 1 ? "Falta 1 campo" : `Faltan ${faltantes.length} campos`} por completar</strong>
                        <p>Revisa {nombresFaltantes.join(", ")} para poder enviar a autorización.</p>
                    </div>
                </div>
            )}

            {aviso === "error" && (
                <div className="aviso-contenido aviso-contenido--error" role="alert">
                    <span className="aviso-contenido__signo" aria-hidden="true">!</span>
                    <div>
                        <strong>No se pudo guardar el borrador</strong>
                        <p>Hubo un problema de conexión. Tu texto sigue en pantalla; no cierres esta página y vuelve a intentarlo.</p>
                    </div>
                    <button type="button" className="boton-panel boton-panel--contorno-guinda boton-panel--mediano" onClick={guardar} disabled={ocupado}>
                        Reintentar
                    </button>
                </div>
            )}

            <div className="columnas">
                <div className="columna-principal">
                    {esquema.grupos.map((grupo) => (
                        <section key={grupo.titulo} className="tarjeta-panel tarjeta-panel--blanca">
                            <div className="tarjeta-panel__cabecera">
                                <span className="icono-tarjeta icono-tarjeta--verde"><img src={ICONOS_GRUPO[grupo.icono]} alt="" /></span>
                                <div className="tarjeta-panel__textos">
                                    <h2>{grupo.titulo === "Texto de la sección" ? String(valores.seccion || grupo.titulo) : grupo.titulo}</h2>
                                    {grupo.subtitulo && <p>{grupo.subtitulo}</p>}
                                </div>
                            </div>
                            <CamposEnFilas campos={grupo.campos} valores={valores} errores={errores} alCambiar={cambiar} />
                        </section>
                    ))}
                </div>

                <div className="columna-lateral">
                    <section className="tarjeta-panel tarjeta-panel--blanca">
                        <div className="tarjeta-panel__cabecera">
                            <span className="icono-tarjeta icono-tarjeta--verde"><img src={iconoBandera} alt="" /></span>
                            <div className="tarjeta-panel__textos"><h2>{esquema.publicacion.titulo}</h2></div>
                        </div>
                        <CamposEnFilas campos={esquema.publicacion.campos} valores={valores} errores={errores} alCambiar={cambiar} />
                    </section>

                    <section className={`tarjeta-estado ${conObservaciones ? "tarjeta-estado--guinda" : ""}`}>
                        <div className="tarjeta-panel__cabecera">
                            <span className="icono-tarjeta icono-tarjeta--verde"><img src={iconoReloj} alt="" /></span>
                            <div className="tarjeta-panel__textos"><h2>Estado</h2></div>
                        </div>
                        <p className="tarjeta-estado__linea" role="status">
                            <Chip tono={TONO_ESTADO[contenido.estado]}>{NOMBRE_ESTADO[contenido.estado]}</Chip>
                            <span>
                                {ocupado ? "Guardando…" : sinGuardar ? "Cambios sin guardar" : `Guardado: ${cuandoSeActualizo(contenido.actualizado).toLowerCase()} (ejemplo)`}
                            </span>
                        </p>
                        <button type="button" className="boton-panel boton-panel--verde boton-panel--ancho" onClick={intentarEnviar} disabled={ocupado}>
                            {conObservaciones ? "Enviar de nuevo a autorización" : "Enviar a autorización"}
                        </button>
                        <button type="button" className="boton-panel boton-panel--suave boton-panel--ancho" onClick={verVistaPrevia} disabled={ocupado}>
                            Vista previa
                        </button>
                        <button type="button" className="boton-panel boton-panel--contorno-verde boton-panel--ancho" onClick={guardar} disabled={ocupado}>
                            Guardar borrador
                        </button>
                        <p className="tarjeta-estado__nota">Solo el Administrador autoriza y publica. Tu contenido no se verá en el portal hasta entonces.</p>
                    </section>
                </div>
            </div>

            {confirmar && (
                <Ventana
                    tono="verde"
                    icono={iconoModal}
                    titulo="¿Enviar a autorización?"
                    texto={`El Administrador revisará ${esquema.enFrase} y podrá publicarl${esquema.genero}, pedirte cambios o rechazarl${esquema.genero}. Mientras tanto no podrás editarl${esquema.genero}.`}
                    textoConfirmar={ocupado ? "Enviando…" : "Enviar a autorización"}
                    alConfirmar={() => { if (!ocupado) void enviar(); }}
                    alCerrar={() => setConfirmar(false)}
                >
                    <dl className="resumen-envio">
                        <div><dt>Folio</dt><dd>{contenido.folio}</dd></div>
                        <div><dt>Tipo</dt><dd>{esquema.nombre}</dd></div>
                        <div><dt>Título</dt><dd>{tituloDe(contenido.tipo, valores)}</dd></div>
                    </dl>
                    <div className="campo-panel">
                        <label htmlFor="nota-envio" className="campo-panel__etiqueta">Nota para el Administrador <span>(opcional)</span></label>
                        <textarea
                            id="nota-envio"
                            className="entrada-panel entrada-panel--area"
                            placeholder="Ej.: confirmar fecha con Servicios al Público."
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                        />
                    </div>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Junta los campos "mitad" de dos en dos y los "tercio" de tres en tres
function CamposEnFilas({
    campos,
    valores,
    errores,
    alCambiar,
}: {
    campos: Campo[];
    valores: Valores;
    errores: Record<string, string>;
    alCambiar: (nombre: string, valor: string | boolean) => void;
}) {
    const filas: Campo[][] = [];
    for (const campo of campos) {
        const ultima = filas[filas.length - 1];
        const cabe = campo.ancho === "mitad" ? 2 : campo.ancho === "tercio" ? 3 : 1;
        if (cabe > 1 && ultima && ultima[0].ancho === campo.ancho && ultima.length < cabe) ultima.push(campo);
        else filas.push([campo]);
    }
    return (
        <div className="campos-contenido">
            {filas.map((fila) => (
                <div key={fila[0].nombre} className="campos-contenido__fila">
                    {fila.map((campo) => (
                        <CampoContenido
                            key={campo.nombre}
                            campo={campo}
                            valor={valores[campo.nombre]}
                            error={errores[campo.nombre]}
                            alCambiar={(v) => alCambiar(campo.nombre, v)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

function CampoContenido({
    campo,
    valor,
    error,
    alCambiar,
}: {
    campo: Campo;
    valor: string | boolean | undefined;
    error?: string;
    alCambiar: (valor: string | boolean) => void;
}) {
    const id = `campo-${campo.nombre}`;
    const texto = typeof valor === "string" ? valor : "";
    const clase = `entrada-panel ${error ? "entrada-panel--error" : ""}`;
    const descripcion = error ? `${id}-error` : campo.ayuda ? `${id}-ayuda` : undefined;
    const [errorArchivo, setErrorArchivo] = useState("");

    if (campo.tipo === "interruptor") {
        return (
            <div className="interruptor-campo">
                <button
                    type="button"
                    role="switch"
                    id={id}
                    aria-checked={valor === true}
                    className={`interruptor ${valor === true ? "interruptor--activo" : ""}`}
                    onClick={() => alCambiar(valor !== true)}
                >
                    <span className="interruptor__bolita" />
                </button>
                <label htmlFor={id}>
                    <strong>{campo.etiqueta}</strong>
                    {campo.descripcion && <small>{campo.descripcion}</small>}
                    {error && <small className="campo-panel__error">{error}</small>}
                </label>
            </div>
        );
    }

    const etiqueta = (
        <label htmlFor={id} className="campo-panel__etiqueta">
            {campo.etiqueta}
            {campo.obligatorio && <span aria-label="obligatorio">*</span>}
        </label>
    );

    let control;
    if (campo.tipo === "fijo") {
        control = <p id={id} className="entrada-panel entrada-fija">{texto || "Por confirmar"}</p>;
    } else if (campo.tipo === "chips") {
        control = (
            <div className="filtros" role="radiogroup" aria-labelledby={`${id}-grupo`}>
                {campo.opciones?.map((opcion) => (
                    <button
                        key={opcion}
                        type="button"
                        role="radio"
                        aria-checked={texto === opcion}
                        className={`filtro ${texto === opcion ? "filtro--activo" : ""}`}
                        onClick={() => alCambiar(opcion)}
                    >
                        {opcion}
                    </button>
                ))}
            </div>
        );
    } else if (campo.tipo === "select") {
        control = (
            <select id={id} className={`${clase} ${texto ? "" : "entrada-panel--vacia"}`} value={texto} onChange={(e) => alCambiar(e.target.value)} aria-describedby={descripcion} aria-invalid={!!error}>
                <option value="">Elige una opción</option>
                {campo.opciones?.map((o) => <option key={o}>{o}</option>)}
            </select>
        );
    } else if (campo.tipo === "archivo") {
        control = texto ? (
            <div className="archivo-elegido">
                <span>{texto}</span>
                <button type="button" className="boton-panel boton-panel--contorno boton-panel--chico" onClick={() => alCambiar("")}>Quitar</button>
            </div>
        ) : (
            <label className={`zona-archivo ${errorArchivo ? "zona-archivo--error" : ""}`}>
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
                className={`${clase} entrada-panel--area ${campo.tipo === "area-grande" ? "entrada-panel--grande" : ""}`}
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
        <div className="campo-panel">
            {campo.tipo === "chips" ? <p id={`${id}-grupo`} className="campo-panel__etiqueta">{campo.etiqueta}</p> : etiqueta}
            {control}
            {error && <p id={`${id}-error`} className="campo-panel__error">{error}</p>}
            {errorArchivo && <p className="campo-panel__error" role="alert">{errorArchivo}</p>}
            {!error && campo.ayuda && campo.tipo !== "archivo" && (
                <p id={`${id}-ayuda`} className="campo-panel__ayuda">
                    {campo.ayuda}
                    {campo.max && texto ? ` (${texto.length}/${campo.max})` : ""}
                </p>
            )}
        </div>
    );
}

export default EditarContenido;
