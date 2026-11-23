// useState conserva datos; useEffect ejecuta la carga; useRef apunta al DOM;
// useCallback mantiene estable la función que recibe la pista del carrusel.
import { useCallback, useEffect, useRef, useState } from 'react';
// Los import type describen contratos al compilar y no añaden código al navegador.
import { consultarInstagram, type NoticiasInstagram, type PublicacionInstagram } from '../../../servicios/instagram';
import { imagenFallo, marcarImagenFallida } from '../../../servicios/imagenesFallidas';
import { Bloque as Esqueleto } from '../../../components/portal/Esqueleto';
// Reutilizamos el diseño y los controles existentes del inicio.
import { Bloque, EncabezadoSeccion, Etiqueta } from './Bloque';
import { useCarrusel } from './useCarrusel';
import { Flecha, Puntos } from './ControlesCarrusel';
import anterior from '../../../assets/inicio/carrusel-anterior.svg';
import siguiente from '../../../assets/inicio/carrusel-siguiente.svg';
// Los SVG ya pertenecen al proyecto: no se descargan nuevas librerías de iconos.
import circulo1 from '../../../assets/comun/iconos/bloque-circulo-1.svg';
import circulo2 from '../../../assets/comun/iconos/bloque-circulo-2.svg';
import rama from '../../../assets/inicio/noticias-rama.svg';
import iconoPeriodico from '../../../assets/inicio/noticias-periodico.svg';
import iconoCalendario from '../../../assets/inicio/dato-calendario.svg';
import './NoticiasCulturales.css';

// Se reutiliza el formateador en todas las tarjetas; la zona corresponde a Nayarit.
const formatoFecha = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mazatlan',
});

/** Presenta una publicación sin consultas adicionales a la API. */
export function TarjetaCultural({ publicacion }: { publicacion: PublicacionInstagram }) {
    const [imagenFallida, setImagenFallida] = useState<string | null>(null); // URL que falló en esta tarjeta.
    // El registro compartido recuerda las imágenes que fallaron durante esta pestaña.
    const fallo = imagenFallida === publicacion.thumbnail || imagenFallo(publicacion.thumbnail);
    const fecha = publicacion.taken_at ? new Date(publicacion.taken_at) : null; // No convierte null a una fecha.
    return <article className="noticia-cultural">
        <div className="noticia-cultural__imagen">
            {/* && exige una URL y ausencia de fallo; el operador ternario elige imagen o respaldo.
                lazy difiere la descarga; width/height reservan proporción; async evita bloquear
                el dibujo al decodificar; no-referrer omite el referente de esta solicitud. */}
            {publicacion.thumbnail && !fallo
                ? <img src={publicacion.thumbnail} alt="Publicación de Cultura Nayarit" loading="lazy"
                    width={640} height={480} decoding="async" referrerPolicy="no-referrer"
                    onError={() => {
                        marcarImagenFallida(publicacion.thumbnail); // Recuerda el fallo en la pestaña.
                        setImagenFallida(publicacion.thumbnail); // Provoca un nuevo render con el respaldo.
                    }} />
                : <div className="noticia-cultural__sin-imagen">Imagen no disponible</div>}
        </div>
        <div className="noticia-cultural__contenido">
            <Etiqueta icono={iconoPeriodico} className="etiqueta-inicio--dorada">Cultura Nayarit</Etiqueta>
            {/* getTime devuelve NaN en fechas inválidas; isFinite evita mostrarlas.
                dateTime conserva el valor ISO para máquinas y el texto visible usa formato local. */}
            {fecha && Number.isFinite(fecha.getTime()) && <time className="noticia-cultural__fecha" dateTime={fecha.toISOString()}>
                <img src={iconoCalendario} alt="" />
                {formatoFecha.format(fecha)}
            </time>}
            {/* || usa el texto de respaldo si caption está vacío. React escapa el contenido como texto. */}
            <p>{publicacion.caption || 'Publicación de @culturanayarit.'}</p>
            {/* Solo hay botón con URL válida. _blank abre otra pestaña y rel aísla el destino. */}
            {publicacion.url && <a className="boton-dorado boton-dorado--chico noticia-cultural__enlace" href={publicacion.url} target="_blank" rel="noopener noreferrer">
                Ver publicación en Instagram
            </a>}
        </div>
    </article>;
}

