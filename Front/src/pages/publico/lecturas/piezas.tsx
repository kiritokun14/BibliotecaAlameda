import { useState, type CSSProperties, type ReactNode } from "react";
import { imagenFallo, marcarImagenFallida } from "../../../servicios/imagenesFallidas";
import { Link, NavLink } from "react-router";
import { mesAnio, type Memoria, type Resena } from "./datos";
import { urlCatalogo } from "../../../servicios/catalogo";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
import iconoCandado from "../../../assets/comun/iconos/candado.svg";
import { iconoLibro } from "./iconos";
import fotoRespaldo from "../../../assets/comun/fotos/foto-biblioteca.webp";

// Tipo de lectura en pastilla con punto (sin mayúsculas): Reseña · Recomendada · Memoria
export function TipoLectura({ tipo, claro, children }: { tipo: "resena" | "recomendada" | "memoria"; claro?: boolean; children?: ReactNode }) {
    const texto = { resena: "Reseña", recomendada: "Recomendada", memoria: "Memoria" }[tipo];
    return (
        <span className={`lectura-tipo lectura-tipo--${tipo}${claro ? " lectura-tipo--claro" : ""}`}>
            <span className="lectura-tipo__punto" aria-hidden="true" />{texto}{children && <small>{children}</small>}
        </span>
    );
}

