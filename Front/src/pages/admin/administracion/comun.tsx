// Piezas comunes de Administración (diseño del Editor de contenidos).
import { type ReactNode } from "react";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import "./Administracion.css";

// Armazón de cada pantalla: «Administración › <módulo> › …»
export function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Administración" tema="contenidos">
            <Migas raiz="Administración" pasos={migas} />
            {children}
        </PanelLayout>
    );
}

export function ErrorCarga({ titulo = "No se pudo cargar", texto, alReintentar }: { titulo?: string; texto: string; alReintentar?: () => void }) {
    return (
        <div className="at-bloque at-bloque--error ad-error" role="alert">
            <div><strong>{titulo}</strong><p>{texto}</p></div>
            {alReintentar && <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alReintentar}>Reintentar</button>}
        </div>
    );
}

// Pestañas de una pantalla (Portal / Actividades…, General / Horarios…)
export function Pestanas<T extends string>({ opciones, valor, alCambiar, etiqueta }: { opciones: { valor: T; texto: string }[]; valor: T; alCambiar: (v: T) => void; etiqueta: string }) {
    return (
        <div className="contenidos-filtros" role="group" aria-label={etiqueta}>
            {opciones.map((o) => (
                <button key={o.valor} type="button" aria-pressed={valor === o.valor} className={`contenidos-filtro${valor === o.valor ? " contenidos-filtro--activo" : ""}`} onClick={() => alCambiar(o.valor)}>
                    {o.texto}
                </button>
            ))}
        </div>
    );
}

// Tarjetas de «Accesos rápidos» (mismas del Editor)
export type TarjetaResumen = { tono: "azul" | "gris" | "guinda"; icono: ReactNode; cifra: ReactNode; titulo: string; texto: string; activa?: boolean; alPresionar?: () => void; enlace?: string };

export function Resumen({ titulo = "Accesos rápidos", tarjetas }: { titulo?: string; tarjetas: TarjetaResumen[] }) {
    return (
        <section className="contenidos-resumen" aria-label={titulo}>
            <h2>{titulo}</h2>
            <div className="contenidos-resumen__tarjetas">
                {tarjetas.map((t) => (
                    <article key={t.titulo} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${t.tono}${t.activa ? " at-tarjeta--activa" : ""}`}>
                        <div className="contenidos-resumen__fila">
                            <span className="contenidos-resumen__icono">{t.icono}</span>
                            {t.alPresionar && <button type="button" className="contenidos-resumen__enlace" aria-pressed={t.activa} onClick={t.alPresionar}>{t.enlace ?? "Ver"} →</button>}
                        </div>
                        <p className="contenidos-resumen__cifra">{t.cifra}</p>
                        <p className="contenidos-resumen__titulo">{t.titulo}</p>
                        <p className="contenidos-resumen__texto">{t.texto}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
