"""Procesa la cola de avisos de actividades sin modificar el trámite original."""
import logging
import os
import smtplib
import threading
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv

from Back.conexion import crear_cliente_servicio

logger = logging.getLogger(__name__)


class ErrorPreparacionCorreo(Exception):
    """La conexión falló antes de intentar enviar el mensaje."""


def enviar_correo(trabajo, configuracion):
    servidor = None
    try:
        mensaje = EmailMessage()
        mensaje['From'] = configuracion['remitente']
        mensaje['To'] = trabajo['correo']
        mensaje['Subject'] = trabajo['titulo']
        mensaje.set_content(trabajo['cuerpo'])
        servidor = smtplib.SMTP('smtp-relay.brevo.com', 587, timeout=20)
        servidor.ehlo()
        servidor.starttls()
        servidor.ehlo()
        servidor.login(configuracion['usuario'], configuracion['clave'])
    except Exception as error:
        if servidor:
            servidor.close()
        raise ErrorPreparacionCorreo(type(error).__name__) from error
    try:
        servidor.send_message(mensaje)
    finally:
        servidor.close()


def procesar_uno(cliente, configuracion):
    trabajo = cliente.rpc('reclamar_correo_actividad', {}).execute().data
    if not trabajo:
        return False
    estado, detalle = 'enviado', 'Aceptado por el servidor SMTP.'
    try:
        enviar_correo(trabajo, configuracion)
    except ErrorPreparacionCorreo as error:
        estado, detalle = 'fallido', f'No se inició el envío ({error}).'
    except smtplib.SMTPRecipientsRefused:
        estado, detalle = 'fallido', 'El proveedor rechazó el destinatario.'
    except smtplib.SMTPResponseException as error:
        estado, detalle = 'fallido', f'SMTP rechazó el envío (código {error.smtp_code}).'
    except Exception as error:
        # Una desconexión durante el envío puede ocurrir después de su aceptación.
        estado, detalle = 'incierto', f'No se pudo confirmar el resultado ({type(error).__name__}).'
    cliente.rpc('finalizar_correo_actividad', {
        'p_aviso': trabajo['avisoId'], 'p_intento': trabajo['intento'],
        'p_estado': estado, 'p_detalle': detalle,
    }).execute()
    return True


def iniciar_procesador():
    load_dotenv(Path(__file__).with_name('.env'))
    configuracion = {
        'usuario': os.getenv('BREVO_SMTP_USER', '').strip(),
        'clave': os.getenv('BREVO_SMTP_KEY', '').strip(),
        'remitente': os.getenv('BREVO_SENDER_EMAIL', '').strip(),
    }
    detener = threading.Event()
    if not all(configuracion.values()):
        logger.warning('Los avisos por correo están pendientes de configuración SMTP.')
        return detener, None

    def trabajar():
        while not detener.is_set():
            try:
                cliente = crear_cliente_servicio()
                while not detener.is_set() and procesar_uno(cliente, configuracion):
                    pass
            except Exception:
                logger.exception('No fue posible procesar la cola de avisos por correo.')
            detener.wait(30)

    hilo = threading.Thread(target=trabajar, name='correo-actividad', daemon=True)
    hilo.start()
    return detener, hilo
