import { useEffect, useRef, useState } from "react";

// Recuadro para confirmar "Enviar a autorización". Usa <dialog> del navegador:
// bloquea la pantalla de atrás, Escape lo cierra y el foco queda dentro.

type ConfirmarEnvioProps = {
    abierto: boolean;
    tipo: string; // "Noticia", "Reseña bibliográfica"...
    titulo: string;
    queSeEnvia: string; // "la noticia", "la reseña", "la sección" (todas en femenino)
    folio?: string; // lo asigna la base al guardar el primer borrador
    alCerrar: () => void;
    alConfirmar: (nota: string) => void;
};

function ConfirmarEnvio({ abierto, tipo, titulo, queSeEnvia, folio, alCerrar, alConfirmar }: ConfirmarEnvioProps) {
    const ventana = useRef<HTMLDialogElement>(null);
    const [nota, setNota] = useState("");

    useEffect(() => {
        const dialogo = ventana.current;
        if (!dialogo) return;
        if (abierto && !dialogo.open) dialogo.showModal();
        if (!abierto && dialogo.open) dialogo.close();
    }, [abierto]);

    return (
        <dialog
            ref={ventana}
            className="contenidos-dialogo"
            aria-labelledby="confirmar-envio-titulo"
            onCancel={(e) => {
                e.preventDefault();
                alCerrar();
            }}
            onClick={(e) => {
                // Clic en el fondo oscuro cierra
                if (e.target === e.currentTarget) alCerrar();
            }}
        >
            <form
                method="dialog"
                className="contenidos-dialogo__caja"
                onSubmit={(e) => {
                    e.preventDefault();
                    alConfirmar(nota.trim());
                }}
            >
                <h2 id="confirmar-envio-titulo">¿Enviar a autorización?</h2>
                <p className="contenidos-dialogo__texto">
                    El Administrador revisará {queSeEnvia} y podrá publicarla, pedirte cambios o rechazarla. Mientras tanto no podrás editarla.
                </p>

                <dl className="contenidos-dialogo__datos">
                    <dt>Folio</dt>
                    <dd>{folio ?? "Se asigna al guardar"}</dd>
                    <dt>Tipo</dt>
                    <dd>{tipo}</dd>
                    <dt>Título</dt>
                    <dd>{titulo || "Sin título"}</dd>
                </dl>

                <div className="contenidos-campo">
                    <label htmlFor="confirmar-envio-nota">Nota para el Administrador (opcional)</label>
                    <textarea
                        id="confirmar-envio-nota"
                        rows={3}
                        placeholder="Ej.: confirmar fecha con Servicios al Público."
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                    />
                </div>

                <div className="contenidos-dialogo__acciones">
                    <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="contenidos-boton contenidos-boton--principal">Enviar a autorización</button>
                </div>
            </form>
        </dialog>
    );
}

export default ConfirmarEnvio;
