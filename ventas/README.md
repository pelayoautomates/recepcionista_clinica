# Leads para validación — Atiende 360

Script para sacar la lista de negocios locales con los que validar el producto por teléfono.

## Ejecutar

```powershell
$env:APIFY_TOKEN = "apify_api_xxx"
python ventas/scrape_leads.py
```

Token en https://console.apify.com/settings/integrations. Solo stdlib, no hay que instalar nada.

Ampliar zona:

```powershell
python ventas/scrape_leads.py --municipios "Majadahonda" "Las Rozas de Madrid" "Pozuelo de Alarcon"
```

Coste: el actor `compass/crawler-google-places` cuesta ~1,50 $/1.000 negocios. Un municipio son céntimos.

## Qué hace con los datos

- Dedupe por `placeId` y luego por teléfono normalizado a E.164.
- Descarta lo que no tenga teléfono español válido y lo que caiga fuera de los municipios.
- Clasifica cada negocio en una **acción**:

| acción | qué es | por qué |
|---|---|---|
| `LLAMAR` | Empresa con fijo público | B2B puro, interés legítimo (art. 19 LOPDGDD). Riesgo bajo. |
| `VISITAR` | Nombre de persona o móvil | Probable persona física → su teléfono es dato personal y la llamada comercial en frío no está amparada (LGT 11/2022 art. 66). Presencial sí, y encima es la ventaja del producto. |
| `DESCARTAR` | Cadena | Deciden en central, no en recepción. No validan nada. |

  La detección de autónomo es heurística por el nombre. **Revisa esa columna antes de llamar** — un falso negativo es una llamada que no deberías hacer.

- Prioridad **A** (estética, láser, capilar, fisio, osteopatía, podología) antes que **B** (psicología, nutrición). Dentro de cada una, ordenado por número de reseñas.

**No incluye dental ni veterinaria** a propósito: Gesden y Qvet dominan esos sectores, no tienen API pública y hoy solo integramos Google Calendar. Un "sí" de ahí es un falso positivo.

## Antes de llamar

- Consultar la **Lista Robinson** si vas a llamar a algún autónomo pese a la marca.
- Al descolgar: identifícate, di que es una llamada comercial, y si te dicen que no vuelvas a llamar, apúntalo en `notas` y no vuelvas.
- No hace falta grabar. La obligación de grabación es para contratación cerrada por teléfono, no para prospección.

## El guion (columnas del CSV)

La lista no pregunta "¿te interesaría?" — eso lo contesta todo el mundo que sí por educación. Pregunta por lo que ya pasó:

1. `llamadas_perdidas_dia` — ¿cuántas llamadas se te quedan sin coger un día normal?
2. `que_hace_ahora` — ¿qué haces cuando estás con un paciente y suena el teléfono? ¿las devuelves?
3. `acepta_visita` — **¿te vendría bien que me pase 15 minutos esta semana y te lo dejo funcionando?**

La 3 es el único dato que valida. "Mándame información" es un no.
