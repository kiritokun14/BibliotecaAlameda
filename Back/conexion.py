"""Conexión de Supabase con clave publicable."""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


def crear_cliente() -> Client:
    load_dotenv(Path(__file__).with_name(".env"))
    url = os.getenv("SUPABASE_URL", "").strip()
    clave = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()

    if not url or not clave:
        raise RuntimeError("Falta configurar Back/.env con los datos de Supabase.")
    if not clave.startswith("sb_publishable_"):
        raise RuntimeError("Se requiere una clave publicable de Supabase.")

    return create_client(url, clave)
