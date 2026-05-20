# Decisión — Approach IA + data retrieval (modo AI trivia)

**Estado:** aprobado para usar como input al crear PRD, Plan y Tasks de la feature.
**Fecha:** 2026-05-20
**Idioma del documento:** español
**Audiencia:** producto, desarrollo, QA, agente de planificación

**Referencias:**

- Decisiones de backend compartido: [`../00-decision-resumen-planificacion-backend.md`](../00-decision-resumen-planificacion-backend.md) — §3 (proveedor LLM), §7 (arquitectura modular), §10 (orden de implementación)
- PRD del modo aprendizaje (Wikipedia + caché ya existentes): [`../modo-aprendizaje/01-prd-modo-aprendizaje.md`](../modo-aprendizaje/01-prd-modo-aprendizaje.md)
- Artefacto Wikidata sitelinks ya commiteado: [`shared/wikipedia-sitelinks.json`](../../../../shared/wikipedia-sitelinks.json)
- Backlog origen: [`../../ideas-features-backlog.md`](../../ideas-features-backlog.md) — *Preguntas con IA (tags temáticos)*

---

## 1. Propósito de este documento

Cerrar **antes** de escribir PRD/Plan/Tasks la decisión clave del modo AI trivia: **cómo se usa la IA** y **de dónde sale la información** que usa para redactar las preguntas. El documento no es un PRD; es la base de diseño que el PRD debe respetar.

Lo que aquí se decide condiciona alcance, validaciones, contrato de API, costes y criterios de aceptación.

---

## 2. Contexto del problema

- El quiz actual usa `buildQuestionPool` (`src/services/build-question-pool.ts`) con plantillas fijas (`country` / `capital`).
- Se quiere ofrecer una **variante con preguntas redactadas por IA** y **tags temáticos** (`historia`, `arte`, `musica`, `politica`, `gastronomia`, etc.) **sin cambiar** el motor del juego ni la lista de países objetivo del pool.
- Restricción dura: **demo $0**. La **primera implementación** usa **Gemini Flash** en **tier gratuito** porque cumple el presupuesto, pero la arquitectura es **agnóstica del proveedor**: el LLM se consume detrás de un adaptador (`LlmClient`) intercambiable. Sin DB nueva en esta iteración.
- Política del repo: **secretos solo en servidor**, **no instalar dependencias sin acordar**, **sin PII en logs** (ver `core.mdc` y `privacy.mdc`).

Se evaluaron tres caminos:

| Camino | Resumen | Veredicto |
|--------|---------|-----------|
| A — Prompt puro al LLM | Pedir adivinanza “usando solo Wikipedia”, sin contexto ni validación | Rechazado: la instrucción “solo Wikipedia” es **inverificable** desde el cliente del LLM; alto riesgo de alucinación, ambigüedad y fuga del nombre del país |
| **B — Prompt + validación server-side** | El LLM genera adivinanza en **JSON estructurado**; el server valida ISO, palabras prohibidas, longitud, idioma, existencia del artículo Wikipedia declarado; re-roll o fallback | **Elegido** |
| C — Retrieve+generate (cascada Wikipedia + Wikidata) | Server arma `ContextBundle` cazando hubs/secciones/categorías; el LLM solo redacta | Escalable a futuro si B no alcanza calidad; **fuera de alcance** de esta iteración |

---

## 3. Decisión (approach B)

### 3.1 Rol del LLM

- El LLM **redacta** una adivinanza por `(iso2, tag, locale)`.
- El LLM **no elige** el país objetivo (lo fija el pool del juego, igual que hoy).
- El LLM **no se conecta** a Wikipedia ni a ninguna otra fuente externa; la instrucción “usa solo Wikipedia” es **sesgo de prompt**, no enforcement.
- Llamada **batch por partida** con todos los `(iso2, tag)` del pool, contra el adaptador `LlmClient` (independiente del proveedor concreto).
- **Primera implementación:** **Gemini Flash** en free tier (cumple `demo $0`). El adaptador permite cambiar a otro proveedor (OpenAI, Anthropic, modelos open-source vía gateway, etc.) sin tocar prompts/, validaciones, caché ni handlers HTTP. Ver §11 (vendor lock) y §15 (glosario `LlmClient`).

### 3.2 Rol del servidor

El servidor es el **único punto de verdad** para que la respuesta del modelo sea aceptada:

