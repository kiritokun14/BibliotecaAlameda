import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import Aviso from "../components/Aviso";
import { Campo, CampoContrasena, CampoSelect } from "../components/Campo";
import { VistaMenor, VistaSolicitudEnviada } from "./CrearCuentaMenor";
import { crearCuenta } from "../servicios/auth";
import { calcularEdad, esCorreoValido, tieneDigitos, MENSAJE_CORREO, MENSAJE_OBLIGATORIO } from "../servicios/validaciones";
import iconoFlechaDer from "../assets/login/icono-flecha-der.svg";
import iconoCargando from "../assets/login/icono-cargando.svg";
import iconoErrorCampo from "../assets/login/icono-error-campo.svg";

const beneficiosCrearCuenta = [
    "Completa tus datos",
    "Confirma tu correo",
    "Inicia sesión y continúa",
];

// Un solo objeto con todos los campos; cada <input> usa su id como "name"
const datosIniciales = {
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    fechaNacimiento: "",
    telefono: "",
    calle: "",
    numeroExterior: "",
    numeroInterior: "",
    colonia: "",
    codigoPostal: "",
    municipio: "",
    estado: "Nayarit",
    // Solo se piden si es menor de edad
    tutorNombre: "",
    tutorApellidos: "",
    tutorTelefono: "",
    tutorCorreo: "",
    tutorRelacion: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
};

type Datos = typeof datosIniciales;
type Errores = Partial<Record<keyof Datos | "privacidad", string>>;

const obligatorios: (keyof Datos)[] = [
    "nombre", "primerApellido", "fechaNacimiento", "telefono", "calle", "numeroExterior",
    "colonia", "codigoPostal", "municipio", "estado", "correo", "contrasena", "confirmarContrasena",
];
const obligatoriosTutor: (keyof Datos)[] = [
    "tutorNombre", "tutorApellidos", "tutorTelefono", "tutorCorreo", "tutorRelacion",
];

function validar(datos: Datos, aceptaPrivacidad: boolean, conTutor: boolean): Errores {
    const errores: Errores = {};

    // Primero: ¿falta algo obligatorio?
    const requeridos = conTutor ? [...obligatorios, ...obligatoriosTutor] : obligatorios;
    for (const campo of requeridos) {
        if (datos[campo].trim() === "") errores[campo] = MENSAJE_OBLIGATORIO;
    }

    // Después: ¿lo que escribió tiene el formato correcto?
    if (datos.telefono && !tieneDigitos(datos.telefono, 10)) errores.telefono = "El teléfono debe tener 10 dígitos.";
    if (datos.codigoPostal && !tieneDigitos(datos.codigoPostal, 5)) errores.codigoPostal = "El código postal debe tener 5 dígitos.";
    if (datos.correo && !esCorreoValido(datos.correo)) errores.correo = MENSAJE_CORREO;
    if (datos.contrasena && datos.contrasena.length < 8) errores.contrasena = "Al menos 8 caracteres.";
    if (datos.confirmarContrasena && datos.confirmarContrasena !== datos.contrasena) {
        errores.confirmarContrasena = "Debe ser igual a la contraseña.";
    }
    if (conTutor) {
        if (datos.tutorTelefono && !tieneDigitos(datos.tutorTelefono, 10)) errores.tutorTelefono = "El teléfono debe tener 10 dígitos.";
        if (datos.tutorCorreo && !esCorreoValido(datos.tutorCorreo)) errores.tutorCorreo = MENSAJE_CORREO;
    }
    if (!aceptaPrivacidad) errores.privacidad = "Para continuar, confirma que leíste el aviso de privacidad.";

    return errores;
}

// Qué se ve: el formulario, el aviso de "eres menor" o "solicitud enviada al tutor"
type Vista = "formulario" | "menor" | "solicitud-enviada";

