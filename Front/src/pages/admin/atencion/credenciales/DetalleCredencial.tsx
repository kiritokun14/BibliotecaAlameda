import { useState } from "react";
import { Navigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { BotonOpcion, Dato, Datos, ListaCotejo, Tarjeta, type EventoHistorial } from "../../componentes";
import { Ventana, VentanaFormulario } from "../../Ventana";
import DetalleSolicitud, { TarjetaDecision, TarjetaResolucion, type TextosEstado } from "../Detalle";
import { actualizarSolicitud, formatearFecha, useSolicitudes, type Credencial } from "../datos";
import tarjetaUser from "../../../../assets/admin/tarjeta-user.svg";
import tarjetaCheck from "../../../../assets/admin/tarjeta-check.svg";
import opcionInfo from "../../../../assets/admin/opcion-info.svg";
import opcionX from "../../../../assets/admin/opcion-x.svg";
import modalCheck from "../../../../assets/admin/modal-check.svg";
import modalInfo from "../../../../assets/admin/modal-info.svg";
import modalAlerta from "../../../../assets/admin/modal-alert.svg";

const RUTA = "/admin/atencion/credenciales";

const textos: TextosEstado = {
    pendiente: {
        etiqueta: "POR COTEJAR",
        titulo: "Cotejo de datos",
        texto: "Revisa los datos que la persona dio al registrarse y decide. Datos de ejemplo.",
    },
    observaciones: {
        etiqueta: "CON OBSERVACIONES",
        titulo: "Esperando respuesta de la persona",
        texto: "Pediste una corrección. Cuando la persona responda, la solicitud vuelve a Por cotejar. Datos de ejemplo.",
        aviso: {
            tono: "espera",
            titulo: "Corrección solicitada",
            texto: "La persona recibió tu mensaje en sus notificaciones.",
            chip: "Esperando respuesta",
        },
    },
    aprobada: {
        etiqueta: "APROBADA",
        titulo: "Solicitud aprobada",
        texto: "La credencial quedó aprobada. Aquí puedes consultar los datos y el historial. Datos de ejemplo.",
        aviso: {
            tono: "exito",
            titulo: "Credencial aprobada",
            texto: "La persona ya recibió el aviso en sus notificaciones.",
            chip: "Aprobada",
        },
    },
    rechazada: {
        etiqueta: "RECHAZADA",
        titulo: "Solicitud rechazada",
        texto: "La credencial no se aprobó. Aquí puedes consultar el motivo y el historial. Datos de ejemplo.",
        aviso: {
            tono: "error",
            titulo: "Solicitud rechazada",
            texto: "La persona ya recibió el motivo en sus notificaciones.",
            chip: "Rechazada",
        },
    },
};

// Los criterios están por confirmar con la biblioteca
const PUNTOS_COTEJO = [
    { titulo: "Los datos de registro están completos", detalle: "Nombre, tipo de cuenta y contacto capturados." },
    { titulo: "El nombre y los apellidos están bien escritos" },
    { titulo: "El correo y el teléfono son válidos", detalle: "Criterio de validación por confirmar." },
    { titulo: "No hay otra solicitud de la misma persona" },
];

function historial(solicitud: Credencial): EventoHistorial[] {
    const enviada: EventoHistorial = {
        titulo: "Solicitud enviada",
        detalle: `${formatearFecha(solicitud.enviada)} · por la persona`,
        tipo: "hecho",
    };
    const fecha = solicitud.resolucion?.fecha ?? "Hoy";

    switch (solicitud.estado) {
        case "pendiente":
            return [
                enviada,
                { titulo: "Asignada para cotejo", detalle: "21 oct 2026 · Personal de atención (ejemplo)", tipo: "proceso" },
                { titulo: "Sin decisión todavía", detalle: "En espera", tipo: "pendiente" },
            ];
        case "observaciones":
            return [
                enviada,
                { titulo: "Corrección solicitada", detalle: `${fecha} · mensaje enviado`, tipo: "proceso" },
                { titulo: "Respuesta de la persona", detalle: "En espera", tipo: "pendiente" },
            ];
        default:
            return [
                enviada,
                { titulo: "Cotejo de datos", detalle: "22 oct 2026 · datos revisados", tipo: "proceso" },
                {
                    titulo: solicitud.estado === "aprobada" ? "Credencial aprobada" : "Solicitud rechazada",
                    detalle: `${fecha} · por el administrador (ejemplo)`,
                    tipo: "pendiente",
                },
            ];
    }
}

type VentanaAbierta = "aprobar" | "corregir" | "rechazar" | null;

function DetalleCredencial() {
    const { folio } = useParams();
    const solicitudes = useSolicitudes("credenciales");
    const solicitud = solicitudes.find((s) => s.folio === folio);
    const [ventana, setVentana] = useState<VentanaAbierta>(null);

    if (!solicitud) return <Navigate to={RUTA} replace />;

    const resuelta = solicitud.estado === "aprobada" || solicitud.estado === "rechazada";

    function decidir(cambios: Partial<Credencial>) {
        actualizarSolicitud("credenciales", solicitud!.folio, cambios);
        setVentana(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function marcar(indice: number) {
        const cotejo = solicitud!.cotejo.map((valor, i) => (i === indice ? !valor : valor));
        actualizarSolicitud("credenciales", solicitud!.folio, { cotejo });
    }

    const principal = (
        <>
            <Tarjeta
                icono={tarjetaUser}
                titulo="Datos de la solicitud"
                subtitulo="Datos que la persona dio al registrarse y al solicitar su credencial."
            >
                <Datos>
                    <Dato etiqueta="NOMBRE">{solicitud.persona} (ejemplo)</Dato>
                    <Dato etiqueta="TIPO DE CUENTA">
                        {solicitud.tipoCuenta === "Adulta" ? "Persona adulta" : "Persona menor de edad"}
                    </Dato>
                    <Dato etiqueta="ENVIADA">{formatearFecha(solicitud.enviada)}</Dato>
                    <Dato etiqueta="CORREO">{solicitud.correo}</Dato>
                    <Dato etiqueta="TELÉFONO">{solicitud.telefono}</Dato>
                    <Dato etiqueta="FOLIO">{solicitud.folio}</Dato>
                </Datos>
            </Tarjeta>

            <Tarjeta
                icono={tarjetaCheck}
                titulo="Lista de cotejo"
                subtitulo="Marca cada punto al revisarlo. Los criterios están por confirmar con la biblioteca."
            >
                <ListaCotejo puntos={PUNTOS_COTEJO} marcados={solicitud.cotejo} alCambiar={resuelta ? undefined : marcar} />
            </Tarjeta>
        </>
    );

    const decision = resuelta ? (
        <TarjetaResolucion estado={solicitud.estado} resolucion={solicitud.resolucion} rutaBandeja={RUTA} />
    ) : (
        <TarjetaDecision
            subtitulo="Elige una acción para esta solicitud."
            aprobar={{ texto: "Aprobar credencial", alPresionar: () => setVentana("aprobar") }}
            opciones={
                <BotonOpcion icono={opcionInfo} alPresionar={() => setVentana("corregir")}>
                    Pedir corrección
                </BotonOpcion>
            }
            peligro={
                <BotonOpcion icono={opcionX} peligro alPresionar={() => setVentana("rechazar")}>
                    Rechazar solicitud
                </BotonOpcion>
            }
            nota="Al pedir corrección o rechazar, la persona recibe el motivo en sus notificaciones."
        />
    );

    const cerrar = () => setVentana(null);

    return (
        <PanelLayout titulo="Atención">
            <DetalleSolicitud
                area="credenciales"
                solicitud={solicitud}
                textos={textos}
                prefijo="SOLICITUD"
                volver={{ texto: "Volver a solicitudes de credencial", ruta: RUTA }}
                historial={historial(solicitud)}
                principal={principal}
                decision={decision}
            />

            {ventana === "aprobar" && (
                <Ventana
                    tono="verde"
                    icono={modalCheck}
                    titulo="¿Aprobar esta credencial?"
                    texto={`Se aprobará la solicitud ${solicitud.folio} y la persona recibirá un aviso en sus notificaciones.`}
                    textoConfirmar="Sí, aprobar credencial"
                    textoCancelar="Revisar de nuevo"
                    angosta
                    alConfirmar={() => decidir({ estado: "aprobada", resolucion: { fecha: "Hoy" } })}
                    alCerrar={cerrar}
                />
            )}

            {ventana === "corregir" && (
                <VentanaFormulario
                    tono="dorado"
                    icono={modalInfo}
                    titulo="Pedir corrección"
                    texto="La persona recibirá tu mensaje, podrá corregir sus datos y la solicitud volverá a cotejo."
                    textoConfirmar="Enviar corrección"
                    campos={[
                        {
                            nombre: "motivo",
                            etiqueta: "¿Qué debe corregir?",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un dato",
                            opciones: ["Nombre", "Tipo de cuenta", "Correo", "Teléfono", "Otro dato"],
                        },
                        {
                            nombre: "mensaje",
                            etiqueta: "Mensaje para la persona",
                            obligatorio: true,
                            placeholder: "Indica qué dato debe corregir",
                        },
                    ]}
                    preparados={["Falta completar un dato de registro", "El correo parece incorrecto"]}
                    alConfirmar={(valores) =>
                        decidir({ estado: "observaciones", resolucion: { fecha: "Hoy", ...valores } })
                    }
                    alCerrar={cerrar}
                />
            )}

            {ventana === "rechazar" && (
                <VentanaFormulario
                    tono="guinda"
                    icono={modalAlerta}
                    titulo="Rechazar solicitud"
                    texto="Explica el motivo. La persona lo verá en sus notificaciones y podrá volver a solicitar."
                    textoConfirmar="Sí, rechazar solicitud"
                    campos={[
                        {
                            nombre: "motivo",
                            etiqueta: "Motivo del rechazo",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un motivo",
                            opciones: ["Datos incompletos", "Los datos no coinciden", "Solicitud duplicada", "Otro motivo"],
                        },
                        {
                            nombre: "mensaje",
                            etiqueta: "Mensaje para la persona",
                            obligatorio: true,
                            placeholder: "Escribe una explicación breve y clara",
                            ayuda: "Evita incluir datos personales de terceros.",
                        },
                    ]}
                    alConfirmar={(valores) => decidir({ estado: "rechazada", resolucion: { fecha: "Hoy", ...valores } })}
                    alCerrar={cerrar}
                />
            )}
        </PanelLayout>
    );
}

export default DetalleCredencial;
