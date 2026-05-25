# Decisión — Persistencia de riddles en Convex (modo AI trivia)

**Estado:** **aprobado** — input para `01-prd-riddle-storage-convex.md`.
**Fecha:** 2026-05-23
**Idioma del documento:** español
**Audiencia:** producto, desarrollo (backend y frontend), QA, agente de planificación

**Referencias:**

- Decisión global de backend: [`../00-decision-resumen-planificacion-backend.md`](../00-decision-resumen-planificacion-backend.md)
- Decisión de approach IA (modo AI trivia): [`../modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md`](../modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md) — §8 (caché), §11 (riesgos)
- PRD vigente del modo AI trivia: [`../modo-ai-trivia/01-prd-modo-ai-trivia.md`](../modo-ai-trivia/01-prd-modo-ai-trivia.md) — §2 fila *Persistencia* y *Caché servidor*, §5.3 RNF-E06, §6.1 Fase 2, §8.1 *Fuera de alcance*
- Setup de infraestructura: [`../convex-setup/00-entorno-convex-vercel.md`](../convex-setup/00-entorno-convex-vercel.md) — §6 "Próximo paso (feature)"
- Reglas del repo: `.cursor/rules/docs-tasks-conventions.mdc`, `.cursor/rules/api-conventions.mdc`, `.cursor/rules/database-conventions.mdc`, `.cursor/rules/privacy.mdc`

---

## 1. Propósito de este documento

Cerrar **antes** del PRD las decisiones de approach sobre **dónde y cómo se guardan los riddles** generados por el LLM, ahora que el repo tiene Convex como almacén disponible (`convex-setup/` ya entregado).

Este documento **no es un PRD**: es la base de diseño que el PRD respeta. Lo que aquí se decide condiciona contrato de la tabla, integración con `server/prompts/`, comportamiento del cliente y los criterios de aceptación.

---

## 2. Contexto del problema

El PRD vigente del modo AI trivia cerró explícitamente que **no había DB**: la caché era in-memory por proceso de Vercel Function, con TTL 30 días, y `Edge Config / KV` quedaba como opcional de Fase 2 (RNF-E06, §6.1, §8.1 del PRD AI trivia).

Después de esa decisión:

- Se incorporó **Convex** al repo (vía Vercel Marketplace) y se cerró su setup en `convex-setup/00-entorno-convex-vercel.md`.
- Convex ofrece almacenamiento persistente real, índices y queries tipadas con un costo operativo muy bajo en el tier gratuito.
- La caché in-memory tiene dos limitaciones que en producción se vuelven visibles: **se pierde entre invocaciones** de Vercel Functions (Fluid Compute reduce pero no elimina cold starts), y **no se comparte entre regiones**. Cada Function "fresca" arranca con la caché vacía y vuelve a invocar al LLM.

Por tanto, la promesa de RNF-E06 ("intercambiable por edge config / KV en fase 2 sin tocar `server/prompts/`") se materializa ahora, eligiendo **Convex** como destino concreto en lugar de `Edge Config / KV`.

---

## 3. Decisión global

> Los riddles validados por el server se persisten en **Convex** como única fuente de verdad. La caché in-memory se conserva como **L1 opcional** (ver D6). El frontend no llama Convex; el server lo hace mediante `ConvexHttpClient` desde `server/prompts/`. El catálogo crece con cada partida hasta cubrir `(iso2, tag, locale)` con N variantes; el dedupe entre partidas lo hace el cliente con `excludedIds` en `localStorage`.

Las decisiones específicas que sostienen este enunciado se listan a continuación. Todas están **cerradas** (revisión humana 2026-05-23).

---

## 4. D1 — Scope (cerrada con el usuario)

**Decisión:** solo el modo **AI trivia** migra a Convex en esta iteración.

- El módulo `learn/` (Wikipedia + caché in-memory) **no se toca**: sigue con caché en memoria por proceso.
- El diseño del repositorio (`RiddleRepository`) se mantiene **agnóstico del módulo** para que `learn/` pueda migrar después con esfuerzo bajo, pero **no se implementa** esa migración.
- Las tablas y funciones de Convex que se introduzcan en esta iteración viven bajo nombres específicos del dominio AI trivia (ej. `riddles`, no `cached_items`).

**Implicación para el PRD:** el `01-prd-*.md` no debe introducir cambios en `server/learn/`.

---

