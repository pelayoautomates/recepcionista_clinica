import io
import logging
import re
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from openai import AsyncOpenAI

from config import settings
from database.client import get_supabase
from security import require_admin_key

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_admin_key)])

MAX_CHARS = 40_000  # límite para no enviar demasiado texto al LLM


# ─── Endpoint principal ───────────────────────────────────────────────────────

@router.post("/clinicas/{clinic_id}/configuracion/extraer")
async def extraer_y_generar_prompt(
    clinic_id: UUID,
    url: str | None = Form(default=None),
    archivos: list[UploadFile] = File(default=[]),
):
    """
    Recibe URL y/o archivos de la clínica, extrae el texto,
    llama a GPT-4o para estructurar la info y generar el system prompt.
    """
    textos: list[str] = []

    if url and url.strip():
        try:
            texto_web = await _scrape_url(url.strip())
            textos.append(f"[Sitio web: {url}]\n{texto_web}")
        except Exception as e:
            logger.warning("No se pudo scrapear %s: %s", url, e)

    for archivo in archivos:
        try:
            texto = await _extract_text_from_file(archivo)
            if texto.strip():
                textos.append(f"[Archivo: {archivo.filename}]\n{texto}")
        except Exception as e:
            logger.warning("No se pudo extraer texto de %s: %s", archivo.filename, e)

    if not textos:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto. Comprueba la URL o el formato del archivo.")

    texto_completo = "\n\n---\n\n".join(textos)[:MAX_CHARS]
    resultado = await _generar_con_ia(str(clinic_id), texto_completo)
    return resultado


@router.post("/clinicas/{clinic_id}/configuracion/guardar")
async def guardar_configuracion(clinic_id: UUID, data: dict):
    """Guarda horarios, servicios y prompt personalizado en la clínica."""
    db = get_supabase()
    campos = {}
    if "prompt_personalizado" in data:
        campos["prompt_personalizado"] = data["prompt_personalizado"]
    if "horarios" in data:
        campos["horarios"] = data["horarios"]
    if "servicios" in data:
        campos["servicios"] = data["servicios"]
    if not campos:
        raise HTTPException(status_code=400, detail="No hay datos para guardar")
    result = db.table("clinicas").update(campos).eq("id", str(clinic_id)).execute()
    return result.data[0]


# ─── Extracción de texto ──────────────────────────────────────────────────────

async def _scrape_url(url: str) -> str:
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
    html = r.text
    # Quitar scripts, styles y etiquetas HTML
    html = re.sub(r"<(script|style)[^>]*>.*?</(script|style)>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    html = re.sub(r"&[a-z]+;", " ", html)
    html = re.sub(r"\s{3,}", "\n\n", html)
    return html.strip()[:15_000]


async def _extract_text_from_file(archivo: UploadFile) -> str:
    content = await archivo.read()
    name = (archivo.filename or "").lower()

    if name.endswith(".txt") or name.endswith(".csv") or name.endswith(".md"):
        return content.decode("utf-8", errors="ignore")

    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            raise HTTPException(500, "pypdf no instalado — contacta al administrador")

    if name.endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            raise HTTPException(500, "python-docx no instalado — contacta al administrador")

    if name.endswith(".xlsx") or name.endswith(".xls"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            lines = []
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    fila = [str(c) for c in row if c is not None]
                    if fila:
                        lines.append("\t".join(fila))
            return "\n".join(lines)
        except ImportError:
            # Fallback: try as CSV
            return content.decode("utf-8", errors="ignore")

    # Intento genérico: leer como texto
    return content.decode("utf-8", errors="ignore")


# ─── Generación con IA ────────────────────────────────────────────────────────

_EXTRACTION_PROMPT = """
Eres un asistente experto en configurar recepcionistas virtuales para clínicas.

A partir del siguiente texto sobre una clínica, extrae toda la información relevante y genera:
1. Un resumen estructurado de la clínica
2. Un system prompt completo y profesional para un agente IA que actuará como recepcionista

El system prompt debe:
- Estar escrito en primera persona ("Soy la recepcionista virtual de...")
- Incluir toda la información específica de la clínica (servicios, precios, horarios, ubicación)
- Definir el tono y personalidad del agente
- Incluir instrucciones para gestionar citas, preguntas frecuentes, y cuándo escalar a humano
- Estar en español

Responde EXACTAMENTE en este formato JSON:
{
  "nombre_detectado": "...",
  "resumen": "...",
  "servicios": [{"nombre": "...", "descripcion": "...", "precio": "..."}],
  "horarios": {"lunes": "9:00-18:00", "martes": "...", ...},
  "ubicacion": "...",
  "telefono": "...",
  "web": "...",
  "especialidades": ["...", "..."],
  "faqs": [{"pregunta": "...", "respuesta": "..."}],
  "tono": "profesional/cercano/formal",
  "prompt_generado": "..."
}

Si un campo no se menciona, usa null o array vacío.

TEXTO DE LA CLÍNICA:
"""


async def _generar_con_ia(clinic_id: str, texto: str) -> dict:
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    # Obtener nombre actual de la clínica para contextualizar
    db = get_supabase()
    clinica_res = db.table("clinicas").select("nombre, servicios, horarios").eq("id", clinic_id).single().execute()
    nombre_clinica = clinica_res.data.get("nombre", "la clínica") if clinica_res.data else "la clínica"

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": f"Estás configurando el agente IA para '{nombre_clinica}'. Extrae toda la información útil del texto proporcionado.",
            },
            {
                "role": "user",
                "content": _EXTRACTION_PROMPT + texto,
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    import json
    try:
        resultado = json.loads(response.choices[0].message.content)
    except Exception:
        raise HTTPException(500, "Error al procesar la respuesta de la IA")

    logger.info("Configuración generada por IA para clínica %s", clinic_id)
    return resultado