1. Construye el **prompt blindado** con reglas estrictas.
2. Exige **salida JSON estructurada**.
3. Valida la respuesta contra reglas determinísticas (sección §5).
4. Verifica el **título de Wikipedia declarado** por el modelo contra la API real de Wikipedia (existencia, idioma).
5. Si falla → **re-roll** acotado (N intentos) o **fallback** a la plantilla local de `buildQuestionPool`.
6. **Cachea** el resultado validado por `(iso2, tag, locale)`.

### 3.3 Una frase

> El LLM escribe; el servidor verifica; Wikipedia es la fuente declarada y comprobable; si nada de eso funciona, el juego sigue con la plantilla local. El proveedor del LLM es intercambiable.

---

## 4. Contrato del modelo (salida estructurada)

El LLM debe devolver, **por ítem del batch**, un objeto con la forma:

```jsonc
{
  "iso2": "IR",                                // ISO 3166-1 alpha-2 objetivo (eco)
  "tag": "arte",
  "locale": "es",
  "riddle": "¿De qué país proviene la tradición milenaria de…?",
  "expected_iso2": "IR",                       // debe igualar iso2 (validación)
  "justification": "Las alfombras persas están inscritas en…",
  "claimed_source_title": "Alfombra persa",    // título exacto en Wikipedia del idioma `locale`
  "claimed_source_locale": "es",               // idioma del artículo declarado
  "difficulty": "easy" | "medium" | "hard",
  "valid": true                                // self-check del propio modelo
}
```

Si el modelo no puede cumplir las reglas con un hecho confiable, debe devolver:

```jsonc
{ "iso2": "YE", "tag": "teatro", "error": "insufficient_grounding" }
```

Esto evita inventiva y le da al server una señal limpia para hacer fallback.

---

## 5. Validaciones server-side (obligatorias, todas pasan o se descarta)

| # | Regla | Cómo se valida |
|---|-------|----------------|
| V1 | `expected_iso2 === iso2` (request) | comparación de string |
| V2 | `riddle` no contiene nombre del país, gentilicio, capital, ciudades top ni moneda (en `locale` y en `en`) | lista de **palabras prohibidas por país** (artefacto generado en build desde catálogo + Wikidata) |
| V3 | Longitud razonable: 20–280 caracteres | check trivial |
| V4 | Idioma de `riddle` coincide con `locale` | heurística (regex, conteo de stopwords) |
| V5 | `claimed_source_title` corresponde a un artículo **existente** en `{claimed_source_locale}.wikipedia.org` | `GET /w/api.php?action=query&titles={t}&format=json` → no `missing` |
| V6 | El artículo declarado **menciona** o está categorizado bajo el país | `prop=links&pltitles={countryTitle}` o `prop=categories` (cacheable) |
| V7 | `valid !== false` | check trivial |
| V8 | `difficulty` ∈ `{easy, medium, hard}` | enum |

Si **alguna** falla → re-roll (hasta 2 intentos por ítem). Si tras los re-rolls sigue fallando → fallback al `prompt` plantilla local del ítem (el juego no se rompe).

V5 y V6 son las **claves**: convierten la promesa “el LLM usó Wikipedia” en una verificación real y barata, sin importar qué proveedor lo redactó.

---

## 6. Artefactos generados en build (en repo, sin runtime extra)

Para no depender de red en cada partida y abaratar las validaciones:

| Artefacto | Contenido | Generador |
|-----------|-----------|-----------|
| `shared/wikipedia-sitelinks.json` (**ya existe**) | `iso2 → { wikidataId, titles.es, titles.en }` | `scripts/build-wikipedia-sitelinks.mjs` |
| `shared/country-forbidden-terms.json` (**nuevo**) | `iso2 → { es: [...], en: [...] }` con: nombre canónico, nombres alternativos, gentilicio masc/fem, capital, top 5 ciudades, moneda | nuevo script en `scripts/`, fuente Wikidata + catálogo |
| `shared/ai-trivia-tag-dictionary.json` (**nuevo, opcional v1**) | Tags soportados + sinónimos por locale (para UI y guardrails de prompt) | script o curado manual |

Los artefactos **se commitean**; no se regeneran en runtime (mismo patrón que sitelinks). Esto cumple `dependency-security.mdc` y mantiene el coste runtime en cero para validaciones.

---

## 7. Prompt blindado (plantilla de referencia)

> Texto definitivo se cierra en el PRD; aquí queda como guía vinculante de diseño.