## 5. D2 — Esquema lógico de `riddles` (cerrada con el usuario, 2026-05-23)

**Decisión:** una sola tabla `riddles`, sin tablas auxiliares en v1. Cada documento es un riddle ya validado. La información de fuente se agrupa en un objeto `source` con discriminador `origin`.

Forma lógica (la forma TS exacta se cierra en el PRD; aquí va el contrato):

```
riddles
  iso2:                  string                // ISO 3166-1 alpha-2, p.ej. "AR"
  tag:                   string                // id del catálogo de tags v1
  locale:                "es" | "en"
  riddle:                string                // texto de la adivinanza ya validado

  source: {                                    // objeto discriminado por `origin`
    origin:              "wikipedia"           // discriminator; v1 = siempre "wikipedia"
    url:                 string                // URL canónica HTTPS final, persistida al validar
    title:               string                // título declarado por el LLM
    locale:              "es" | "en"           // idioma del artículo declarado
  }

  difficulty:            "easy" | "medium" | "hard"
  justification:         string                // útil para depuración / re-validación futura
  llmProvider:           string                // "gemini-flash" en v1; tracking de proveedor
  validationVersion:     number                // versión del conjunto V1–V8 con que se aprobó
  createdAt:             number                // ms epoch, generado por el server
  _id:                   Id<"riddles">         // generado por Convex (id pública opaca)
```

**Índices:**

- `by_lookup` sobre `(iso2, tag, locale)` — para listar variantes disponibles al construir un batch.
- `by_origin` sobre `(source.origin, createdAt)` — para auditoría futura (listar últimos N riddles por origen) y para preparar diversificación de fuentes en v2 sin migración.

**Razonamiento:**

- **Una sola tabla** evita complejidad y joins. Convex no es relacional clásico; la regla de oro es modelar por patrón de acceso, no por normalización.
- **`source` como objeto** (no campos planos `claimedSourceTitle` / `claimedSourceLocale` / `claimedSourceUrl`):
  - Encapsula "de dónde sale esta info" en un solo lugar; mejor legibilidad en el Dashboard y en código.
  - El discriminador `origin: "wikipedia"` deja la puerta abierta a otras fuentes en v2 (Britannica, sitios oficiales) sin migrar el esquema base.
  - `source.url` se construye **una sola vez** al persistir, con HTTPS y encoding correcto. El cliente recibe el `url` listo para `<a href>`, sin lógica de construcción ni riesgo de inconsistencia.
  - `source.title` y `source.locale` se mantienen junto al `url` para queries, auditoría y para re-derivar la URL si hiciera falta.
- **`justification`** se persiste: útil para depurar "por qué el LLM dijo que este artículo cuenta para Argentina". Solo el server lo lee; nunca se devuelve al cliente.
- **`llmProvider`** se persiste: evita repetir el debate "vendor lock" del PRD AI trivia (§3.1) cuando se introduzca un segundo proveedor; permite métricas comparativas por proveedor.
- **`validationVersion`** se persiste: permite, en el futuro, invalidar masivamente riddles aprobados con un set V1–V8 viejo sin borrarlos del disco (D7).
- **`by_origin`** habilita listar últimos N riddles desde el Dashboard / scripts admin (sustituye un hipotético `by_created_at`), y prepara el camino para v2 sin migrar.
- **No** se guarda `valid: boolean` ni `error: "insufficient_grounding"`: solo se persisten los que pasaron validación. Los rechazados quedan en logs (sin PII).
- **No** se guarda IP, sessionId, ni nada que ate un riddle a un jugador concreto.

---

## 6. D3 — Política de expiración (cerrada con el usuario)

**Decisión:** **persistencia indefinida**. No hay TTL, no hay cron de limpieza, no hay endpoint admin de purga en v1.

**Razonamiento:**

- Las preguntas sobre hechos verificables en Wikipedia no caducan rápido. Una adivinanza sobre la Edad Media sigue siendo válida en 10 años.
- Eliminar TTL simplifica el código: sin scheduler, sin "estoy expirado, regenerá".
- Si una fila resulta problemática en el futuro (artículo Wikipedia eliminado, hecho desactualizado), la solución es **invalidación manual** + soporte en `validationVersion` (D7), no expiración por tiempo.
- Costo de almacenamiento de N × tags × locales × 196 países × M variantes en Convex free tier es despreciable.

**Implicación para el PRD:** el `01-prd-*.md` **no** debe definir TTL ni job de limpieza; sí debe documentar cómo se invalida una fila manualmente (D7).

