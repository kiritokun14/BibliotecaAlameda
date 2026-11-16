import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { Campo, IconoBandera, IconoDocumento, IconoFlechaIzq, IconoLapiz, Interruptor, Migas, PanelEstado, SubirImagen } from "./piezas";
import ConfirmarEnvio from "./ConfirmarEnvio";
import { datoSiNo, datoTexto, useBorrador } from "./usarBorrador";
import type { Contenido } from "../../../servicios/contenidos";
import "./Contenidos.css";

// Formulario para una pieza de Memoria pública (fotografía, documento u objeto del archivo).
// Sirve para una pieza nueva o para seguir un borrador (inicial).
// La imagen se guarda de forma privada junto al borrador.

const MAX_RESUMEN = 160;
// TODO: confirmar con la biblioteca los tipos de pieza, dónde se publica y los periodos o temas
const TIPOS_PIEZA = ["Fotografía", "Documento", "Objeto", "Otro"];
const PUBLICACIONES = ["Memoria pública"];
const TEMAS: string[] = [];
// TODO: el área que registra la pieza la confirma la biblioteca
const REGISTRA = "Equipo de la biblioteca · Área por confirmar";

function RedactarMemoria({ inicial }: { inicial?: Contenido }) {
    const [confirmando, setConfirmando] = useState(false);
    const borrador = useBorrador("memoria", inicial);
    const dato = (clave: string) => datoTexto(inicial?.datos, clave);
    const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
    const [autoria, setAutoria] = useState(dato("autoria"));
    const [tipoPieza, setTipoPieza] = useState(dato("tipoPieza"));
    const [periodo, setPeriodo] = useState(dato("periodo"));
    const [registroArchivo, setRegistroArchivo] = useState(dato("registroArchivo"));
    const [resumen, setResumen] = useState(inicial?.resumen ?? "");
    const [contexto, setContexto] = useState(inicial?.cuerpo ?? "");
    const [imagen, setImagen] = useState<File | null | undefined>(undefined);
    const [publicacion, setPublicacion] = useState(dato("publicacion") || PUBLICACIONES[0]);
    const [tema, setTema] = useState(dato("tema"));
    const [permisoImagen, setPermisoImagen] = useState(datoSiNo(inicial?.datos, "permisoImagen", false));

    const cambios = () => ({
        titulo,
        resumen,
        cuerpo: contexto,
        datos: { autoria, tipoPieza, periodo, registroArchivo, publicacion, tema, permisoImagen },
    });
    const enviar = (nota: string) => {
        setConfirmando(false);
        borrador.enviar(cambios(), nota, { tipo: "Memoria pública", queSeEnvia: "la pieza", titulo }, imagen);
    };

    return (
        <PanelLayout titulo="Contenidos" tema="contenidos">
            <Migas actual="Memoria pública" />

            <div className="contenidos-encabezado contenidos-encabezado--tarjeta">
                <div>
                    <Link to="/admin/contenidos/editor" className="contenidos-volver">
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        Volver a Mis contenidos
                    </Link>
                    <p className="contenidos-etiqueta">Contenidos · Editor · Memoria pública{borrador.folio ? ` ${borrador.folio}` : " · pieza nueva"}</p>
                    <h1>Redactar pieza de Memoria pública</h1>
                    <p className="contenidos-encabezado__texto">Fotografías y piezas del archivo de memoria de la biblioteca. Los campos con * son obligatorios.</p>
                </div>
            </div>

            <form
                className="contenidos-formulario"
                onSubmit={(e) => {
                    // El navegador revisa primero los campos obligatorios
                    e.preventDefault();
                    setConfirmando(true);
                }}
            >
                <div className="contenidos-formulario__lateral">
                    <section className="contenidos-panel" aria-labelledby="memoria-pieza">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoDocumento /></span>
                            <h2 id="memoria-pieza">Datos de la pieza</h2>
                        </div>

                        <div className="contenidos-rejilla contenidos-rejilla--2">
                            <Campo id="memoria-titulo" etiqueta="Título de la pieza" obligatorio>
                                <input id="memoria-titulo" type="text" required maxLength={150} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                            </Campo>
                            <Campo id="memoria-autoria" etiqueta="Autoría o fuente" obligatorio>
                                <input id="memoria-autoria" type="text" required value={autoria} onChange={(e) => setAutoria(e.target.value)} />
                            </Campo>
                        </div>

                        <div className="contenidos-rejilla contenidos-rejilla--3">
                            <Campo id="memoria-tipo" etiqueta="Tipo de pieza">
                                <select id="memoria-tipo" value={tipoPieza} onChange={(e) => setTipoPieza(e.target.value)}>
                                    <option value="">Elige un tipo</option>
                                    {TIPOS_PIEZA.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Campo>
                            <Campo id="memoria-periodo" etiqueta="Año o periodo">
                                <input id="memoria-periodo" type="text" placeholder="Año o década" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                            </Campo>
                            <Campo id="memoria-registro" etiqueta="Registro en archivo">
                                <input id="memoria-registro" type="text" placeholder="Por confirmar" value={registroArchivo} onChange={(e) => setRegistroArchivo(e.target.value)} />
                            </Campo>
                        </div>
                    </section>

                    <section className="contenidos-panel" aria-labelledby="memoria-descripcion">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLapiz /></span>
                            <div>
                                <h2 id="memoria-descripcion">Descripción de la pieza</h2>
                                <p>La escribe el equipo. Indica qué se ve, dónde y cuándo.</p>
                            </div>
                        </div>

                        <Campo id="memoria-resumen" etiqueta="Resumen para el listado" obligatorio ayuda={`Máximo ${MAX_RESUMEN} caracteres · ${resumen.length}/${MAX_RESUMEN}`}>
                            <textarea id="memoria-resumen" rows={2} required maxLength={MAX_RESUMEN} value={resumen} onChange={(e) => setResumen(e.target.value)} aria-describedby="memoria-resumen-ayuda" />
                        </Campo>

                        <Campo id="memoria-contexto" etiqueta="Texto de contexto" obligatorio>
                            <textarea id="memoria-contexto" rows={8} required placeholder="Escribe aquí el contexto histórico…" value={contexto} onChange={(e) => setContexto(e.target.value)} />
                        </Campo>

                        <Campo id="memoria-imagen" etiqueta="Fotografía o imagen">
                            <SubirImagen id="memoria-imagen" archivo={imagen} folio={borrador.folio} tieneImagen={borrador.tieneImagen} version={borrador.guardadoEn} detalle="JPG o PNG · máximo 5 MB" alCambiar={setImagen} />
                        </Campo>
                    </section>
                </div>

                <aside className="contenidos-formulario__lateral">
                    <section className="contenidos-panel" aria-labelledby="memoria-publicacion">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoBandera /></span>
                            <h2 id="memoria-publicacion">Datos de publicación</h2>
                        </div>

                        <Campo id="memoria-donde" etiqueta="Se publica en" obligatorio>
                            <select id="memoria-donde" required value={publicacion} onChange={(e) => setPublicacion(e.target.value)}>
                                {PUBLICACIONES.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </Campo>

                        <Campo id="memoria-tema" etiqueta="Periodo o tema">
                            <select id="memoria-tema" value={tema} onChange={(e) => setTema(e.target.value)}>
                                <option value="">{TEMAS.length ? "Elige un periodo o tema" : "Temas por confirmar"}</option>
                                {TEMAS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Campo>

                        <Interruptor
                            id="memoria-permiso"
                            titulo="Permiso de uso de la imagen"
                            texto="Confirma que la biblioteca puede publicarla."
                            activo={permisoImagen}
                            alCambiar={setPermisoImagen}
                        />

                        <div className="contenidos-campo">
                            <p className="contenidos-campo__etiqueta">Pieza registrada por</p>
                            <p className="contenidos-campo__fijo">{REGISTRA}</p>
                        </div>
                    </section>

                    <PanelEstado
                        id="memoria-estado"
                        detalle={borrador.detalle}
                        ocupado={borrador.ocupado}
                        error={borrador.error}
                        alGuardar={() => borrador.guardarBorrador(cambios(), imagen)}
                    />
                </aside>
            </form>
            <ConfirmarEnvio
                abierto={confirmando}
                tipo="Memoria pública"
                queSeEnvia="la pieza"
                titulo={titulo}
                folio={borrador.folio ?? undefined}
                alCerrar={() => setConfirmando(false)}
                alConfirmar={enviar}
            />
        </PanelLayout>
    );
}

export default RedactarMemoria;
