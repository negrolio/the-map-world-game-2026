# Resumen de decisiones — Backend API (Vercel) y features relacionadas

**Fecha de decisión:** 2026-05-15  
**Origen:** conversación de planificación (producto + arquitectura).  
**Audiencia:** agente o desarrollador que vaya a **descomponer en tareas** e implementar sin reinterpretar el alcance.

---

## 1. Contexto del producto

- Proyecto de **baja escala / demo funcional**: debe **funcionar bien al 100%** para mostrar capacidades, pero **sin gastar dinero** en infra (solo tiempo de desarrollo).
- El juego actual (Vite + React) ya tiene:
  - Pool de preguntas **local** vía `buildQuestionPool` (`src/services/build-question-pool.ts`): un ítem por país del catálogo filtrado por región, con `answerCountryCode` + `prompt` según `questionMode`.
  - Barajado **aleatorio** (semilla en test, timestamp en dev normal).
  - Rondas con `targetCountryCode` + `prompt` fijos (`beginPlayingSession` en `src/services/game-round-service.ts`).
  - Puntajes **solo en memoria** de sesión (sin persistencia servidor).
  - **i18n** ES/EN ya implementado (`src/i18n/`).

El backend nuevo **no reemplaza** el núcleo del juego de adivinar en mapa; **extiende** capacidades que requieren secretos, red externa o almacenamiento.

---

## 2. Tres features que comparten backend

Están **entrelazadas** y deben diseñarse como **una API coherente** (módulos distintos, mismo despliegue), no como tres proyectos sueltos.

| # | Feature | Necesidad de backend | Notas |
|---|---------|----------------------|-------|
| **1** | **Preguntas redactadas por IA (proveedor LLM)** | Sí (API key) | Ver §3 — enfoque acordado. El proveedor concreto es intercambiable; **primera implementación: Gemini Flash** |
| **2** | **Modo aprendizaje** (clic en país → info) | Recomendado | Wikipedia REST; caché, User-Agent, i18n del contenido |
| **3** | **Persistencia de puntajes en servidor** | Sí (+ base de datos) | Ver backlog; enlazar con política **anticheat** (no persistir partidas inválidas) |

**Relación 1 ↔ 2:** ambas features comparten **infraestructura** de acceso a Wikipedia (`WikipediaClient`, caché de bajo nivel, mappings ISO↔título de [`shared/wikipedia-sitelinks.json`](../../../shared/wikipedia-sitelinks.json)), **no el pipeline** del modo aprendizaje. En la feature de IA, Wikipedia se consulta **después** de la generación, como **verificador** del título declarado por el modelo (validaciones V5/V6 del approach B), no como contexto pre-cargado para el LLM. Detalle en [`modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md`](./modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md) §3 y §5.

**Relación 3:** definir **contrato de API y esquema mínimo** antes de elegir proveedor de DB (Supabase, Neon, Firestore, D1, etc.) — ver backlog *Persistencia de puntajes en servidor*.

---

## 3. Feature 1 — Preguntas con IA (decisión de producto clave)

> **Nota de arquitectura.** El proyecto se diseña **agnóstico del proveedor LLM**. La lógica de prompts, validación, caché y endpoints no depende de un modelo concreto: el acceso pasa siempre por un adaptador `LlmClient`. La **primera implementación** elegida es **Gemini Flash** por su tier gratuito (presupuesto `$0`), pero esa elección **no condiciona** el contrato HTTP, el formato de error ni el resto del backend. Detalle de approach y validaciones en [`modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md`](./modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md).

### 3.1 Enfoque acordado (preferido frente a “IA elige el país”)

- **Mantener** la selección aleatoria de países como hoy (mismo pool / filtro por región / cantidad de preguntas).
- **Cambiar solo el texto** (`prompt`) de cada ronda: en lugar de plantilla fija (“¿Dónde está X?”), la IA redacta una pregunta cuyo **único país correcto** sigue siendo el ya elegido (`answerCountryCode` / `targetCountryCode`).
- Ejemplo: si el objetivo es Argentina, la IA podría generar *“¿Qué país declaró su independencia de España en 1816?”* o si el obejtivo es Inglaterra *“¿De qué país son los Rolling Stones?”* (ejemplos ilustrativos; calidad factual es un riesgo).