---

## 7. D4 — Dedupe entre partidas (cerrada con el usuario)

**Decisión:** el dedupe lo mantiene el **cliente** con `excludedIds` en `localStorage`.

**Contrato:**

- El cliente conserva una lista de `Id<"riddles">` ya vistos por el usuario en ese device (clave en `localStorage`, namespace `aiTrivia:seenIds:<locale>`).
- En el body del request `POST /v1/prompts/generate` el cliente envía `excludedIds: readonly string[]`.
- El server, por cada `(iso2, tag, locale)`, intenta servir un riddle de Convex cuyo `_id ∉ excludedIds`. Si no hay variantes nuevas para ese trio, llama al LLM para generar una y la persiste.
- Tras renderizar la ronda, el cliente añade el `_id` recibido a `excludedIds`.

**Razonamiento:**

- No hace falta auth ni `sessionId` server-side (D8 cae por sí solo).
- No hay PII en `localStorage`: solo IDs opacos de Convex.
- Es robusto a que el usuario borre `localStorage` (vuelve a ver riddles viejos, no rompe nada).
- Multi-device intencionalmente fuera de alcance v1 (alineado con "no auth" del backend global).

**Implicación para el PRD:** el `01-prd-*.md` define el shape exacto del request (`excludedIds: string[]`) y el comportamiento client-side del `localStorage`. La regla de `privacy.mdc` "localStorage solo datos no sensibles" se cumple.

---

## 8. D5 — Quién escribe y lee Convex (cerrada con el usuario, 2026-05-23)

**Decisión:** **solo el server**, vía `ConvexHttpClient` desde `server/prompts/`. El frontend nunca llama Convex directamente.

Reafirma la **Opción 1** ya decidida en `convex-setup/00-entorno-convex-vercel.md`:

- El frontend usa `prompts-api-client` → `POST /v1/prompts/generate` (handler Vercel) → `server/prompts/generate-ai-prompts.ts` → `RiddleRepository` (puerto) → `RiddleRepositoryConvex` (adaptador con `ConvexHttpClient`).
- `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL` siguen sin usarse en runtime del frontend (ver `convex-setup/` §2). Conservar las variables generadas por Convex CLI **no** las activa en el bundle.
- Las funciones de Convex (`convex/*.ts`) se mantienen mínimas: solo mutations/queries que el server consume. Sin lógica de negocio.

**Implicación para el PRD:** el `01-prd-*.md` introduce un nuevo puerto `RiddleRepository` en `server/prompts/`, con adaptador Convex como única implementación productiva y `RiddleRepositoryInMemory` para tests Vitest.

---

## 9. D6 — Caché in-memory vs Convex (cerrada con el usuario, 2026-05-23)

**Decisión:** **L1 in-memory por proceso (corto) + L2 Convex (persistente)**. Write-through: cada riddle nuevo se escribe en Convex **y** queda en L1 hasta que la Function muera.

**Comportamiento:**

1. `RiddleRepository.findOne({iso2, tag, locale, excludedIds})`:
   - Mira L1 in-memory primero (filtrando `excludedIds`).
   - Si miss → query a Convex.
   - Si hit en Convex → guarda en L1 antes de devolver.
2. `RiddleRepository.save(riddle)`:
   - Mutation en Convex.
   - Tras éxito, escribe en L1 in-memory.

**Razonamiento:**

- L1 evita una llamada de red a Convex en cada request dentro del mismo proceso (Fluid Compute reusa instancias).
- L1 puede quedarse "sucio" entre instancias (otra Function persistió un riddle que esta no ve); el costo es **invocar al LLM una vez de más**, no es un bug funcional. Aceptable.
- Mantener el patrón L1+L2 facilita medir en logs el aporte real de Convex (cache_hit_l1 vs cache_hit_l2 vs llm_call), métrica útil para ajustar.

**Alternativa rechazada:** solo Convex, sin L1. Más simple, pero suma una llamada de red por request incluso en hot path. Si en producción se ve que el ahorro de L1 es < 5 %, vale revisar.

**Implicación para el PRD:** define métricas `ai_trivia.cache_hit_l1`, `ai_trivia.cache_hit_l2`, `ai_trivia.cache_miss`. Reemplaza la métrica única `cache_hit_ratio` del PRD viejo (RNF-T07).

---

## 10. D7 — Re-validación al leer (cerrada con el usuario)