/** Navega por las publicaciones ya descargadas; las flechas no consumen créditos. */
function CarruselCultural({ publicaciones }: { publicaciones: PublicacionInstagram[] }) {
    const pista = useRef<HTMLDivElement | null>(null); // Guarda el elemento desplazable sin crear estado visual.
    // map + join producen una referencia del contenido; el hook vuelve al inicio si cambian los IDs.
    const { refPista, pagina, totalPaginas, alDesplazar } = useCarrusel(publicaciones.map(p => p.id).join(','));
    const conectarPista = useCallback((elemento: HTMLDivElement | null) => {
        pista.current = elemento; // Referencia local para ejecutar scrollTo.
        refPista(elemento); // El hook compartido necesita el mismo nodo para medir el carrusel.
    }, [refPista]);
    function irAPagina(numero: number) {
        const elemento = pista.current;
        if (!elemento) return; // Evita medir un nodo antes de montarlo o después de desmontarlo.
        // El módulo permite volver al inicio desde el final y viceversa.
        const destino = (numero + totalPaginas) % totalPaginas;
        elemento.scrollTo({
            // scrollWidth es el ancho completo y clientWidth el visible: su diferencia es el avance máximo.
            // Reparte ese recorrido entre los puntos; Math.max evita dividir entre cero si solo hay uno.
            left: (elemento.scrollWidth - elemento.clientWidth) * destino / Math.max(1, totalPaginas - 1),
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', // Respeta accesibilidad.
        });
    }
    // role y aria describen esta zona para quienes utilizan lectores de pantalla.
    return <div className="noticias-culturales__carrusel" role="region" aria-roledescription="carrusel" aria-label="Publicaciones de Cultura Nayarit">
        <div className="carrusel">
            <div className="carrusel__pista noticias-culturales__tarjetas" ref={conectarPista}
                onScroll={alDesplazar} tabIndex={0} aria-label="Publicaciones; usa las flechas del teclado para navegar"
                onKeyDown={evento => {
                    // Solo procesa teclas de la pista enfocada: no intercepta las de sus enlaces hijos.
                    if (evento.target !== evento.currentTarget) return;
                    const destinos: Record<string, number> = { ArrowLeft: pagina - 1, ArrowRight: pagina + 1, Home: 0, End: totalPaginas - 1 }; // Tecla -> página.
                    // preventDefault evita que las mismas teclas desplacen además la página completa.
                    if (evento.key in destinos) { evento.preventDefault(); irAPagina(destinos[evento.key]); }
                }}>
                {/* map crea una tarjeta por publicación; key ayuda a React a identificarla entre renders. */}
                {publicaciones.map(publicacion => <TarjetaCultural key={publicacion.id} publicacion={publicacion} />)}
            </div>
        </div>
        {/* Oculta controles si todo cabe en una sola vista; no hay temporizador ni avance automático. */}
        {totalPaginas > 1 && <div className="noticias-culturales__controles" role="group" aria-label="Navegar publicaciones">
            <Flecha lado="anterior" icono={anterior} alPresionar={() => irAPagina(pagina - 1)} />
            <Puntos total={totalPaginas} activo={pagina} alElegir={irAPagina} />
            <Flecha lado="siguiente" icono={siguiente} alPresionar={() => irAPagina(pagina + 1)} />
        </div>}
    </div>;
}

/** Separa los estados de error, carga, lista vacía y datos disponibles. */
export function ContenidoCultural({ datos, error }: { datos: NoticiasInstagram | null; error: boolean }) {
    // Los retornos tempranos hacen que error y carga no se mezclen con las publicaciones.
    if (error) return <p className="nota-ejemplo" role="alert">No pudimos cargar las noticias culturales. Intenta más tarde.</p>;
    if (!datos) return <>
        <p className="nota-ejemplo" role="status">Cargando publicaciones de Cultura Nayarit…</p>
        <div className="noticias-culturales__tarjetas" aria-hidden="true">
            {/* Array.from crea seis espacios de carga; aria-hidden oculta su decoración al lector de pantalla. */}
            {Array.from({ length: 6 }, (_, i) => <div className="noticia-cultural" key={i}>
                <div className="noticia-cultural__imagen"><Esqueleto clase="noticia-cultural__esqueleto-imagen" /></div>
                <div className="noticia-cultural__contenido">
                    <Esqueleto clase="esqueleto__chip" />
                    <Esqueleto clase="esqueleto__linea" ancho="60%" />
                    <Esqueleto clase="noticia-cultural__esqueleto-texto" />
                    <Esqueleto clase="noticia-cultural__esqueleto-boton" />
                </div>
            </div>)}
        </div>
    </>;
    return <>
        {/* El backend informa si la copia venció; el frontend no calcula la caché de seis horas. */}
        {datos.desactualizado && <p className="nota-ejemplo" role="status">Mostramos las últimas publicaciones guardadas.</p>}
        {/* Una lista vacía es éxito sin contenido. slice impone también aquí el máximo de seis. */}
        {datos.publicaciones.length === 0 ? <p className="nota-ejemplo" role="status">Todavía no hay publicaciones disponibles.</p>
            : <CarruselCultural publicaciones={datos.publicaciones.slice(0, 6)} />}
    </>;
}

export default function NoticiasCulturales() {
    const [datos, setDatos] = useState<NoticiasInstagram | null>(null); // null representa la carga inicial.
    const [error, setError] = useState(false); // Solo almacena si falló, sin mostrar detalles internos.
    useEffect(() => {
        // La petición se inicia al montar. Al salir de la página evitamos actualizar
        // un componente desmontado; no cancelamos la petición compartida del servicio.
        let activa = true;
        consultarInstagram().then(resultado => { if (activa) setDatos(resultado); }) // Éxito: actualiza la vista.
            .catch(() => { if (activa) setError(true); }); // Fallo: activa el mensaje genérico.
        return () => { activa = false; }; // Limpieza que React ejecuta al desmontar el componente.
    }, []); // Sin dependencias: se ejecuta al montar, no en cada render; StrictMode puede repetirlo en desarrollo.
    // aria-labelledby conecta la sección con su título; aria-busy indica que todavía está cargando.
    return <section className="seccion-inicio seccion-inicio--crema" aria-labelledby="noticias-culturales-titulo"
        aria-busy={!datos && !error}>
        <Bloque tema="guinda" circulos={[circulo1, circulo2]}
            textura={{ src: rama, ancho: 380, alto: 380 }} className="noticias-culturales">
            <EncabezadoSeccion etiqueta="Cultura Nayarit" iconoEtiqueta={iconoPeriodico}
                titulo={<span id="noticias-culturales-titulo" className="noticias-culturales__titulo">Cultura <span>Nayarit</span></span>}
                texto="Las publicaciones más recientes de @culturanayarit" />
            <ContenidoCultural datos={datos} error={error} />
        </Bloque>
    </section>;
}
