import { Link } from "react-router";
import { Bloque, Etiqueta } from "./Bloque";
import foto from "../../../assets/comun/fotos/cuenta-foto.webp";
import circulo1 from "../../../assets/inicio/cuenta-circulo-1.svg";
import circulo2 from "../../../assets/inicio/cuenta-circulo-2.svg";
import textura from "../../../assets/inicio/cuenta-textura.svg";
import iconoEtiqueta from "../../../assets/inicio/etiqueta-usuarios.svg";
import logoSolon from "../../../assets/comun/logos/logo-solon-arguello-pie.png";

// Bloque «Crea tu cuenta y tramita tu credencial» del inicio (Aldahir, 21 nov 2026: rehecho).
// Sin sesión invita a crear la cuenta; con sesión se vuelve «Consulta tu credencial» y lleva al trámite.
const textos = {
    visitante: {
        etiqueta: "Tu cuenta",
        titulo: <>Crea tu cuenta y <span>tramita tu credencial</span></>,
        texto: "Con tu cuenta solicitas tu credencial, reservas espacios, te inscribes a actividades y propones las tuyas.",
        pasos: [
            { titulo: "Crea tu cuenta", texto: "Con tu correo, en unos minutos." },
            { titulo: "Solicita tu credencial", texto: "En línea, desde el portal." },
            { titulo: "Recógela", texto: "En Préstamos, con tu identificación." },
        ],
        principal: { texto: "Crear cuenta", ruta: "/crear-cuenta" },
        secundario: { texto: "Ya tengo cuenta", ruta: "/iniciar-sesion" },
    },
    sesion: {
        etiqueta: "Tu credencial",
        titulo: <>Consulta tu <span>credencial</span></>,
        texto: "Revisa en qué paso va tu trámite, qué llevar al cotejo y hasta cuándo está vigente tu credencial.",
        pasos: [
            { titulo: "Revisa tu trámite", texto: "Ve en qué paso va tu solicitud." },
            { titulo: "Lleva tu identificación", texto: "Al cotejo en Préstamos." },
            { titulo: "Úsala", texto: "En préstamos, espacios y actividades." },
        ],
        principal: { texto: "Ver mi credencial", ruta: "/credencial" },
        secundario: { texto: "Ir a Mi perfil", ruta: "/mi-perfil" },
    },
};

// Dibujo del código QR de muestra: cada fila dice qué cuadritos (0 a 8) van rellenos
const filasQr = [
    [0, 1, 2, 4, 6, 7, 8],
    [0, 2, 5, 6, 8],
    [0, 1, 2, 4, 5, 6, 7, 8],
    [2, 3, 7],
    [0, 4, 5, 8],
    [2, 3, 6],
    [0, 1, 2, 3, 6],
    [0, 2, 4, 6],
    [0, 1, 2, 3, 5, 6],
];

function CodigoQr() {
    return (
        <div className="codigo-qr">
            {filasQr.flatMap((fila, y) =>
                Array.from({ length: 9 }, (_, x) => (
                    <span key={`${x}-${y}`} className={fila.includes(x) ? "codigo-qr__lleno" : undefined} />
                )),
            )}
        </div>
    );
}

function LlamadoCuenta({ sesion = false }: { sesion?: boolean }) {
    const t = sesion ? textos.sesion : textos.visitante;
    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" className="llamado" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 380, alto: 260 }}>
                <div className="llamado__texto">
                    <Etiqueta icono={iconoEtiqueta}>{t.etiqueta}</Etiqueta>
                    <h2 className="titulo-seccion titulo-seccion--grande">{t.titulo}</h2>
                    <p className="texto-seccion">{t.texto}</p>
                    <ol className="llamado__pasos">
                        {t.pasos.map((paso, i) => (
                            <li key={paso.titulo} className="llamado__paso">
                                <span className="llamado__numero" aria-hidden="true">{i + 1}</span>
                                <strong>{paso.titulo}</strong>
                                <span>{paso.texto}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="llamado__botones">
                        <Link to={t.principal.ruta} className="boton-dorado">{t.principal.texto}</Link>
                        <Link to={t.secundario.ruta} className="boton-contorno boton-contorno--alto">{t.secundario.texto}</Link>
                    </div>
                </div>

                <div className="llamado__visual" aria-hidden="true">
                    <div className="llamado__foto"><img src={foto} alt="" loading="lazy" decoding="async" /></div>
                    <div className="credencial-muestra">
                        <div className="credencial-muestra__encabezado">
                            <img src={logoSolon} alt="" />
                            <span>Credencial de lector</span>
                        </div>
                        <div className="credencial-muestra__cuerpo">
                            <div>
                                <strong>Tu nombre</strong>
                                <p>Tepic, Nayarit</p>
                                <p className="credencial-muestra__vigencia"><span />Vigente por 2 años</p>
                            </div>
                            <CodigoQr />
                        </div>
                        <div className="credencial-muestra__banda" />
                    </div>
                </div>
            </Bloque>
        </section>
    );
}

export default LlamadoCuenta;