**Decisión:** **no se re-valida al leer en v1**. Un riddle aprobado en su día se sirve mientras esté en la tabla. **Re-validación on-read o job batch:** fuera de alcance; posible iteración futura si hace falta.

**Razonamiento:**

- Re-validar V5/V6 (Wikipedia) en cada read mata la latencia que justamente queremos ganar persistiendo.
- Los riddles ya pasaron V1–V8 al ser persistidos. El supuesto "Wikipedia cambió el título declarado" es real pero raro.
- Si se vuelve un problema observable (métricas o reportes), v2 introduce un job que recorre `riddles` con `validationVersion < CURRENT` y los marca como `invalid` (o los borra). Eso justifica `validationVersion` en el esquema (D2).

**Mecanismo de invalidación manual** (mínimo viable, sin endpoint admin):

- Si hace falta retirar un riddle, se borra desde el **Convex Dashboard** (función `db.delete`) o con `npx convex run riddles:invalidate --id <id>` si se implementa un helper. Esa función helper es opcional en v1; sin ella, el dashboard alcanza.

**Implicación para el PRD:** el `01-prd-*.md` declara "no re-validación on-read" como decisión explícita y describe el flujo de invalidación manual desde el Dashboard como procedimiento operativo, no como feature.

---

## 11. D8 — Identidad del usuario

**Decisión:** **no aplica**. Con D4 (dedupe en cliente) no hace falta `sessionId` server-side. Sin auth de usuarios en este iteración (alineado con `00-decision-resumen-planificacion-backend.md`).

---

## 12. D9 — Rate limit (cerrada con el usuario)

**Decisión:** **sin cambios**. Sigue el rate limit por IP del PRD AI trivia (Fase 2, `api/_lib/apply-prompts-rate-limit.ts`). Convex no se usa para rate-limit.

**Razonamiento:**

- Aunque ahora hay DB persistente, mover rate-limit a Convex agrega latencia y complejidad sin beneficio claro: un atacante motivado puede rotar IPs igual que sessionIds.
- El bucket actual (`prompts:${ip}`) ya está en producción y funciona.
- Si más adelante hace falta rate-limit por usuario autenticado, vendrá con la feature de auth, no con esta.

**Implicación para el PRD:** el `01-prd-*.md` no modifica `apply-prompts-rate-limit.ts`.

---

## 13. Cambios respecto a iteraciones previas

(Sección requerida por `.cursor/rules/docs-tasks-conventions.mdc` §"Sección obligatoria en el PRD nuevo". Se incluye aquí porque el `00-decision` ya invalida partes del PRD viejo; el `01-prd-*.md` la reproducirá con el detalle final.)

| Origen | Decisión previa | Estado en esta iteración |
|--------|-----------------|--------------------------|
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §2 tabla *Persistencia* | "No hay DB. Caché en memoria (compartida con `learn/`)" | **Sustituida:** ahora `riddles` vive en Convex (D5). La caché in-memory queda como L1 opcional (D6). `learn/` no migra (D1). |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §2 tabla *Caché servidor* | "Clave `aiTrivia:iso2:tag:locale`, TTL 30 días, mismo motor que `learn/`" | **Sustituida:** la "clave" pasa a ser índice `by_lookup` + `by_origin` en Convex (D2). TTL desaparece (D3). El motor ya no es "el mismo que `learn/`": `learn/` queda con su caché in-memory. |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §5.3 RNF-E06 | "Caché modular: in-memory hoy; intercambiable por edge config / KV en fase 2 sin tocar `server/prompts/`" | **Cumplida con destino distinto:** se cumple la promesa de intercambiabilidad, eligiendo **Convex** en lugar de Edge Config / KV. El puerto se llama `RiddleRepository` (D5/D8). |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §6.1 Fase 2 (opcional) | "Cambio de caché in-memory a Vercel Edge Config / KV" | **Sustituida:** el cambio se hace, pero con destino **Convex**. |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §6.2 archivo `ai-trivia-cache.ts` | "wrapper sobre el motor de caché compartido" | **Sustituido o coexistente:** se reemplaza por `riddle-repository.ts` (puerto) + `riddle-repository-convex.ts` (adaptador) + `riddle-repository-in-memory.ts` (tests). El "wrapper compartido" queda fuera porque `learn/` no migra (D1). |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §8.1 *Fuera de alcance* | "DB / persistencia de preguntas generadas: solo caché en memoria. Sin tabla." | **Entra al alcance** de esta nueva iteración. |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §8.1 *Fuera de alcance* | "Endpoint admin de invalidación de caché" | **Sigue fuera de alcance** (D7): invalidación manual desde Convex Dashboard. |
| `modo-ai-trivia/01-prd-modo-ai-trivia.md` §5.5 RNF-T07 métrica `ai_trivia.cache_hit_ratio` | métrica única | **Refinada** en `cache_hit_l1` + `cache_hit_l2` + `cache_miss` (D6). |

