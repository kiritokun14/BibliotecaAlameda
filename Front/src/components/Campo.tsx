import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import iconoOjo from "../assets/login/icono-ojo.svg";
import iconoOjoCerrado from "../assets/login/icono-ojo-cerrado.svg";
import iconoErrorCampo from "../assets/login/icono-error-campo.svg";

// Recibe todo lo que acepta un <input> (value, onChange, placeholder...)
// más la etiqueta, un texto de ayuda y un mensaje de error opcionales.
type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    etiqueta: string;
    ayuda?: string;
    error?: string;
};

// Parte común: etiqueta arriba, caja en medio, ayuda o error abajo
function EstructuraCampo({
    id,
    etiqueta,
    obligatorio,
    ayuda,
    error,
    children,
}: {
    id: string;
    etiqueta: string;
    obligatorio?: boolean;
    ayuda?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="campo">
            <label htmlFor={id} className="campo__etiqueta">
                {etiqueta} <span>{obligatorio ? "(obligatorio)" : "(opcional)"}</span>
            </label>
            <div className={error ? "campo__entrada campo__entrada--error" : "campo__entrada"}>{children}</div>
            {error ? (
                <p className="campo__error" id={`${id}-error`}>
                    <img src={iconoErrorCampo} alt="" />
                    {error}
                </p>
            ) : (
                ayuda && <p className="campo__ayuda">{ayuda}</p>
            )}
        </div>
    );
}

export function Campo({ id, etiqueta, ayuda, error, required, ...props }: CampoProps) {
    return (
        <EstructuraCampo id={id} etiqueta={etiqueta} obligatorio={required} ayuda={ayuda} error={error}>
            <input
                id={id}
                name={id}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                {...props}
            />
        </EstructuraCampo>
    );
}

// Lista desplegable con el mismo aspecto que Campo
type CampoSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    id: string;
    etiqueta: string;
    opciones: string[];
    ayuda?: string;
    error?: string;
};

export function CampoSelect({ id, etiqueta, opciones, ayuda, error, required, ...props }: CampoSelectProps) {
    return (
        <EstructuraCampo id={id} etiqueta={etiqueta} obligatorio={required} ayuda={ayuda} error={error}>
            <select
                id={id}
                name={id}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                {...props}
            >
                <option value="">Selecciona una opción</option>
                {opciones.map((opcion) => (
                    <option key={opcion} value={opcion}>
                        {opcion}
                    </option>
                ))}
            </select>
        </EstructuraCampo>
    );
}

// Igual que Campo, pero con el botón Mostrar/Ocultar.
export function CampoContrasena({ id, etiqueta, ayuda, error, ...props }: Omit<CampoProps, "type" | "required">) {
    const [mostrar, setMostrar] = useState(false);

    return (
        <EstructuraCampo id={id} etiqueta={etiqueta} obligatorio ayuda={ayuda} error={error}>
            <input
                id={id}
                name={id}
                type={mostrar ? "text" : "password"}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                {...props}
            />
            <button type="button" className="boton-mostrar" onClick={() => setMostrar(!mostrar)}>
                <img src={mostrar ? iconoOjoCerrado : iconoOjo} alt="" />
                {mostrar ? "Ocultar" : "Mostrar"}
            </button>
        </EstructuraCampo>
    );
}