```
Eres un generador de adivinanzas para un juego de geografía.
Te paso una LISTA de ítems. Para cada uno devuelve un objeto JSON
según el contrato indicado.

Reglas estrictas (válidas para CADA ítem):
1. La adivinanza debe basarse en hechos verificables en Wikipedia.
   Declara en `claimed_source_title` el TÍTULO EXACTO del artículo
   de Wikipedia (en el idioma `locale`) del que proviene la
   información. No inventes títulos.
2. `expected_iso2` debe coincidir con el `iso2` recibido.
3. La respuesta correcta debe ser UN solo país, sin ambigüedad con
   vecinos ni con países de la misma región cultural.
4. NO menciones el nombre del país, gentilicios, capital, ciudades
   famosas, moneda, ni topónimos que delaten la respuesta. (El
   servidor también valida esto; si lo violas, tu salida es
   rechazada.)
5. Longitud `riddle`: 20–280 caracteres.
6. Idioma de `riddle` = `locale`.
7. Si no puedes cumplir las reglas con un hecho confiable,
   devuelve `{ "iso2": ..., "tag": ..., "error":
   "insufficient_grounding" }` para ese ítem.
8. Antes de devolver, releé tu adivinanza y marca `valid: false` si
   admite varios países como respuesta.

Formato de salida: JSON con un array `items`, un objeto por ítem
de entrada, en el mismo orden.
```

---

## 8. Caché

- **Clave:** `aiTrivia:iso2:tag:locale`.
- **Valor:** objeto validado (mismo shape que §4 + metadatos de validación).
- **TTL sugerido:** 30 días (las preguntas no caducan rápido).
- **Invalidación manual:** flag/endpoint admin (fuera de alcance v1).
- **Capa:** misma infra que el módulo `learn/` (caché en memoria del proceso + posible almacenamiento simple en archivo/edge config en fase 2).

Con catálogo finito (~196 países × N tags × 2 locales), la mayoría de partidas terminan **sin invocar al LLM**.

---

## 9. Endpoints (borrador, se cierra en PRD)

```
POST /v1/prompts/generate
Body: { items: [{ iso2 }], tags: ["arte"], locale: "es", seed?: number }
→ Server: por cada (iso2, tag) → cache.get → si miss → batch al LlmClient
   → validar → cachear → responder
Response: { items: [{ iso2, tag, riddle, difficulty, source: { title, url } }] }
```

- Si un ítem falla todas las validaciones y re-rolls, el server **omite** el campo IA y deja que el cliente use su plantilla local (no rompe la partida).
- Errores estables (mismos códigos que `learn/` + nuevos): `INVALID_LOCALE`, `INVALID_TAG`, `LLM_UNAVAILABLE`, `LLM_RATE_LIMITED`, `INSUFFICIENT_GROUNDING`, `INTERNAL_ERROR`. Los códigos son **independientes del proveedor**; el detalle del proveedor solo se ve en logs server.

---

## 10. Integración con el frontend

| Área | Cambio |
|------|--------|
| `GameConfig` / Setup | Nuevos campos: toggle “preguntas con IA”, multi-select de `tags` |
| `buildQuestionPool` | **Sin cambios**: sigue eligiendo `iso2` |
| Flujo `startGameWithConfig` | Si IA activa: antes de `beginPlayingSession`, llamar `POST /v1/prompts/generate` con la lista del pool y `tags` elegidos. UX con **loading** y mensaje de fallback claro |
| `Round.prompt` | Si la API devolvió `riddle` para ese ítem, usar `riddle`; si no, usar el `prompt` plantilla local |
| i18n | Las claves nuevas (toggle, tags, errores) se añaden a `src/i18n/resources/{es,en}.ts` |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Alucinación factual | Salida estructurada + V5/V6 (artículo declarado existe y menciona país) + re-roll + fallback local |
| Ambigüedad (varios países válidos) | Regla 3 + self-check (`valid: false`) + posibilidad de marcar ítems como ambiguos en logs y bloquearlos por `(iso2, tag)` |
| Fuga del nombre del país | Lista de palabras prohibidas por país (artefacto en repo) |
| Tags sensibles (`polemicas`) | **Excluidos** de v1 hasta tener pipeline de moderación |
| Cuota del proveedor LLM agotada | Batch + modelo barato/rápido del proveedor activo (Gemini Flash en v1) + caché + fallback local |
| Coste oculto en re-rolls | Límite duro `MAX_REROLLS = 2` por ítem; métrica de “re-roll rate” en logs |
| Outdated (info de política/actualidad) | Excluir tag `politica` actual de v1 o restringir a hechos históricos |
| Vendor lock al proveedor LLM | Adaptador `LlmClient` con interfaz estable; reemplazable por otro proveedor sin tocar `prompts/`, validaciones, caché ni handlers. La elección del proveedor concreto (Gemini en v1) vive en una sola fábrica/config |
| Key expuesta | Solo env del server Vercel; nunca en bundle. El nombre de la env var es genérico (p. ej. `LLM_API_KEY`) o por proveedor (`GEMINI_API_KEY`) según se decida en implementación |
| Logs con PII / contenido sensible | No loguear `riddle` completas en producción; sí loguear `iso2`, `tag`, código de validación fallida |

