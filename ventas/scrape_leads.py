#!/usr/bin/env python3
"""Genera la lista de leads para validar Atiende 360 llamando a negocios locales.

Fuente: Apify, actor compass/crawler-google-places.
Salida: leads_atiende360.csv listo para ir tachando durante las llamadas.

Uso:
    export APIFY_TOKEN=apify_api_xxx
    python scrape_leads.py
    python scrape_leads.py --municipios "Majadahonda" "Las Rozas de Madrid" "Pozuelo de Alarcon"
    python scrape_leads.py --max-por-busqueda 40 --out mi_lista.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter

APIFY_API = "https://api.apify.com/v2"
ACTOR_ID = "compass~crawler-google-places"

# Sin dental ni veterinaria a proposito: Gesden / Qvet dominan esos sectores, no tienen
# API publica y Atiende 360 hoy solo integra Google Calendar. Un "si" de ahi no valida nada.
BUSQUEDAS = [
    "clinica estetica",
    "medicina estetica",
    "depilacion laser",
    "clinica capilar",
    "centro de estetica",
    "fisioterapia",
    "osteopatia",
    "podologia",
    "psicologo",
    "clinica de psicologia",
    "nutricionista",
]

MUNICIPIOS_DEFECTO = ["Majadahonda"]

# Prioridad A: cita con valor alto, recurrencia y el profesional atiende mientras suena
# el telefono. Prioridad B: mas volumen de solos, menos llamadas entrantes.
PRIORIDAD_A = {
    "clinica estetica",
    "medicina estetica",
    "depilacion laser",
    "clinica capilar",
    "centro de estetica",
    "fisioterapia",
    "osteopatia",
    "podologia",
}

# Marcas con central propia: no deciden en la recepcion, no sirven para validar.
CADENAS_CONOCIDAS = {
    "hedonai", "clinicas dorsia", "dorsia", "clinicas ceres", "laserum",
    "centros unico", "body factory", "hospital quironsalud",
    "quironsalud", "sanitas", "vithas", "hm hospitales", "clinica baviera",
    "corporacion dermoestetica", "mediestetic", "clinicas zurich",
}

TRATAMIENTOS = (
    "dr", "dra", "doctor", "doctora", "don", "dona", "lic", "licenciada"
)

# Nombres de pila frecuentes en Espana. Es el indicador mas fiable de que detras del
# negocio hay una persona fisica; "Bella Piel" no es un nombre, "Juan Perez" si.
NOMBRES_ES = {
    "antonio", "jose", "manuel", "francisco", "juan", "david", "javier", "daniel",
    "carlos", "miguel", "rafael", "pedro", "angel", "alejandro", "fernando", "sergio",
    "pablo", "jorge", "alberto", "luis", "alvaro", "adrian", "diego", "raul", "ivan",
    "ruben", "enrique", "oscar", "ramon", "andres", "joaquin", "vicente", "santiago",
    "victor", "mario", "eduardo", "roberto", "jaime", "gonzalo", "ignacio", "marcos",
    "hector", "guillermo", "nicolas", "emilio", "julio", "cesar", "tomas", "gabriel",
    "maria", "carmen", "ana", "isabel", "laura", "cristina", "marta", "dolores",
    "pilar", "lucia", "elena", "sara", "paula", "raquel", "patricia", "silvia",
    "beatriz", "rosa", "julia", "irene", "alba", "eva", "nuria", "sonia", "monica",
    "andrea", "natalia", "claudia", "sandra", "susana", "teresa", "angela", "rocio",
    "yolanda", "veronica", "noelia", "alicia", "clara", "esther", "lorena", "miriam",
    "gloria", "olga", "victoria", "amparo", "consuelo", "blanca", "nerea", "aitana",
    "sofia", "valeria", "carla", "ines", "celia", "adriana", "diana", "belen",
}

PALABRAS_NEGOCIO = {
    "clinica", "clinicas", "centro", "centros", "instituto", "consulta",
    "consultorio", "gabinete", "estetica", "medicina", "medico", "salud",
    "fisioterapia", "fisio", "osteopatia", "podologia", "psicologia",
    "psicologo", "psicologos", "nutricion", "nutricionista", "dietetica",
    "laser", "depilacion", "capilar", "belleza", "spa", "wellness", "studio",
    "sl", "slu", "sa", "sociedad", "grupo", "asociados", "and", "y", "de",
    "del", "la", "el", "los", "las", "en", "por", "para", "madrid",
}


def sin_tildes(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto or "")
        if unicodedata.category(c) != "Mn"
    ).lower().strip()


def normaliza_telefono(bruto: str | None) -> str:
    """Devuelve el telefono en E.164 espanol, o cadena vacia si no es valido."""
    if not bruto:
        return ""
    digitos = re.sub(r"\D", "", bruto)
    if digitos.startswith("0034"):
        digitos = digitos[4:]
    elif digitos.startswith("34") and len(digitos) == 11:
        digitos = digitos[2:]
    if len(digitos) != 9 or digitos[0] not in "6789":
        return ""  # extranjero o basura
    if digitos[:2] in ("80", "90"):
        return ""  # 900/902/800/806: centralita de cadena o numero de tarificacion
    return f"+34{digitos}"


def es_movil(tel_e164: str) -> bool:
    return bool(tel_e164) and tel_e164[3] in "67"


def parece_autonomo(nombre: str) -> bool:
    """Heuristica: el nombre del negocio es el nombre de una persona.

    Importa por lo legal, no por lo comercial: si detras hay una persona fisica, su
    telefono es dato personal y la llamada comercial en frio no esta amparada
    (LGT 11/2022 art. 66). A esos se les visita, no se les llama.
    Es una heuristica, no un veredicto: revisa la columna antes de marcar.
    """
    limpio = sin_tildes(nombre)
    tokens = [t for t in re.split(r"[^a-z0-9]+", limpio) if t]
    if not tokens:
        return False
    if any(t in TRATAMIENTOS for t in tokens):
        return True
    # Un nombre de pila reconocible entre las palabras no genericas: "Fisioterapia Juan
    # Perez" si, "Clinica Estetica Bella Piel" no. Prefiero fallar hacia LLAMAR y apoyarme
    # ademas en el filtro de movil, que caza al profesional solo aunque el nombre no cante.
    restantes = [t for t in tokens if t not in PALABRAS_NEGOCIO and len(t) > 2]
    return any(t in NOMBRES_ES for t in restantes) and len(restantes) <= 4


def es_cadena(nombre: str, nombres_repetidos: set[str]) -> bool:
    limpio = sin_tildes(nombre)
    if limpio in nombres_repetidos:
        return True
    return any(cadena in limpio for cadena in CADENAS_CONOCIDAS)


def apify_post(ruta: str, token: str, cuerpo: dict) -> dict:
    url = f"{APIFY_API}{ruta}?token={urllib.parse.quote(token)}"
    datos = json.dumps(cuerpo).encode()
    req = urllib.request.Request(
        url, data=datos, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def apify_get(ruta: str, token: str) -> dict | list:
    url = f"{APIFY_API}{ruta}?token={urllib.parse.quote(token)}"
    with urllib.request.urlopen(url, timeout=120) as resp:
        return json.loads(resp.read())


def lanza_run(token: str, municipio: str, max_por_busqueda: int) -> list[dict]:
    """Lanza un run del actor para un municipio y espera a que termine."""
    entrada = {
        "searchStringsArray": BUSQUEDAS,
        "locationQuery": f"{municipio}, Madrid, Espana",
        "maxCrawledPlacesPerSearch": max_por_busqueda,
        "language": "es",
        "skipClosedPlaces": True,
        "scrapePlaceDetailPage": False,
        "scrapeContacts": False,
        "maximumLeadsEnrichmentRecords": 0,
    }
    print(f"  lanzando run para {municipio}...", flush=True)
    run = apify_post(f"/acts/{ACTOR_ID}/runs", token, entrada)["data"]
    run_id = run["id"]

    espera, limite = 5, 15 * 60
    transcurrido = 0
    while transcurrido < limite:
        time.sleep(espera)
        transcurrido += espera
        estado = apify_get(f"/actor-runs/{run_id}", token)["data"]["status"]
        if estado in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
        print(f"  ... {estado} ({transcurrido}s)", flush=True)
    else:
        raise TimeoutError(f"El run {run_id} no termino en {limite}s")

    if estado != "SUCCEEDED":
        raise RuntimeError(f"El run {run_id} termino en estado {estado}")

    items = apify_get(f"/datasets/{run['defaultDatasetId']}/items", token)
    print(f"  {municipio}: {len(items)} resultados en bruto", flush=True)
    return items


def construye_filas(items: list[dict], municipios: list[str]) -> list[dict]:
    municipios_norm = {sin_tildes(m) for m in municipios}

    # Primera pasada: dedupe por placeId y cuenta nombres repetidos (senal de cadena).
    por_place_id: dict[str, dict] = {}
    for it in items:
        pid = it.get("placeId") or it.get("place_id")
        if pid and pid not in por_place_id:
            por_place_id[pid] = it

    cuenta_nombres = Counter(sin_tildes(it.get("title", "")) for it in por_place_id.values())
    repetidos = {n for n, c in cuenta_nombres.items() if c > 1 and n}

    filas: list[dict] = []
    telefonos_vistos: set[str] = set()
    descartes = Counter()

    for it in por_place_id.values():
        nombre = (it.get("title") or "").strip()
        tel = normaliza_telefono(it.get("phone") or it.get("phoneUnformatted"))
        if not tel:
            descartes["sin telefono valido"] += 1
            continue
        if tel in telefonos_vistos:
            descartes["telefono duplicado"] += 1
            continue

        direccion = (it.get("address") or "").strip()
        ciudad = sin_tildes(it.get("city") or "")
        if not any(m in ciudad or m in sin_tildes(direccion) for m in municipios_norm):
            descartes["fuera de los municipios"] += 1
            continue

        telefonos_vistos.add(tel)

        categoria = (it.get("categoryName") or "").strip()
        cat_norm = sin_tildes(categoria)
        cadena = es_cadena(nombre, repetidos)
        autonomo = parece_autonomo(nombre)
        movil = es_movil(tel)

        if cadena:
            tipo, accion = "cadena", "DESCARTAR"
        elif autonomo or movil:
            # Persona fisica o movil personal: se visita, no se llama en frio.
            tipo = "posible_autonomo" if autonomo else "movil_personal"
            accion = "VISITAR"
        else:
            tipo, accion = "empresa", "LLAMAR"

        if cadena:
            prioridad = "C"
        elif any(p in cat_norm for p in (sin_tildes(x) for x in PRIORIDAD_A)):
            prioridad = "A"
        else:
            prioridad = "B"

        filas.append({
            "nombre": nombre,
            "categoria": categoria,
            "telefono": tel,
            "es_movil": "si" if movil else "no",
            "web": it.get("website") or "",
            "direccion": direccion,
            "municipio": (it.get("city") or "").strip(),
            "valoracion": it.get("totalScore") or "",
            "resenas": it.get("reviewsCount") or "",
            "google_maps_url": it.get("url") or "",
            "tipo_contacto": tipo,
            "accion": accion,
            "prioridad": prioridad,
            "estado_llamada": "",
            "persona_contacto": "",
            "llamadas_perdidas_dia": "",
            "que_hace_ahora": "",
            "acepta_visita": "",
            "siguiente_paso": "",
            "notas": "",
        })

    # Prioridad A primero, y dentro de cada una las que mas resenas tienen (mas actividad).
    orden = {"A": 0, "B": 1, "C": 2}
    filas.sort(key=lambda f: (orden[f["prioridad"]], -int(f["resenas"] or 0)))

    if descartes:
        print("\nDescartados:")
        for motivo, n in descartes.most_common():
            print(f"  {n:4d}  {motivo}")

    return filas


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--municipios", nargs="+", default=MUNICIPIOS_DEFECTO)
    p.add_argument("--max-por-busqueda", type=int, default=30)
    p.add_argument("--out", default="leads_atiende360.csv")
    args = p.parse_args()

    token = os.environ.get("APIFY_TOKEN")
    if not token:
        print("Falta APIFY_TOKEN. Sacalo en https://console.apify.com/settings/integrations", file=sys.stderr)
        return 1

    items: list[dict] = []
    for municipio in args.municipios:
        try:
            items.extend(lanza_run(token, municipio, args.max_por_busqueda))
        except urllib.error.HTTPError as e:
            detalle = e.read().decode(errors="replace")[:300]
            print(f"  ERROR HTTP {e.code} en {municipio}: {detalle}", file=sys.stderr)
        except (urllib.error.URLError, TimeoutError, RuntimeError) as e:
            print(f"  ERROR en {municipio}: {e}", file=sys.stderr)

    if not items:
        print("No se obtuvo ningun resultado.", file=sys.stderr)
        return 1

    filas = construye_filas(items, args.municipios)
    if not filas:
        print("Ningun negocio paso los filtros.", file=sys.stderr)
        return 1

    with open(args.out, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)

    resumen = Counter(f["accion"] for f in filas)
    print(f"\n{args.out}: {len(filas)} negocios")
    print(f"  LLAMAR    {resumen['LLAMAR']:3d}  (empresas, telefono fijo publico)")
    print(f"  VISITAR   {resumen['VISITAR']:3d}  (posible persona fisica: no llamar en frio)")
    print(f"  DESCARTAR {resumen['DESCARTAR']:3d}  (cadenas)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
