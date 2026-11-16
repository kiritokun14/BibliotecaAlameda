import { useEffect, useRef, useState, type ReactNode } from "react";
import "./contenidos/Contenidos.css";
import "./atencion/Atencion.css";
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
    error?: string; // error del servidor al confirmar (se muestra arriba de los botones)
    ocupada?: boolean; // mientras se guarda: desactiva confirmar
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
    error,
    ocupada,
}: VentanaProps) {
    const formulario = useRef<HTMLFormElement>(null);

    // Al abrir, el foco pasa al primer control de la ventana (campo o botón) para quien usa teclado
    useEffect(() => {
        formulario.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    }, []);

    // Escape cierra la ventana
    useEffect(() => {
        function alTeclear(evento: KeyboardEvent) {
            if (evento.key === "Escape") alCerrar();
        }
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [alCerrar]);

    return (
        <div className="at-fondo" onClick={alCerrar}>
            <form
                ref={formulario}
                className={`at-ventana at-ventana--${tono}${angosta ? " at-ventana--angosta" : ""}`}
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
                <div className="at-ventana__cabecera">
                    <span className="at-ventana__icono"><img src={icono} alt="" /></span>
                    <div>
                        <h2 id="ventana-titulo">{titulo}</h2>
                        <p className="contenidos-dialogo__texto">{texto}</p>
                    </div>
                </div>

                {children && <div className="at-ventana__cuerpo">{children}</div>}
                {error && <p className="contenidos-campo__error" role="alert">{error}</p>}

                <div className="contenidos-dialogo__acciones">
                    <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={alCerrar}>
                        {textoCancelar}
                    </button>
                    <button type="submit" disabled={ocupada} className={`contenidos-boton ${tono === "guinda" ? "at-boton--guinda-lleno" : "contenidos-boton--principal"}`}>
                        {textoConfirmar}
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
    tipo?: "texto" | "select" | "fecha" | "hora";
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
                <div key={fila[0].nombre} className="at-ventana__fila">
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
                    <p className="at-subtitulo">Mensajes preparados</p>
                    <div className="contenidos-filtros">
                        {preparados.map((texto) => (
                            <button
                                key={texto}
                                type="button"
                                className={`contenidos-filtro${valores[campoPreparados] === texto ? " contenidos-filtro--activo" : ""}`}
                                aria-pressed={valores[campoPreparados] === texto}
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
    const descripcion = error || campo.ayuda ? `${id}-nota` : undefined;

    return (
        <div className="contenidos-campo">
            <label htmlFor={id}>
                {campo.etiqueta}
                {campo.obligatorio && <span className="contenidos-campo__obligatorio" aria-label="obligatorio"> *</span>}
            </label>

            {campo.tipo === "select" ? (
                <select id={id} value={valor} aria-invalid={!!error} aria-describedby={descripcion} onChange={(e) => alCambiar(e.target.value)}>
                    <option value="">{campo.placeholder}</option>
                    {campo.opciones?.map((opcion) => (
                        <option key={opcion}>{opcion}</option>
                    ))}
                </select>
            ) : (
                <input
                    id={id}
                    type={campo.tipo === "fecha" ? "date" : campo.tipo === "hora" ? "time" : "text"}
                    className={error ? "contenidos-campo--error" : undefined}
                    placeholder={campo.placeholder}
                    value={valor}
                    aria-invalid={!!error}
                    aria-describedby={descripcion}
                    onChange={(e) => alCambiar(e.target.value)}
                />
            )}

            {error && <p id={descripcion} className="contenidos-campo__error">{error}</p>}
            {!error && campo.ayuda && <p id={descripcion} className="contenidos-campo__ayuda">{campo.ayuda}</p>}
        </div>
    );
}