---

## 12. Métricas mínimas (para decidir si v1 sirve)

A capturar en logs server (sin PII):

- `ai_trivia.requests_total{tag,locale}`
- `ai_trivia.cache_hit_ratio`
- `ai_trivia.validation_failures{rule}`
- `ai_trivia.reroll_rate`
- `ai_trivia.fallback_used_ratio`
- `ai_trivia.llm_errors{provider,code}` — `provider` permite comparar calidad/disponibilidad si se introducen alternativas

**Criterio de salida** propuesto para considerar v1 “buena”: `fallback_used_ratio < 10 %` en una muestra de 200 preguntas reales tras pruebas internas. Si está peor, abrir tarea para escalar a approach C (retrieve+generate).

---

## 13. Fuera de alcance (v1 del modo AI trivia)

- Approach C (pipeline `context-builder` con cascada Wikipedia + Wikidata).
- Tag `polemicas` (requiere moderación dedicada).
- Tag `politica` con actualidad reciente.
- Moderación de contenido con servicios externos.
- A/B testing de prompts.
- Generación multi-respuesta (varias preguntas por país en la misma partida).
- Persistencia de preguntas en DB (caché sí; DB no).
- Soporte de locales fuera de `es` / `en`.
- Implementar **más de un proveedor LLM** en paralelo. El adaptador `LlmClient` queda preparado para múltiples backends, pero solo se entrega **una implementación concreta** en v1 (Gemini Flash).

---

## 14. Próximos pasos (para el agente que cree PRD / Plan / Tasks)

1. **Promover idea a backlog** (`ideas-features-backlog.md`) si aún no está: entrada *Preguntas con IA (tags temáticos)*. La elección del proveedor LLM concreto (Gemini en v1) se documenta como detalle de implementación, no como parte del título de la feature.
2. **PRD formal** `01-prd-modo-ai-trivia.md` en esta carpeta, con:
   - User stories (jugador elige IA + tags, ve loading, juega como hoy, qué pasa si falla).
   - Criterios de aceptación por validación (V1–V8).
   - Contrato exacto de `POST /v1/prompts/generate`.
   - Lista cerrada de tags soportados en v1 (sugerencia: `historia`, `arte`, `musica`, `gastronomia`, `geografia-fisica`, `deportes`).
   - Copy de loading y fallback en i18n (mensajes genéricos al usuario, sin nombrar el proveedor).
3. **Plan de implementación** por fases:
   - F1 (local): interfaz `LlmClient` + **adaptador Gemini** como primera implementación, validador, artefacto `country-forbidden-terms.json`, endpoint, integración Setup → Game.
   - F2 (deploy): rate limit, métricas, doc.
4. **Tasks atómicas**: script generador del artefacto, `LlmClient` interfaz + impl Gemini (primer proveedor), validadores V1–V8, integración en `App.tsx`/`startGameWithConfig`, tests unitarios con mock del `LlmClient` (no del proveedor concreto) y e2e sin red real.
5. **Antes de implementar**: pedir consentimiento explícito si hace falta añadir paquete del SDK del proveedor elegido (ver `dependency-security.mdc`). Alternativa preferida: `fetch` nativo contra la REST API oficial del proveedor, sin SDK, para minimizar acoplamiento.

---

## 15. Glosario

- **Approach B:** prompt blindado + salida estructurada + validación server-side + caché + fallback local. Decisión vigente.
- **ContextBundle / Approach C:** pipeline futuro de retrieval Wikipedia/Wikidata que arma el contexto antes de llamar al modelo. No se implementa en v1.
- **LLM:** modelo de lenguaje grande genérico (Gemini, GPT, Claude, modelos open-source, etc.). El proyecto no se ata a un proveedor: se accede vía `LlmClient`.
- **`LlmClient`:** adaptador del proyecto. Interfaz estable (`generateRiddles(items, tags, locale) → ...`) con una o más implementaciones intercambiables. **Primera implementación: Gemini Flash.**
- **Re-roll:** reintento acotado contra el LLM activo cuando una respuesta falla validación.
- **Fallback local:** uso del `prompt` plantilla del `buildQuestionPool` cuando el LLM no produce algo válido (o el proveedor está caído).
- **Palabras prohibidas:** lista por país (nombre, gentilicio, capital, ciudades, moneda) que la adivinanza no puede contener.