function CrearCuenta() {
    const [datos, setDatos] = useState(datosIniciales);
    const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
    const [errores, setErrores] = useState<Errores>({});
    const [enviando, setEnviando] = useState(false);
    const [vista, setVista] = useState<Vista>("formulario");
    // true cuando el menor ya vio el aviso y eligió "Continuar con datos del tutor"
    const [pidiendoTutor, setPidiendoTutor] = useState(false);
    const navigate = useNavigate();

    const esMenor = datos.fechaNacimiento !== "" && calcularEdad(datos.fechaNacimiento) < 18;
    const conTutor = esMenor && pidiendoTutor;

    // Sirve para todos los campos: actualiza solo el que cambió
    function cambiar(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setDatos({ ...datos, [e.target.name]: e.target.value });
    }

    function irA(nuevaVista: Vista, enfocar?: string) {
        setVista(nuevaVista);
        window.scrollTo({ top: 0 });
        // Esperamos a que React dibuje el formulario para poder enfocar el campo
        if (enfocar) setTimeout(() => document.getElementById(enfocar)?.focus(), 0);
    }

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const nuevosErrores = validar(datos, aceptaPrivacidad, conTutor);
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) {
            window.scrollTo({ top: 0, behavior: "smooth" }); // para que vea el aviso rojo
            return;
        }

        // Es menor y todavía no ha dado los datos del tutor: primero se le avisa
        if (esMenor && !pidiendoTutor) {
            irA("menor");
            return;
        }

        setEnviando(true);
        const resultado = await crearCuenta(datos.correo);
        setEnviando(false);

        if (resultado === "correo-registrado") navigate("/crear-cuenta/correo-registrado");
        else if (conTutor) irA("solicitud-enviada");
        else navigate("/confirma-tu-correo", { state: { correo: datos.correo } });
    }

    if (vista === "menor") {
        return (
            <VistaMenor
                onContinuar={() => {
                    setPidiendoTutor(true);
                    irA("formulario", "tutorNombre");
                }}
                onCambiarFecha={() => irA("formulario", "fechaNacimiento")}
            />
        );
    }

    if (vista === "solicitud-enviada") {
        return <VistaSolicitudEnviada onCorregirTutor={() => irA("formulario", "tutorNombre")} />;
    }

    return (
        <AccesoLayout
            titulo={<>Crea tu <span>cuenta</span></>}
            texto="Regístrate para usar los servicios de la biblioteca."
            beneficios={beneficiosCrearCuenta}
        >
            <form className="tarjeta tarjeta--ancha" onSubmit={enviar} noValidate>
                <div className="tarjeta__encabezado">
                    <h2>Crear cuenta</h2>
                    <p>Completa tus datos. Los campos obligatorios están marcados.</p>
                </div>

                {Object.keys(errores).length > 0 && (
                    <Aviso tipo="error" titulo="Revisa los datos marcados">
                        Corrígelos y vuelve a enviar. Lo que escribiste se conserva.
                    </Aviso>
                )}
                {conTutor && (
                    <Aviso tipo="info" titulo="Eres menor de 18 años">
                        Por eso necesitamos los datos de contacto de tu madre, padre o tutor. No se crea una cuenta
                        para esa persona.
                    </Aviso>
                )}

                <p className="seccion">DATOS PERSONALES</p>
                <div className="fila">
                    <Campo id="nombre" etiqueta="Nombre(s)" placeholder="Escribe tu nombre"
                        value={datos.nombre} onChange={cambiar} error={errores.nombre} required />
                    <Campo id="primerApellido" etiqueta="Primer apellido" placeholder="Escribe tu primer apellido"
                        value={datos.primerApellido} onChange={cambiar} error={errores.primerApellido} required />
                </div>
                <div className="fila">
                    <Campo id="segundoApellido" etiqueta="Segundo apellido" placeholder="Si lo tienes"
                        value={datos.segundoApellido} onChange={cambiar} />
                    <Campo id="fechaNacimiento" etiqueta="Fecha de nacimiento" type="date"
                        ayuda="Con ella calculamos si necesitas registrar a un responsable."
                        value={datos.fechaNacimiento} onChange={cambiar} error={errores.fechaNacimiento} required />
                </div>
                <Campo id="telefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos"
                    inputMode="numeric" maxLength={10}
                    ayuda="Dato de contacto; no sustituye al correo."
                    value={datos.telefono} onChange={cambiar} error={errores.telefono} required />

                <p className="seccion">DOMICILIO</p>
                <div className="fila">
                    <Campo id="calle" etiqueta="Calle" placeholder="Nombre de la calle"
                        value={datos.calle} onChange={cambiar} error={errores.calle} required />
                    <Campo id="numeroExterior" etiqueta="Número exterior" placeholder="Número o «sin número»"
                        value={datos.numeroExterior} onChange={cambiar} error={errores.numeroExterior} required />
                </div>
                <div className="fila">
                    <Campo id="numeroInterior" etiqueta="Número interior" placeholder="Si existe"
                        value={datos.numeroInterior} onChange={cambiar} />
                    <Campo id="colonia" etiqueta="Colonia o localidad" placeholder="Escribe la colonia o localidad"
                        value={datos.colonia} onChange={cambiar} error={errores.colonia} required />
                </div>
                <div className="fila">
                    <Campo id="codigoPostal" etiqueta="Código postal" placeholder="5 dígitos"
                        inputMode="numeric" maxLength={5}
                        value={datos.codigoPostal} onChange={cambiar} error={errores.codigoPostal} required />
                    <Campo id="municipio" etiqueta="Municipio" placeholder="Escribe el municipio"
                        value={datos.municipio} onChange={cambiar} error={errores.municipio} required />
                </div>
                <Campo id="estado" etiqueta="Estado" value={datos.estado} onChange={cambiar}
                    error={errores.estado} required />

                {conTutor && (
                    <>
                        <p className="seccion">DATOS DE LA MADRE, PADRE O TUTOR</p>
                        <div className="fila">
                            <Campo id="tutorNombre" etiqueta="Nombre(s)" placeholder="Nombre(s) del responsable"
                                value={datos.tutorNombre} onChange={cambiar} error={errores.tutorNombre} required />
                            <Campo id="tutorApellidos" etiqueta="Apellidos" placeholder="Primer y segundo apellido, si existe"
                                value={datos.tutorApellidos} onChange={cambiar} error={errores.tutorApellidos} required />
                        </div>
                        <div className="fila">
                            <Campo id="tutorTelefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos"
                                inputMode="numeric" maxLength={10}
                                value={datos.tutorTelefono} onChange={cambiar} error={errores.tutorTelefono} required />
                            <Campo id="tutorCorreo" etiqueta="Correo electrónico" type="email"
                                placeholder="responsable@ejemplo.mx"
                                ayuda="Solo es un contacto; no recibe acceso a tu cuenta."
                                value={datos.tutorCorreo} onChange={cambiar} error={errores.tutorCorreo} required />
                        </div>
                        <CampoSelect id="tutorRelacion" etiqueta="Relación con la persona menor"
                            opciones={["Madre", "Padre", "Tutor o tutora"]} ayuda="Madre, padre o tutor."
                            value={datos.tutorRelacion} onChange={cambiar} error={errores.tutorRelacion} required />
                    </>
                )}

                <p className="seccion">DATOS DE ACCESO A TU CUENTA</p>
                <Campo id="correo" etiqueta="Correo electrónico" type="email" placeholder="nombre@ejemplo.mx"
                    ayuda="Lo usarás para iniciar sesión y recuperar tu acceso."
                    value={datos.correo} onChange={cambiar} error={errores.correo} required />
                <div className="fila">
                    <CampoContrasena id="contrasena" etiqueta="Contraseña" placeholder="Mínimo 8 caracteres"
                        ayuda="Al menos 8 caracteres."
                        value={datos.contrasena} onChange={cambiar} error={errores.contrasena} />
                    <CampoContrasena id="confirmarContrasena" etiqueta="Confirmar contraseña"
                        placeholder="Repite tu contraseña"
                        value={datos.confirmarContrasena} onChange={cambiar} error={errores.confirmarContrasena} />
                </div>

                <div className="casilla-con-error">
                    <label className="casilla">
                        <input
                            type="checkbox"
                            checked={aceptaPrivacidad}
                            onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                        />
                        He leído el aviso de privacidad (texto por confirmar)
                    </label>
                    {errores.privacidad && (
                        <p className="campo__error">
                            <img src={iconoErrorCampo} alt="" />
                            {errores.privacidad}
                        </p>
                    )}
                </div>

                <button type="submit" className="boton-principal" disabled={enviando}>
                    {enviando ? "Creando tu cuenta…" : "Crear cuenta"}
                    <img src={enviando ? iconoCargando : iconoFlechaDer} className={enviando ? "girando" : undefined} alt="" />
                </button>
                {enviando && (
                    <p className="nota-enviando" role="status">
                        Estamos creando tu cuenta. No cierres esta ventana.
                    </p>
                )}

                <div className="tarjeta__pie tarjeta__pie--sin-linea">
                    <p>
                        ¿Ya tienes cuenta?{" "}
                        <Link to="/iniciar-sesion" className="enlace">
                            Iniciar sesión
                        </Link>
                    </p>
                    <p className="tarjeta__ayuda">
                        ¿Necesitas ayuda para registrarte? El personal de Servicios Digitales puede apoyarte en
                        la biblioteca.
                    </p>
                </div>
            </form>
        </AccesoLayout>
    );
}

export default CrearCuenta;