El **callout de superseding** en `modo-ai-trivia/01-prd-modo-ai-trivia.md` y el índice en `../README.md` se actualizaron al aprobar este documento (regla `docs-tasks-conventions.mdc`).

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Convex free tier se queda corto en escritura | El volumen es bajo (≈ 196 países × 9 tags × 2 locales × N variantes; cada riddle ~1 KB). El free tier soporta órdenes de magnitud más. Monitoreo en logs (`ai_trivia.llm_call` vs `cache_hit_l2`) avisa antes de chocar el límite. |
| Frontend termina dependiendo de Convex (acoplamiento) | D5/D8 garantizan que el frontend no llame Convex. El contrato sigue siendo `POST /v1/prompts/generate` con el mismo shape que el PRD viejo + `excludedIds` (D4). |
| Re-validación postergada (D7) sirve riddles con info desactualizada | Aceptado para v1. `validationVersion` deja la puerta abierta a un job batch en v2 sin migración. |
| L1 in-memory desincronizado entre instancias (D6) | Aceptado: el peor caso es una llamada al LLM de más. Métrica `cache_hit_l2` lo hace visible. |
| Drift entre `schema.ts` (Convex) y tipos del server | El PRD obliga a importar tipos generados (`convex/_generated/dataModel.d.ts`) en `RiddleRepositoryConvex`. Tests Vitest con `RiddleRepositoryInMemory` se aseguran del contrato del puerto, no del adaptador. |
| `_id` opaco filtra a `localStorage` y un usuario "hackea" excludedIds | No es un riesgo real: lo peor que pasa es que el usuario ve riddles repetidos. No hay PII ni privilegios atados al `_id`. |

---

## 15. Fuera de alcance (v1 de persistencia en Convex)

- **Migrar `learn/` a Convex.** (D1)
- **TTL o cron de limpieza.** (D3)
- **Endpoint admin de invalidación** vía HTTP o UI propia. (D7 — se usa el Dashboard de Convex.)
- **Re-validación on-read** o job batch que revisa `validationVersion` (iteración futura; D7 cerrada: no en v1).
- **Auth de usuarios** o `sessionId` server-side. (D8)
- **Mover rate-limit a Convex.** (D9)
- **Dedupe multi-device** (requeriría auth). (D4)
- **Exposición pública del esquema o tipos generados** al cliente. El cliente ve solo `Id<"riddles">` como `string` opaco.
- **Métricas históricas / dashboard custom.** Se usa lo que ya hay en `vercel logs` (extendido con `cache_hit_l1` / `l2`).

---

## 16. Próximos pasos

1. ~~Revisar y cerrar D1–D9~~ — **hecho** (2026-05-23).
2. ~~Callout + README índice~~ — **hecho**.
3. **Escribir `01-prd-riddle-storage-convex.md`** en esta carpeta (en curso / aprobado según estado del PRD).
4. **Escribir `02-plan-implementacion-*.md`** una vez aprobado el PRD para implementación.

---

## 17. Glosario

- **`RiddleRepository`:** puerto (interfaz TS) en `server/prompts/` con métodos `findOne(...)`, `save(...)`, `findManyForBatch(...)`. Implementaciones: `RiddleRepositoryConvex` (productiva) y `RiddleRepositoryInMemory` (tests).
- **L1 / L2:** L1 = caché in-memory por proceso de Vercel Function. L2 = Convex.
- **`excludedIds`:** lista de `Id<"riddles">` que el cliente ya vio en ese device. Se envía en el body del request al server.
- **`validationVersion`:** entero que identifica la versión del conjunto V1–V8 con que se aprobó un riddle. Permite re-validación batch en v2 sin tocar V1.
- **Approach B (heredado del modo AI trivia):** prompt blindado + salida estructurada + validación server-side + caché + fallback. Sigue vigente; esta iteración solo cambia **dónde** vive el caché.
