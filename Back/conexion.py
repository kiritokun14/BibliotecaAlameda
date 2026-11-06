"""Cliente público de Supabase; las políticas de la BD siguen aplicándose."""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


def crear_cliente() -> Client:
    load_dotenv(Path(__file__).with_name('.env'))
    url = os.getenv('SUPABASE_URL', '').strip()
    clave = os.getenv('SUPABASE_PUBLISHABLE_KEY', '').strip()
    if not url or not clave:
        raise RuntimeError('Falta configurar Back/.env con la URL y clave publicable de Supabase.')
    if not clave.startswith('sb_publishable_'):
        raise RuntimeError('Esta conexión requiere una clave publicable de Supabase.')
    return create_client(url, clave)


def crear_cliente_servicio() -> Client:
    """Cliente con la clave secreta. Solo en el servidor, para enviar invitaciones de Auth."""
    load_dotenv(Path(__file__).with_name('.env'))
    url = os.getenv('SUPABASE_URL', '').strip()
    clave = os.getenv('SUPABASE_SECRET_KEY', '').strip()
    if not url or not clave:
        raise RuntimeError('Falta configurar Back/.env con la URL y la clave secreta de Supabase.')
    if not clave.startswith('sb_secret_'):
        raise RuntimeError('Esta conexión requiere una clave secreta de Supabase.')
    return create_client(url, clave)
