import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { mesAnio, type Memoria, type Resena } from "./datos";
import { urlCatalogo } from "../../../servicios/catalogo";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
import volverBlanca from "../../../assets/comun/iconos/volver-blanca.svg";
import volverOscura from "../../../assets/comun/iconos/volver-oscura.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import iconoCandado from "../../../assets/comun/iconos/candado.svg";
import iconoLibro from "../../../assets/lecturas/libro-guinda.svg";
import iconoExterno from "../../../assets/lecturas/externo-blanco.svg";
import fotoRespaldo from "../../../assets/comun/fotos/foto-biblioteca.jpg";

// ---------- Pestañas "Por autor · Por tema · Memoria pública" ----------
export function PestanasLecturas() {
    const pestanas = [
        { texto: "Por autor", ruta: "/lecturas" },
        { texto: "Por tema", ruta: "/lecturas/temas" },
        { texto: "Memoria pública", ruta: "/lecturas/memoria" },
    ];
    return (
        <nav aria-label="Secciones de Lecturas y reseñas">
            <ul className="pestanas-lecturas">
                {pestanas.map((p) => (
                    <li key={p.ruta}>
                        <NavLink to={p.ruta} end className="pestanas-lecturas__enlace">{p.texto}</NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

// ---------- Portada ----------
// La portada ilustrada se ve siempre; si la reseña tiene foto, aparece encima con un desvanecido
// solo cuando terminó de cargar. Si falla o tarda, se queda la ilustrada (nunca un recuadro vacío).
export function Portada({ resena, tamano = "normal" }: { resena: Resena; tamano?: "normal" | "ancha" | "detalle" }) {
    const [foto, setFoto] = useState<"cargando" | "lista" | "fallo">("cargando");
    const conFoto = Boolean(resena.imagen) && foto !== "fallo";
    return (
        <div className={`portada-lectura portada-lectura--${resena.color} portada-lectura--${tamano}`}>
            <span className="portada-lectura__circulo" aria-hidden="true" />
            <strong aria-hidden="true">{resena.libro}</strong>
            {tamano !== "ancha" && <small aria-hidden="true">{resena.autoria}</small>}
            {conFoto && (
                <img className={`portada-lectura__foto${foto === "lista" ? " portada-lectura__foto--lista" : ""}`}
                    loading="lazy" decoding="async" src={resena.imagen} alt={foto === "lista" ? `Portada de ${resena.libro}` : ""}
                    onLoad={() => setFoto("lista")} onError={() => setFoto("fallo")} />
            )}
        </div>
    );
}

// Foto de un registro de memoria; sin foto (o si no carga), una de la biblioteca como respaldo
export function FotoMemoria({ src }: { src?: string }) {
    const [fallo, setFallo] = useState(false);
    return <img loading="lazy" decoding="async" src={src && !fallo ? src : fotoRespaldo} alt="" onError={() => setFallo(true)} />;
}

// ---------- Tarjetas ----------
export function TarjetaResena({ resena, desde }: { resena: Resena; desde?: "tema" }) {
    const ruta = `/lecturas/${resena.id}${desde ? `?desde=${desde}` : ""}`;
    return (
        <li className="tarjeta-resena">
            <Portada resena={resena} />
            <p className="tipo-lectura tipo-lectura--resena"><span />RESEÑA</p>
            <h3>{resena.libro}</h3>
            <p className="tarjeta-resena__autoria">{resena.autoria}</p>
            <p className="tarjeta-resena__fecha">Reseña del equipo · {mesAnio(resena.publicada)}</p>
            <Link to={ruta} className="boton-lectura boton-lectura--chico">
                Leer reseña <img src={flechaBlanca} alt="" />
                <span className="solo-lectores">: {resena.libro}</span>
            </Link>
        </li>
    );
}

export function TarjetaMemoria({ memoria, desde }: { memoria: Memoria; desde?: "tema" }) {
    const ruta = `/lecturas/memoria/${memoria.id}${desde ? `?desde=${desde}` : ""}`;
    return (
        <li className="tarjeta-memoria">
            <div className="tarjeta-memoria__imagen">
                <FotoMemoria src={memoria.imagen} />
                <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
            </div>
            <div className="tarjeta-memoria__contenido">
                <p className="tipo-lectura tipo-lectura--memoria"><span />MEMORIA <small>{memoria.anio}</small></p>
                <h3>{memoria.titulo}</h3>
                <Link to={ruta} className="boton-lectura boton-lectura--chico">
                    Ver registro <img src={flechaBlanca} alt="" />
                    <span className="solo-lectores">: {memoria.titulo}</span>
                </Link>
            </div>
        </li>
    );
}

// ---------- Encabezados ----------
// Título con una parte en dorado: "Un pueblo hecho de <span>voces</span>"
export function TituloResaltado({ titulo, resaltado }: { titulo: string; resaltado?: string }) {
    const i = resaltado ? titulo.lastIndexOf(resaltado) : -1;
    if (!resaltado || i < 0) return <>{titulo}</>;
    return <>{titulo.slice(0, i)}<span>{resaltado}</span>{titulo.slice(i + resaltado.length)}</>;
}

export function EncabezadoLecturas({
    etiqueta,
    titulo,
    texto,
    regreso,
    conImagenDebajo,
}: {
    etiqueta: string;
    titulo: ReactNode;
    texto: string;
    regreso?: { texto: string; ruta: string };
    conImagenDebajo?: boolean; // deja espacio para la portada o foto que se monta encima
}) {
    const clases = ["encabezado-publico", "encabezado-lecturas"];
    if (regreso) clases.push("encabezado-lecturas--con-regreso");
    if (conImagenDebajo) clases.push("encabezado-lecturas--con-imagen");
    return (
        <section className={clases.join(" ")}>
            <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
            <img className="encabezado-publico__circulo encabezado-publico__circulo--2" src={circulo2} alt="" />
            {regreso && (
                <div className="encabezado-lecturas__regreso">
                    <Link to={regreso.ruta} className="boton-regreso-lecturas">
                        <img src={volverBlanca} alt="" />
                        {regreso.texto}
                    </Link>
                </div>
            )}
            <span className="etiqueta-inicio">
                <span className="punto-dorado" />
                {etiqueta}
            </span>
            <h1>{titulo}</h1>
            <p>{texto}</p>
        </section>
    );
}

// ---------- Estados: acceso restringido, recurso no disponible, sin resultados ----------
type TipoEstado = "privado" | "no-disponible" | "sin-resultados";

export function EstadoLecturas({
    tipo,
    regreso,
    alLimpiar,
}: {
    tipo: TipoEstado;
    regreso?: { texto: string; ruta: string };
    alLimpiar?: () => void;
}) {
    const datos = {
        privado: {
            etiqueta: "ACCESO RESTRINGIDO",
            titulo: "Este material no es de consulta pública",
            texto: "Tiene acceso restringido. Si necesitas consultarlo, pregunta al personal de la biblioteca (reglas de acceso por confirmar).",
            icono: iconoCandado,
            rosa: false,
        },
        "no-disponible": {
            etiqueta: "RECURSO NO DISPONIBLE",
            titulo: "No pudimos abrir este recurso",
            texto: "Puede estar en revisión o ya no estar publicado. Avisa a la biblioteca y lo atendemos.",
            icono: iconoLibro,
            rosa: true,
        },
        "sin-resultados": {
            etiqueta: "SIN RESULTADOS",
            titulo: "No encontramos lecturas con esa búsqueda",
            texto: "Prueba con otro autor, título o tema, o quita los filtros.",
            icono: iconoLibro,
            rosa: true,
        },
    }[tipo];

    return (
        <div className="estado-lecturas" role="status">
            <span className="estado-lecturas__anillo">
                <span className={datos.rosa ? "estado-lecturas__icono estado-lecturas__icono--rosa" : "estado-lecturas__icono"}>
                    <img src={datos.icono} alt="" />
                </span>
            </span>
            <p className="estado-lecturas__etiqueta">{datos.etiqueta}</p>
            <h2>{datos.titulo}</h2>
            <p className="estado-lecturas__texto">{datos.texto}</p>
            <div className="estado-lecturas__botones">
                {tipo === "sin-resultados" ? (
                    <button type="button" className="boton-lectura" onClick={alLimpiar}>Quitar filtros</button>
                ) : (
                    <Link to={regreso?.ruta ?? "/lecturas"} className="boton-lectura">
                        <img src={volverBlanca} alt="" />
                        {regreso?.texto ?? "Volver a Lecturas"}
                    </Link>
                )}
                {tipo !== "sin-resultados" && (
                    <Link to="/contacto" className="boton-lectura boton-lectura--contorno">
                        Avisar a la biblioteca
                    </Link>
                )}
            </div>
        </div>
    );
}

// ---------- "Buscar en el catálogo" (Koha, sitio externo) ----------
export function BotonCatalogo() {
    const url = urlCatalogo();
    // Sin dirección de Koha, /catalogo muestra «Catálogo no disponible»
    if (!url) {
        return <Link to="/catalogo" className="boton-lectura">Buscar en el catálogo</Link>;
    }
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="boton-lectura">
            Buscar en el catálogo <img src={iconoExterno} alt="" />
            <span className="solo-lectores"> (se abre en una pestaña nueva)</span>
        </a>
    );
}

export function BotonVolverClaro({ texto, ruta }: { texto: string; ruta: string }) {
    return (
        <Link to={ruta} className="boton-lectura boton-lectura--contorno">
            <img src={volverOscura} alt="" />
            {texto}
        </Link>
    );
}