### 3.2 Tags temáticos (setup / config futura)

El usuario podría elegir tags como: `politica`, `historia`, `arte`, `musica`, `polemicas`, etc. La IA usa esos tags para orientar el estilo de la pregunta **sin cambiar** el país objetivo.

### 3.3 Reglas de calidad (requisitos para implementación)

- **No revelar** el nombre del país (ni sinónimos obvios) en el enunciado si el modo es adivinar en el mapa.
- **Salida estructurada obligatoria** (JSON con `riddle`, `expected_iso2`, `claimed_source_title`, `claimed_source_locale`, `valid`, `difficulty`, etc.). El servidor aplica **validaciones determinísticas obligatorias** sobre cada ítem: longitud, idioma (`locale` alineado con i18n), ausencia de palabras prohibidas por país y verificación contra Wikipedia del **artículo declarado** por el modelo (V1–V8 del approach B). Si una validación falla → **re-roll** acotado o **fallback** a la plantilla local. Contrato completo en [`modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md`](./modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md) §4 y §5.
- **Riesgos:** alucinaciones, ambigüedad (varios países posibles), hechos históricos discutibles; tags sensibles (`polemicas`) requieren **guardrails** en prompt y/o filtro de contenido.
- **Coste / cuota:** la elección de modelo es responsabilidad del adaptador concreto; el resto del sistema solo asume “una llamada batch por partida” para reducir latencia y consumo. En la primera implementación se usa **Gemini Flash** en tier gratuito; revisar límites actuales en la [documentación oficial de Gemini](https://ai.google.dev/gemini-api/docs/pricing). Si en el futuro se cambia a otro proveedor, los criterios mínimos son: soporte de salida estructurada (JSON), latencia razonable en batch y plan que respete el presupuesto vigente.

### 3.4 Por qué este enfoque es más simple técnicamente

- No hay que confiar en que la IA devuelva el **ISO correcto**.
- El motor de juego (`Round`, scoring, mapa) **no cambia** semánticamente; solo el string `prompt`.
- El frontend tampoco sabe qué proveedor LLM está activo: consume el mismo endpoint y el mismo DTO sin importar quién redactó la pregunta.

---

## 4. Feature 2 — Modo aprendizaje + Wikipedia

- Al hacer clic en un país: mostrar nombre, bandera (si aplica) y **reseña corta** vía [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (resumen + thumbnail).
- **Sin puntaje** ni penalización.
- **Servidor como proxy recomendado:** User-Agent identificable, **caché** por `(iso2, locale)`, normalización de errores, alineación con i18n (`es` / `en`).
- Esta feature **no provee contexto pre-cargado** a la feature 1. Lo que se comparte con `prompts/` es la **infraestructura** de acceso a Wikipedia (`WikipediaClient`, caché de bajo nivel y mappings ISO↔título), no el caso de uso de aprendizaje ni su DTO.

---

## 5. Feature 3 — Puntajes en servidor

- Esquema mínimo sugerido en backlog: jugador, modo, ronda, puntaje, fecha.
- Decidir: **auth anónima** vs identificada; **sin PII innecesaria** (reglas de privacidad del repo).
- Política **anticheat** (backlog *Anticheat: no persistir puntaje…*): si la partida se marca inválida, **no guardar** y mensaje claro al usuario; debe documentarse junto al contrato de API de scores.

---

## 6. Decisiones de hosting e infraestructura

| Tema | Decisión |
|------|----------|
| **Proveedor principal** | **Vercel** — hosting del front (build Vite) + **Serverless Functions** para la API |
| **¿Equivalente a Firebase?** | **No 1:1.** Vercel ≈ deploy + funciones HTTP. Firebase ≈ suite (auth, DB, hosting, functions). Para este proyecto: Vercel + **DB externa** cuando haga falta puntajes (p. ej. Supabase/Neon en tier gratuito) |
| **¿Migrar a Next.js?** | **No** — mantener Vite + React; añadir capa `api/` (handlers Vercel) |
| **¿Repo separado?** | **No** — mismo monorepo, **carpetas modulares** para poder extraer después |
| **API keys del proveedor LLM** | **Nunca en el bundle del navegador** en producción; solo variables de entorno del servidor en Vercel. Nombre de la env por proveedor (p. ej. `GEMINI_API_KEY` en la primera implementación) |
| **Transporte** | Contrato de aplicación = **HTTP** (métodos, JSON, códigos). En producción: **solo HTTPS** (TLS en el borde de Vercel). Local: `http://localhost` o `vercel dev` |
| **Desarrollo local** | Usar **`vercel dev`** para alinear con producción; evitar depender solo de un Express en `:3001` que luego haya que re-adaptar |
| **Presupuesto** | $0 objetivo: free tier del proveedor LLM elegido (Gemini en v1) + planes gratuitos de Vercel/DB; aceptar límites y cold starts. Si en el futuro se cambia de proveedor, debe respetar el mismo presupuesto o documentarse explícitamente el cambio |

---

## 7. Arquitectura modular (mismo repo, stacks separables en el futuro)

Objetivo: que un **front móvil nativo u otro cliente** consuma las mismas APIs sin reescribir lógica.

### 7.1 Capas

```
api/                    → Handlers Vercel (delgados): parse Request, CORS, status, JSON
server/ o lib/api-core/ → Casos de uso puros (sin Request/Response de Vercel)
  ├── learn/            → Wikipedia + caché + DTO aprendizaje (consumido por modo aprendizaje)
  ├── prompts/          → Generar adivinanza con LLM (vía LlmClient) + validar contra Wikipedia
  │                       (V5/V6 del approach B) + caché + fallback local
  └── scores/           → Validar + persistir (puerto/repositorio)
shared/ (opcional)      → Tipos y schemas compartidos con el front (sin importar React)
```

- **Handlers delgados:** sin lógica de negocio.
- **Adaptadores:** `LlmClient` (interfaz; impl Gemini en v1, otras posibles después), `WikipediaClient`, `ScoreRepository` (implementación Postgres/Supabase intercambiable).
- **Tests:** Vitest sobre funciones puras del núcleo, sin levantar Vercel ni llamar al proveedor LLM real (mocks del `LlmClient`).

### 7.2 Contrato API

- Prefijo versionado: **`/v1/...`**
- Errores con **códigos estables** (`INVALID_LOCALE`, `RATE_LIMITED`, …) + mensaje humano (mapeable a i18n en clientes).
- Documentar con **OpenAPI** o schemas JSON compartidos cuando se implemente.
- **CORS** por lista de orígenes en env; pensar clientes no-browser (móvil) con **token/API key** si hace falta más adelante.

### 7.3 Evolución del repo

- **Fase 1:** carpetas `api/` + `server/` en el mismo repo.
- **Fase 2 (si crece):** npm/pnpm workspaces (`packages/api-core`, `apps/web`) — extracción mecánica, no rediseño.

---

## 8. Integración con el frontend actual (puntos de enganche)

| Área actual | Rol tras backend |
|-------------|------------------|
| `buildQuestionPool` | Sigue eligiendo países; en modo “prompt IA”, tras el pool llamar API para **sustituir/enriquecer** `prompt` por ítem |
| `beginPlayingSession` | Sin cambio de forma: sigue recibiendo `QuestionPoolItem[]` con `prompt` ya resuelto |
| `GameConfig` / setup | Nuevos campos: modo pregunta IA, tags[], quizá flag modo aprendizaje |
| `src/i18n/` | `locale` debe enviarse al backend en requests de Wikipedia y de generación de prompts (LLM) |
| `App.tsx` / `startGameWithConfig` | Punto natural para **await** generación de prompts antes de `beginPlayingSession` (UX: loading) |

Variables de entorno en front (ej. `VITE_API_BASE_URL`) para apuntar a local vs producción.

---

## 9. Endpoints previstos (borrador para planificación)

> Nombres ilustrativos; definir contrato formal en tarea de API design.

| Método | Ruta (borrador) | Propósito |
|--------|-----------------|-----------|
| `GET` | `/v1/countries/:iso2/learn` | Modo aprendizaje: resumen Wikipedia + metadata |
| `POST` | `/v1/prompts/generate` | Body: lista `{ iso2 }`, `locale`, `tags[]` → lista `{ iso2, prompt }` |
| `POST` | `/v1/scores` | Persistir resultado de partida (si válida) |
| `GET` | `/v1/scores/leaderboard` | Ranking (parámetros por definir) |

Flujo interno de `POST /v1/prompts/generate` (approach B): para cada `(iso2, tag)` → consultar caché por `(iso2, tag, locale)` → si miss, llamar **una vez** al `LlmClient` con el batch completo y prompt blindado → validar la respuesta JSON contra reglas V1–V8 (incluye verificar contra Wikipedia el artículo declarado por el modelo) → re-roll acotado si falla → cachear o **omitir** el ítem si tras los re-rolls sigue inválido (el cliente usa la plantilla local como fallback) → responder. **No se hace pre-fetch de Wikipedia para alimentar al LLM**; Wikipedia se usa solo como verificador después de la generación. La identidad del proveedor LLM concreto **no aparece** en la respuesta HTTP ni en los códigos de error.

---

## 10. Orden de implementación sugerido

1. **Contrato y carpeta** `api/` + núcleo `server/` + `vercel dev` funcionando (health o echo).
2. **Wikipedia + caché** (`WikipediaClient`) → desbloquea modo aprendizaje **y** habilita las validaciones server-side de la feature de IA (verificación del artículo declarado por el modelo, V5/V6).
3. **Adaptador `LlmClient` + primera implementación (Gemini)** + validaciones V1–V8 + caché por `(iso2, tag, locale)` → generación de prompts en batch al iniciar partida. La interfaz se define antes que la impl concreta.
4. **Integración front** (setup, loading, fallback si API falla).
5. **Scores + DB + anticheat** → cuando el contrato y políticas estén cerrados.

---

## 11. Fuera de alcance inicial (explícito)

- Migración a Next.js.
- Repo backend separado (salvo decisión futura explícita).
- Traducción automática de Wikipedia más allá de elegir idioma de la API.
- Ranking global complejo, cuentas de usuario, pagos.
- Confiar en la IA para **elegir** el país correcto sin validación contra catálogo.

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Key expuesta en cliente | Solo servidor / env Vercel |
| Abuso del endpoint público | Rate limit, opcional API key débil, no publicitar URL en demos sensibles |
| Preguntas incorrectas o ambiguas | Prompt estricto; validación post-generación; fallback a prompt plantilla local |
| Cuota del proveedor LLM agotada | Batch, modelo barato/rápido del proveedor activo (Gemini Flash en v1), mensaje UX claro, fallback local |
| Vendor lock del proveedor LLM | Adaptador `LlmClient`; el resto del backend no depende del proveedor concreto |
| Vendor lock Vercel | Núcleo en módulos puros; handlers reemplazables |
| Anticheat + ranking injusto | No persistir sesiones inválidas; mensajes claros (ver backlog) |

---

## 13. Próximos pasos para el agente de planificación

1. Leer este documento y las entradas del [`ideas-features-backlog.md`](../ideas-features-backlog.md) citadas arriba.
2. Crear **PDR formal** (`01-pdr-backend-api.md`) con criterios de aceptación por fase si hace falta más detalle que este resumen.
3. Descomponer en tareas: infra Vercel, módulo Wikipedia, **interfaz `LlmClient` + primera implementación (Gemini)**, integración `buildQuestionPool`/setup, modo aprendizaje UI, scores+DB, tests e2e con mocks (mockear `LlmClient`, no el proveedor concreto).
4. Añadir entrada en backlog para **“Preguntas con IA (tags temáticos)”** si se promueve a iteración (sin atar el título al proveedor LLM concreto).
5. Respetar reglas del repo: **no instalar dependencias sin acordar**; secretos solo en env; **no PII** en logs.

---

## 14. Glosario rápido

- **HTTP (en docs):** capa de aplicación (rutas, JSON). En producción usar **HTTPS**.
- **Vercel Functions:** un archivo en `api/` = un endpoint serverless; no es un proceso Node escuchando puerto 24/7.
- **Handler delgado:** traduce HTTP ↔ caso de uso; no contiene reglas de negocio.
