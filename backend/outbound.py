"""Validaciones comunes para destinos HTTP configurables por clientes."""

import ipaddress
import socket
from urllib.parse import urlparse


def validate_public_http_url(url: str, *, https_only: bool = False) -> str:
    """Rechaza credenciales, puertos no web y cualquier IP privada/reservada."""
    parsed = urlparse((url or "").strip())
    allowed_schemes = {"https"} if https_only else {"http", "https"}
    if parsed.scheme not in allowed_schemes or not parsed.hostname:
        raise ValueError("URL HTTP publica no valida")
    if parsed.username or parsed.password:
        raise ValueError("La URL no puede incluir credenciales")
    if parsed.port not in (None, 80, 443):
        raise ValueError("Puerto no permitido")

    try:
        addresses = {
            info[4][0]
            for info in socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
        }
    except OSError as exc:
        raise ValueError("El host no se puede resolver") from exc

    if not addresses:
        raise ValueError("El host no se puede resolver")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise ValueError("La URL apunta a una red privada o reservada")
    return parsed.geturl()