// ---------- Pestañas "Lecturas · Memoria pública" (Por tema se quitó: lo hace el filtro Género) ----------
export function PestanasLecturas() {
    const pestanas = [
        { texto: "Lecturas", ruta: "/lecturas" },
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
export function Portada({ resena, tamano = "normal" }: { resena: Resena; tamano?: "normal" | "detalle" }) {
    const [foto, setFoto] = useState<"cargando" | "lista" | "fallo">(() => (imagenFallo(resena.imagen) ? "fallo" : "cargando"));
    const conFoto = Boolean(resena.imagen) && foto !== "fallo";
    return (
        <div className={`portada-lectura portada-lectura--${resena.color} portada-lectura--${tamano}`}>
            <span className="portada-lectura__circulo" aria-hidden="true" />
            {/* En la portada solo el nombre del libro (lo que va antes de «:»); el título completo va debajo */}
            <strong aria-hidden="true">{resena.libro.split(":")[0]}</strong>
            <small aria-hidden="true">{resena.autoria}</small>
            {conFoto && (
                <img className={`portada-lectura__foto${foto === "lista" ? " portada-lectura__foto--lista" : ""}`}
                    loading="lazy" decoding="async" src={resena.imagen} alt={foto === "lista" ? `Portada de ${resena.libro}` : ""}
                    onLoad={() => setFoto("lista")} onError={() => { marcarImagenFallida(resena.imagen); setFoto("fallo"); }} />
            )}
        </div>
    );
}

// Foto de un registro de memoria; sin foto (o si no carga), una de la biblioteca como respaldo
export function FotoMemoria({ src }: { src?: string }) {
    const [fallo, setFallo] = useState(() => imagenFallo(src));
    return <img loading="lazy" decoding="async" src={src && !fallo ? src : fotoRespaldo} alt=""
        onError={() => { marcarImagenFallida(src); setFallo(true); }} />;
}

// ---------- Tarjetas ----------
// Tarjeta blanca con franja de color arriba (verde = reseña, dorada = memoria); se eleva 4 px al pasar el mouse,
// su portada o foto se acerca 3 % y su enlace se subraya en dorado.
export function TarjetaResena({ resena }: { resena: Resena }) {
    const ruta = `/lecturas/${resena.id}`;
    return (
        <li className="tarjeta-resena tarjeta-lectura tarjeta-lectura--resena">
            <Link to={ruta} className="tarjeta-lectura__portada" tabIndex={-1} aria-hidden="true"><Portada resena={resena} /></Link>
            <div className="tarjeta-lectura__contenido">
                <TipoLectura tipo={resena.recomendada ? "recomendada" : "resena"} />
                <h3>{resena.libro}</h3>
                <p className="tarjeta-resena__autoria">{resena.autoria}</p>
                <p className="tarjeta-resena__fecha">Reseña del equipo · {mesAnio(resena.publicada)}</p>
                <Link to={ruta} className="tarjeta-lectura__accion">
                    Leer reseña<span className="solo-lectores">: {resena.libro}</span>
                </Link>
            </div>
        </li>
    );
}

export function TarjetaMemoria({ memoria }: { memoria: Memoria }) {
    const ruta = `/lecturas/memoria/${memoria.id}`;
    return (
        <li className="tarjeta-memoria tarjeta-lectura tarjeta-lectura--memoria">
            <Link to={ruta} className="tarjeta-memoria__imagen" tabIndex={-1} aria-hidden="true"><FotoMemoria src={memoria.imagen} /></Link>
            <div className="tarjeta-memoria__contenido tarjeta-lectura__contenido">
                <TipoLectura tipo="memoria">{memoria.anio}</TipoLectura>
                <h3>{memoria.titulo}</h3>
                <Link to={ruta} className="tarjeta-lectura__accion">
                    Ver registro<span className="solo-lectores">: {memoria.titulo}</span>
                </Link>
            </div>
        </li>
    );
}

// Registro más reciente de la memoria: tarjeta ancha con la foto a la izquierda y su texto a la derecha
export function MemoriaDestacada({ memoria }: { memoria: Memoria }) {
    const ruta = `/lecturas/memoria/${memoria.id}`;
    const texto = memoria.entrada.trim() !== memoria.titulo.trim() ? memoria.entrada : memoria.cuerpo[0] ?? "";
    return (
        <article className="memoria-destacada tarjeta-lectura tarjeta-lectura--memoria">
            <Link to={ruta} className="memoria-destacada__foto" tabIndex={-1} aria-hidden="true"><FotoMemoria src={memoria.imagen} /></Link>
            <div className="memoria-destacada__contenido">
                <TipoLectura tipo="memoria">{memoria.anio}</TipoLectura>
                <p className="memoria-destacada__nota">Registro más reciente</p>
                <h2>{memoria.titulo}</h2>
                {texto && <p className="memoria-destacada__texto">{texto}</p>}
                <Link to={ruta} className="perfil-boton">Ver registro<span className="solo-lectores">: {memoria.titulo}</span></Link>
            </div>
        </article>
    );
}

// ---------- Encabezados ----------
// Título con una parte en dorado: "Un pueblo hecho de <span>voces</span>"
export function TituloResaltado({ titulo, resaltado }: { titulo: string; resaltado?: string }) {
    const i = resaltado ? titulo.lastIndexOf(resaltado) : -1;
    if (!resaltado || i < 0) return <>{titulo}</>;
    return <>{titulo.slice(0, i)}<span>{resaltado}</span>{titulo.slice(i + resaltado.length)}</>;
}

// Franja verde compacta con el ícono del libro junto al título (plantilla C)
export function EncabezadoLecturas({ etiqueta, titulo, texto }: { etiqueta: string; titulo: ReactNode; texto: string }) {
    return (
        <section className="encabezado-publico encabezado-lecturas encabezado-lecturas--compacto">
            <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
            <img className="encabezado-publico__circulo encabezado-publico__circulo--2" src={circulo2} alt="" />
            <span className="etiqueta-inicio">
                <span className="punto-dorado" />
                {etiqueta}
            </span>
            <div className="encabezado-publico__titular">
                <span className="encabezado-publico__insignia" style={{ "--icono": `url("${iconoLibro}")` } as CSSProperties} aria-hidden="true" />
                <h1>{titulo}</h1>
            </div>
            <p>{texto}</p>
        </section>
    );
}

// ---------- Estados: el vacío importante del catálogo (insignia grande; guinda si es error o restringido) ----------
type TipoEstado = "privado" | "no-disponible" | "sin-resultados" | "error";

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
        privado: { titulo: "Este material no es de consulta pública", texto: "Tiene acceso restringido. Si necesitas consultarlo, pregunta al personal de la biblioteca.", icono: iconoCandado, guinda: true },
        "no-disponible": { titulo: "No pudimos abrir esta lectura", texto: "Puede estar en revisión o ya no estar publicada. Si crees que es un error, avísanos.", icono: iconoLibro, guinda: true },
        "sin-resultados": { titulo: "No encontramos lecturas con esa búsqueda", texto: "Prueba con otro autor, título o tema, o quita los filtros.", icono: iconoLibro, guinda: false },
        error: { titulo: "No pudimos cargar las lecturas", texto: "Revisa tu conexión e inténtalo de nuevo en un momento.", icono: iconoLibro, guinda: true },
    }[tipo];

    return (
        <div className={`perfil-vacio perfil-vacio--eventos estado-lecturas-nuevo${datos.guinda ? " estado-lecturas-nuevo--guinda" : ""}`} role="status"
            style={{ "--icono-seccion": `url("${datos.icono}")` } as CSSProperties}>
            <span className="perfil-vacio__insignia" aria-hidden="true" />
            <p><strong>{datos.titulo}</strong>{datos.texto}</p>
            <div className="estado-lecturas-nuevo__botones">
                {tipo === "sin-resultados" ? (
                    <button type="button" className="perfil-boton" onClick={alLimpiar}>Quitar filtros</button>
                ) : tipo === "error" ? (
                    <button type="button" className="perfil-boton" onClick={() => window.location.reload()}>Reintentar</button>
                ) : (
                    <Link to={regreso?.ruta ?? "/lecturas"} className="perfil-boton">{regreso?.texto ?? "Volver a Lecturas"}</Link>
                )}
                {(tipo === "no-disponible" || tipo === "privado") && (
                    <Link to="/contacto" className="perfil-boton perfil-boton--contorno">Avisar a la biblioteca</Link>
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
        return <Link to="/catalogo" className="perfil-boton">Buscar en el catálogo</Link>;
    }
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="perfil-boton">
            Buscar en el catálogo
            <span className="solo-lectores"> (se abre en una pestaña nueva)</span>
        </a>
    );
}

export function BotonVolverClaro({ texto, ruta }: { texto: string; ruta: string }) {
    return (
        <Link to={ruta} className="perfil-boton perfil-boton--contorno">
            {texto}
        </Link>
    );
}
