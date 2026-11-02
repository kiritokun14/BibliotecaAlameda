import type { ReactNode } from "react";
import { Link } from "react-router";
import "./Visitante.css";
import circulo1 from "../assets/inicio/portada-circulo-1.svg";
import circulo2 from "../assets/inicio/portada-circulo-2.svg";
import circuloDorado from "../assets/eventos/circulo-grande.svg";
import volverBlanca from "../assets/servicios/volver-blanca.svg";
import flechaBlanca from "../assets/eventos/flecha-blanca.svg";
import flechaOscura from "../assets/eventos/flecha-oscura.svg";
import candado from "../assets/eventos/candado-dorado.svg";
import check from "../assets/servicios/requisito-check.svg";

// Piezas de las páginas que un visitante ve SIN cuenta (Eventos, Credencial, Espacios):
// encabezado con "Volver", aviso para iniciar sesión, "sin cuenta / con cuenta puedes",
// pasos de un trámite y llamado final a crear cuenta.

// ---------- Encabezado verde alineado a la izquierda ----------
export function EncabezadoVisitante({
    regreso,
    etiqueta,
    titulo,
    texto,
}: {
    regreso: { texto: string; ruta: string };
    etiqueta: string;
    titulo: ReactNode; // la parte en <span> va en dorado
    texto: string;
}) {
    return (
        <section className="encabezado-visitante">
            <img className="encabezado-visitante__circulo encabezado-visitante__circulo--1" src={circulo1} alt="" />
            <img className="encabezado-visitante__circulo encabezado-visitante__circulo--2" src={circulo2} alt="" />
            <div className="encabezado-visitante__contenido">
                <Link to={regreso.ruta} className="encabezado-visitante__regreso">
                    <img src={volverBlanca} alt="" />
                    {regreso.texto}
                </Link>
                <span className="etiqueta-inicio">
                    <span className="punto-dorado" />
                    {etiqueta}
                </span>
                <h1>{titulo}</h1>
                <p>{texto}</p>
            </div>
        </section>
    );
}

// ---------- Sección con sobretítulo dorado: "• EL PROCESO / Cómo se solicita…" ----------
export function SeccionVisitante({
    fondo,
    sobretitulo,
    titulo,
    texto,
    children,
}: {
    fondo: "blanco" | "crema" | "verde";
    sobretitulo?: string;
    titulo?: string;
    texto?: string;
    children: ReactNode;
}) {
    return (
        <section className={`seccion-visitante seccion-visitante--${fondo}`}>
            <div className="seccion-visitante__contenido">
                {(sobretitulo || titulo) && (
                    <div className="seccion-visitante__titulos">
                        {sobretitulo && <p className="sobretitulo-visitante"><span className="punto-dorado" />{sobretitulo}</p>}
                        {titulo && <h2>{titulo}</h2>}
                        {texto && <p className="seccion-visitante__texto">{texto}</p>}
                    </div>
                )}
                {children}
            </div>
        </section>
    );
}

// ---------- Aviso dorado "Inicia sesión o crea una cuenta para…" + qué se puede con y sin cuenta ----------
export function AvisoCuenta({
    titulo,
    texto,
    sinCuenta,
    conCuenta,
}: {
    titulo: string;
    texto: string;
    sinCuenta: string[];
    conCuenta: string[];
}) {
    return (
        <div className="aviso-cuenta">
            <div className="aviso-cuenta__principal">
                <span className="aviso-cuenta__icono"><img src={candado} alt="" /></span>
                <div className="aviso-cuenta__textos">
                    <h2>{titulo}</h2>
                    <p>{texto}</p>
                </div>
                <div className="aviso-cuenta__botones">
                    <Link to="/iniciar-sesion" className="boton-visitante">
                        Iniciar sesión <img src={flechaBlanca} alt="" />
                    </Link>
                    <Link to="/crear-cuenta" className="boton-visitante boton-visitante--contorno">
                        Crear cuenta
                    </Link>
                </div>
            </div>

            <div className="aviso-cuenta__puedes">
                <div className="puedes puedes--sin-cuenta">
                    <p className="puedes__titulo">SIN CUENTA PUEDES</p>
                    <ul>
                        {sinCuenta.map((t) => (
                            <li key={t}><span className="puedes__check"><img src={check} alt="" /></span>{t}</li>
                        ))}
                    </ul>
                </div>
                <div className="puedes puedes--con-cuenta">
                    <p className="puedes__titulo">CON CUENTA PUEDES</p>
                    <ul>
                        {conCuenta.map((t) => (
                            <li key={t}><span className="puedes__candado"><img src={candado} alt="" /></span>{t}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// ---------- Pasos numerados ----------
// quien (opcional): pastilla "Tú", "Biblioteca"… para decir quién hace el paso
export function PasosVisitante({ pasos }: { pasos: { titulo: string; texto: string; quien?: string }[] }) {
    return (
        <ol className="pasos-visitante">
            {pasos.map((paso, i) => (
                <li key={paso.titulo}>
                    <span className="pasos-visitante__numero" aria-hidden="true">{i + 1}</span>
                    <h3>{paso.titulo}</h3>
                    <p>{paso.texto}</p>
                    {paso.quien && <span className="pasos-visitante__quien">{paso.quien}</span>}
                </li>
            ))}
        </ol>
    );
}

// ---------- Llamado final verde "Crea tu cuenta" ----------
export function LlamadoVisitante({ titulo, texto }: { titulo: string; texto: string }) {
    return (
        <section className="seccion-visitante seccion-visitante--crema">
            <div className="seccion-visitante__contenido">
                <div className="llamado-visitante">
                    <img className="llamado-visitante__circulo" src={circuloDorado} alt="" />
                    <div className="llamado-visitante__textos">
                        <p className="llamado-visitante__sobretitulo">CREA TU CUENTA</p>
                        <h2>{titulo}</h2>
                        <p>{texto}</p>
                    </div>
                    <div className="llamado-visitante__botones">
                        <Link to="/iniciar-sesion" className="boton-visitante boton-visitante--dorado">
                            Iniciar sesión <img src={flechaOscura} alt="" />
                        </Link>
                        <Link to="/crear-cuenta" className="boton-visitante boton-visitante--claro">
                            Crear cuenta
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
