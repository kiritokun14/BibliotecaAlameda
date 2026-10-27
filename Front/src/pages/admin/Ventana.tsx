import { useEffect, useState, type ReactNode } from "react";
import { MENSAJE_OBLIGATORIO } from "../../servicios/validaciones";

// ---------- Ventana modal base ----------

type TonoVentana = "verde" | "dorado" | "guinda";

type VentanaProps = {
    tono: TonoVentana;
    icono: string;
    titulo: string;
    texto: string;
    textoConfirmar: string;
    textoCancelar?: string;
    angosta?: boolean; // las de solo confirmar son más angostas (620 px)
    alConfirmar: () => void;
    alCerrar: () => void;
    children?: ReactNode;
};

export function Ventana({
    tono,
    icono,
    titulo,
    texto,
    textoConfirmar,
    textoCancelar = "Cancelar",
    angosta,
    alConfirmar,
    alCerrar,
    children,
}: VentanaProps) {
    // Escape cierra la ventana
    useEffect(() => {
        function alTeclear(evento: KeyboardEvent) {
            if (evento.key === "Escape") alCerrar();
        }
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [alCerrar]);

    return (
        <div className="fondo-atenuado" onClick={alCerrar}>
            <form
                className={`ventana ${angosta ? "ventana--angosta" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ventana-titulo"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                    e.preventDefault();
                    alConfirmar();
                }}
                noValidate
            >
                <div className={`ventana__cabecera ventana__cabecera--${tono}`}>
                    <span className="ventana__icono">
                        <img src={icono} alt="" />
                    </span>
                    <div className="ventana__textos">
                        <h2 id="ventana-titulo">{titulo}</h2>
                        <p>{texto}</p>
                    </div>
                </div>

                {children && <div className="ventana__cuerpo">{children}</div>}

                <div className="ventana__pie">
                    <button
                        type="submit"
                        className={`boton-panel boton-panel--grande ${tono === "guinda" ? "boton-panel--guinda" : "boton-panel--verde"}`}
                    >
                        {textoConfirmar}
                    </button>
                    <button type="button" className="boton-panel boton-panel--contorno boton-panel--grande" onClick={alCerrar}>
                        {textoCancelar}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ---------- Ventana con formulario ----------
// Casi todas las ventanas son: un par de campos + "mensajes preparados" + enviar.

export type CampoVentana = {
    nombre: string;
    etiqueta: string;
    tipo?: "texto" | "select" | "fecha";
    obligatorio?: boolean;
    placeholder?: string;
    opciones?: string[];
    ayuda?: string;
    mitad?: boolean; // dos campos "mitad" seguidos quedan en la misma fila
};

type VentanaFormularioProps = Omit<VentanaProps, "alConfirmar" | "children"> & {
    campos: CampoVentana[];
    valoresIniciales?: Record<string, string>;
    preparados?: string[]; // al tocarlos llenan el campo campoPreparados
    campoPreparados?: string;
    alConfirmar: (valores: Record<string, string>) => void;
};

export function VentanaFormulario({
    campos,
    valoresIniciales = {},
    preparados,
    campoPreparados = "mensaje",
    alConfirmar,
    ...resto
}: VentanaFormularioProps) {
    const [valores, setValores] = useState<Record<string, string>>(valoresIniciales);
    const [errores, setErrores] = useState<Record<string, string>>({});

    function cambiar(nombre: string, valor: string) {
        setValores((anteriores) => ({ ...anteriores, [nombre]: valor }));
        setErrores((anteriores) => ({ ...anteriores, [nombre]: "" }));
    }

    function confirmar() {
        const nuevosErrores: Record<string, string> = {};
        for (const campo of campos) {
            if (campo.obligatorio && !valores[campo.nombre]?.trim()) nuevosErrores[campo.nombre] = MENSAJE_OBLIGATORIO;
        }
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length === 0) alConfirmar(valores);
    }

    // Juntamos los campos "mitad" de dos en dos para ponerlos en fila
    const filas: CampoVentana[][] = [];
    for (const campo of campos) {
        const ultima = filas[filas.length - 1];
        if (campo.mitad && ultima?.length === 1 && ultima[0].mitad) ultima.push(campo);
        else filas.push([campo]);
    }

    return (
        <Ventana {...resto} alConfirmar={confirmar}>
            {filas.map((fila) => (
                <div key={fila[0].nombre} className="ventana__fila">
                    {fila.map((campo) => (
                        <CampoFormulario
                            key={campo.nombre}
                            campo={campo}
                            valor={valores[campo.nombre] ?? ""}
                            error={errores[campo.nombre]}
                            alCambiar={(valor) => cambiar(campo.nombre, valor)}
                        />
                    ))}
                </div>
            ))}

            {preparados && (
                <>
                    <p className="ventana__subtitulo">MENSAJES PREPARADOS</p>
                    <div className="filtros">
                        {preparados.map((texto) => (
                            <button
                                key={texto}
                                type="button"
                                className={`filtro ${valores[campoPreparados] === texto ? "filtro--activo" : ""}`}
                                onClick={() => cambiar(campoPreparados, texto)}
                            >
                                {texto}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </Ventana>
    );
}

type CampoFormularioProps = {
    campo: CampoVentana;
    valor: string;
    error?: string;
    alCambiar: (valor: string) => void;
};

function CampoFormulario({ campo, valor, error, alCambiar }: CampoFormularioProps) {
    const id = `campo-${campo.nombre}`;
    const clase = `entrada-panel ${error ? "entrada-panel--error" : ""}`;

    return (
        <div className="campo-panel">
            <label htmlFor={id} className="campo-panel__etiqueta">
                {campo.etiqueta}
                {campo.obligatorio && <span>(obligatorio)</span>}
            </label>

            {campo.tipo === "select" ? (
                <select
                    id={id}
                    className={`${clase} ${valor ? "" : "entrada-panel--vacia"}`}
                    value={valor}
                    onChange={(e) => alCambiar(e.target.value)}
                >
                    <option value="">{campo.placeholder}</option>
                    {campo.opciones?.map((opcion) => (
                        <option key={opcion}>{opcion}</option>
                    ))}
                </select>
            ) : (
                <input
                    id={id}
                    type={campo.tipo === "fecha" ? "date" : "text"}
                    className={clase}
                    placeholder={campo.placeholder}
                    value={valor}
                    onChange={(e) => alCambiar(e.target.value)}
                />
            )}

            {error && <p className="campo-panel__error">{error}</p>}
            {!error && campo.ayuda && <p className="campo-panel__ayuda">{campo.ayuda}</p>}
        </div>
    );
}
