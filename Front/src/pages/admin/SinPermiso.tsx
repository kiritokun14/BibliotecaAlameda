// Estado «Sin permiso para esta sección» dentro del panel (Figma «Estados del sistema», 583:45548).
// Se muestra cuando la cuenta sí tiene panel pero no la capacidad de la ruta que abrió.
import { useContext } from "react";
import { Link, useLocation } from "react-router";
import PanelLayout from "./PanelLayout";
import { SECCIONES_MENU, seccionDeRuta } from "./menu";
import { ContextoPanel, capacidadPanel, nombresRoles, permisoGlobal } from "../../servicios/accesoPanel";
import "./contenidos/Contenidos.css";
import "./SinPermiso.css";

export default function SinPermiso() {
    const identidad = useContext(ContextoPanel);
    const { pathname } = useLocation();
    // En la barra va el nombre de la sección, como en las demás pantallas (Figma: «Administración»)
    const seccion = seccionDeRuta(pathname);
    // Lo que esta cuenta sí puede abrir, agrupado como en el menú
    const permitidas = SECCIONES_MENU.map((seccion) => ({
        texto: seccion.texto,
        subitems: seccion.subitems.filter((s) => {
            const capacidad = s.capacidad ?? capacidadPanel(s.ruta);
            return capacidad && identidad && permisoGlobal(identidad.acceso, capacidad);
        }),
    })).filter((s) => s.subitems.length > 0);

    return (
        <PanelLayout titulo={seccion} tema="contenidos">
            <div className="sin-permiso">
                <p className="sin-permiso__etiqueta"><span />Acceso</p>
                <h1 className="sin-permiso__titulo">Sin permiso para esta sección</h1>

                <section className="sin-permiso__aviso" role="alert">
                    <span className="sin-permiso__icono" aria-hidden="true">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                    </span>
                    <div>
                        <h2>No puedes ver esta sección</h2>
                        <p>Rol actual: {identidad ? nombresRoles(identidad.acceso) : "Personal de la biblioteca"} · Pide a Administración el permiso si lo necesitas.</p>
                    </div>
                    <span className="sin-permiso__chip"><span />Sin permiso</span>
                </section>

                <section className="sin-permiso__tarjeta">
                    <h2 className="sin-permiso__barra">
                        <span aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                        </span>
                        Qué puedes hacer
                    </h2>
                    <dl className="sin-permiso__filas">
                        <div>
                            <dt>Ver lo que sí puedes hacer</dt>
                            <dd>
                                {permitidas.length ? (
                                    <ul className="sin-permiso__secciones">
                                        {permitidas.map((s) => (
                                            <li key={s.texto}><strong>{s.texto}:</strong>{" "}
                                                {s.subitems.map((sub, i) => <span key={sub.ruta}>{i > 0 && ", "}<Link to={sub.ruta}>{sub.texto}</Link></span>)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : "Resumen del panel"}
                            </dd>
                        </div>
                        <div>
                            <dt>Pedir acceso</dt>
                            {/* TODO backend: no hay endpoint para solicitar permisos; por ahora se pide a Administración por los canales internos */}
                            <dd>Pídelo a una persona con Administración total; el cambio de permisos queda registrado en la bitácora.</dd>
                        </div>
                    </dl>
                </section>

                <div className="sin-permiso__acciones">
                    <Link to="/admin/resumen" className="contenidos-boton contenidos-boton--oscuro">Volver al Resumen</Link>
                    <Link to="/" className="contenidos-boton contenidos-boton--contorno">Ir al portal público</Link>
                </div>
            </div>
        </PanelLayout>
    );
}
