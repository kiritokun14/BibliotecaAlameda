// Reacciones de un contenido publicado (noticia, reseña o registro de memoria): «Me gusta», «Me sirvió»
// (o «Me fue útil») y «Compartir». Pieza compartida: va al final del texto, en una tarjeta con franja.
// Visitante: ve cuántas reacciones hay, pero para reaccionar necesita una cuenta. Compartir funciona sin cuenta.
// Sin animación al marcar: solo cambia el color (AGENTS §3).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useSesion } from "../../pages/publico/perfil/usarSesion";
import { conteoLocal, consultarReacciones, marcarReaccion, reaccionesLocales, registrarCompartido, type ReaccionesNoticia, type TipoReaccion } from "../../servicios/reacciones";
import iconoEstrella from "../../assets/noticias/reaccion-estrella.svg";
import iconoCheck from "../../assets/noticias/reaccion-check.svg";
import iconoCompartir from "../../assets/noticias/reaccion-compartir.svg";

const SIN_CONTEO = { meGusta: 0, meSirvio: 0, compartir: 0 };

export default function Reacciones({ id, titulo, base = SIN_CONTEO, textoUtil = "Me sirvió", pregunta = "¿Qué te pareció?" }: {
    id: string; // folio del contenido (CN-0045)
    titulo: string; // para el menú de compartir
    base?: { meGusta: number; meSirvio: number; compartir: number }; // conteos que trae el contenido
    textoUtil?: string;
    pregunta?: string;
}) {
    const sesion = useSesion(); // undefined = todavía no se sabe; null = visitante
    const [aviso, setAviso] = useState("");
    const [servidor, setServidor] = useState<ReaccionesNoticia | null>(null); // lo que responde el backend (cuando exista)
    const [, refrescar] = useState(0);
    const [enviando, setEnviando] = useState(false);
    // Sin backend: marcas y compartidos guardados en este navegador (sobreviven a recargar)
    const mias = servidor?.mias ?? (sesion ? reaccionesLocales.de(sesion, id) : []);
    const conteo = servidor ?? conteoLocal(base, id, mias);

    useEffect(() => {
        let vigente = true;
        consultarReacciones(id).then((r) => { if (vigente) setServidor(r); })
            .catch(() => { /* TODO backend: aún no existe; se usan los datos guardados aquí */ });
        return () => { vigente = false; };
    }, [id, sesion]);

    async function alternar(tipo: TipoReaccion) {
        if (!sesion || enviando) return;
        const activa = !mias.includes(tipo);
        setEnviando(true);
        try { setServidor(await marcarReaccion(id, tipo, activa)); }
        catch { reaccionesLocales.guardar(sesion, id, activa ? [...mias, tipo] : mias.filter((t) => t !== tipo)); refrescar((n) => n + 1); }
        finally { setEnviando(false); }
    }

    async function compartir() {
        const url = window.location.href;
        try {
            if (navigator.share) await navigator.share({ title: titulo, url });
            else { await navigator.clipboard.writeText(url); setAviso("Enlace copiado"); }
        } catch { return; /* cerró el menú de compartir o el navegador no dejó copiar */ }
        try { setServidor(await registrarCompartido(id)); }
        catch { reaccionesLocales.sumarCompartido(id); refrescar((n) => n + 1); }
    }

    const opciones = [
        { tipo: "me_gusta" as const, texto: "Me gusta", icono: iconoEstrella, cantidad: conteo.meGusta },
        { tipo: "me_sirvio" as const, texto: textoUtil, icono: iconoCheck, cantidad: conteo.meSirvio },
    ];
    return (
        <div className="reacciones-noticia">
            <div className="reacciones-noticia__pregunta">
                <p className="reacciones-noticia__titulo">{pregunta}</p>
                {sesion === null && (
                    <p><Link to="/iniciar-sesion" className="enlace-noticias enlace-noticias--subrayado">Inicia sesión</Link> para reaccionar</p>
                )}
                {sesion && <p>Toca una opción para marcarla o quitarla.</p>}
            </div>
            <div className="reacciones-noticia__chips">
                {opciones.map((o) => {
                    const activa = mias.includes(o.tipo);
                    return (
                        <button key={o.tipo} type="button" disabled={!sesion} aria-pressed={activa}
                            className={`reaccion-noticia reaccion-noticia--boton${activa ? " reaccion-noticia--activa" : ""}`} onClick={() => alternar(o.tipo)}>
                            <img src={o.icono} alt="" />
                            {o.texto}
                            <span className="reaccion-noticia__cantidad">{o.cantidad}</span>
                        </button>
                    );
                })}
                <button type="button" className="reaccion-noticia reaccion-noticia--boton" onClick={compartir}>
                    <img src={iconoCompartir} alt="" />
                    Compartir
                    <span className="reaccion-noticia__cantidad">{conteo.compartir}</span>
                </button>
            </div>
            <p className="solo-lectores" role="status">{aviso}</p>
            {aviso && <p className="reacciones-noticia__aviso" aria-hidden="true">{aviso}</p>}
        </div>
    );
}
