import logoGobierno from "../assets/login/logo-gobierno-mexico.png";

// Franja guinda de arriba y pie guinda de abajo; van en todas las páginas
export function FranjaInstitucional() {
    return (
        <header className="franja">
            <p className="franja__titulo">
                GOBIERNO DEL ESTADO DE NAYARIT · CONSEJO ESTATAL PARA LA CULTURA Y LAS ARTES
            </p>
            <p>Colección 165 (por validar)</p>
        </header>
    );
}

export function PieInstitucional() {
    return (
        <footer className="pie">
            <img className="pie__logo" src={logoGobierno} alt="Gobierno de México" />
            <div className="pie__textos">
                <p className="pie__titulo">
                    Biblioteca Solón Argüello · Biblioteca Pública Central Estatal · Tepic, Nayarit
                </p>
                <p className="pie__nota">
                    Logotipo provisional del Gobierno de México (sustituir por el archivo oficial) · Contenido de
                    ejemplo sujeto a validación de la biblioteca.
                </p>
            </div>
        </footer>
    );
}
