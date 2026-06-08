# Decisión — Rediseño visual pantalla de resultados (cierre con sensación de recompensa)

**Estado:** **aprobado** — fuente de verdad para el plan de implementación (decisiones del product owner cerradas 2026-06-08).
**Fecha:** 2026-06-08
**Idioma del documento:** español
**Audiencia:** producto, diseño, desarrollo (frontend), QA, agente de planificación

**Referencias:**

- Backlog (origen de la idea): [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — entrada *Pantalla de resultados — rediseño visual (alinear con look "game")* (2026-06-08).
- Brief visual integral (paleta, pergamino, chunky, §8 *Resultados*): [`../../requirements/05-prd-rediseno-visual-brief-diseno.mdc`](../../requirements/05-prd-rediseno-visual-brief-diseno.mdc).
- ADR precedente (formato y tono): [`../setup-redesign/00-decision-setup-look-and-feel.md`](../setup-redesign/00-decision-setup-look-and-feel.md).
- Estado actual del producto: [`../../requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc).
- Implementación vigente: `src/features/game/ResultsView.tsx`, `src/features/game/AiRoundsSummary.tsx`, `src/App.tsx` (montaje), `src/services/ranking.ts`, `src/services/game-result.ts`.
- Reglas del repo: `.cursor/rules/core.mdc`, `.cursor/rules/dependency-security.mdc`, `.cursor/rules/privacy.mdc`.

---

## 1. Propósito de este documento

Cerrar **antes** del plan las decisiones de producto y diseño para que la pantalla de resultados deje de sentirse como un volcado de texto técnico y pase a comportarse como una **pantalla de cierre con sensación de recompensa**, coherente con el lenguaje visual de Home y Setup (pergamino/madera/chunky).

Este ADR es la **única fuente de verdad**: el plan de implementación se ejecutará a partir de él y **no se guardará** como artefacto. Por eso las decisiones aquí deben ser autosuficientes y sin ambigüedad.

**Alcance: solo visual.** No se cambia el scoring, los turnos, el dataset, la lógica anti-cheat ni el contrato de datos. No se elimina información que hoy se muestra; cambia su **jerarquía, formato y estética**.

---

## 2. Contexto del problema

### 2.1 Comportamiento y UI actuales relevantes

`src/features/game/ResultsView.tsx` (vista presentacional; recibe `session` + callbacks) muestra, de arriba a abajo:

1. **Cabecera**: `Badge` "Resultados" + título "Partida finalizada".
2. **Línea de estado en texto plano** (`data-testid="game-finished-status"`): por ejemplo
   *"Estado: finalizada por rondas. 5 rondas jugadas. Puntaje: +10 por acierto, −5 por error. Versión del dataset: 2026-catalog-world-173."*
3. **Incidentes anti-cheat en texto plano** (`data-testid="anti-cheat-incidents"`): *"Incidentes anti-cheat registrados: 0"*.
4. **`Alert` de aviso anti-cheat** (`antiCheatNotice`), condicional.
5. **`Alert tone="info"` del ganador** (`data-testid="game-winner"`): *"Mejor puntaje según la tabla: Jugador 1 (1 pts, 20% aciertos sobre respuestas dadas)."*
6. **`Panel` leaderboard**: `<ol>` con una entrada por jugador (`data-testid="finished-rank-${pos}-${id}"`), nombre + stats (puntos · aciertos · errores · precisión).
7. **`AiRoundsSummary`** (solo si `questionMode === 'ai'`).
8. **Fila de CTAs**: *Rejugar* (`data-testid="replay-same-config-button"`), *Nueva partida (setup)*, *Ir al inicio*.

### 2.2 Problemas identificados

- Los bloques (2), (3) y (5) son **texto plano corrido** que rompe la estética del juego (lo señaló explícitamente el product owner).
- El ganador se comunica con un `Alert` informativo genérico, sin "sensación de recompensa".
- La metadata técnica (versión de dataset, nota de scoring, incidentes) compite en jerarquía con lo importante: quién ganó y el ranking.

### 2.3 Datos del dominio (verificados en código)

- `buildLeaderboard` (`src/services/ranking.ts`) ordena de forma **determinista**: `score ↓`, `correctAnswers ↓`, `wrongAnswers ↑`, `turnOrder ↑`, `name` (es). No produce posiciones empatadas en el orden, pero **sí puede haber jugadores con el mismo `score`**.
- `buildGameResult` fija `winnerPlayerId = leaderboard[0]?.id` (siempre hay "primero", incluso con 1 jugador o con mismo puntaje tras desempate).
- `GameResult = { winnerPlayerId?, leaderboard, totalRounds }`; `GameSession` aporta `status` (`finished` | `aborted`), `incidentCount`, `datasetVersion`, `config.questionMode`.

### 2.4 Restricciones a respetar

- **Mobile-first**: legible y sin overflow en 390px; partida AI de hasta 5 rondas implica scroll largo del resumen — la zona de cierre (hero + podio) debe leerse arriba.
- **Sistema visual existente**: reutilizar primitives (`Panel`, `Badge`, `Alert`, `ChunkyButton`) y tokens actuales; sin tocar `tokens.css`.
- **Sin dependencias npm nuevas** salvo aprobación explícita (`dependency-security.mdc`).
- **Accesibilidad**: foco visible, nombres accesibles, no comunicar estado **solo** por color, `aria-live` donde aplique.
- **Privacidad**: nombres de jugadores son datos de UI no sensibles; no introducir logs ni tracking.
- **No** rediseñar Home, Setup, HUD ni mapa en esta iteración.

---

## 3. Decisión global

> La pantalla de resultados se reorganiza en tres zonas con jerarquía clara de recompensa:
> **(A) Hero de cierre** que destaca al ganador (o "Tu resultado" en partidas de 1 jugador);
> **(B) Podio + ranking**, con podio top-3 adaptativo y lista detallada solo para quienes no entran al podio;
> **(C) Pie de cierre** con la metadata técnica (estado, rondas, scoring, dataset, incidentes) reconvertida de texto plano a elementos visuales secundarios (chips/insignias), más los CTAs.
> El resumen AI (`AiRoundsSummary`) se alinea al mismo lenguaje visual. Todo es solo presentación: no cambian datos, scoring ni flujo.

---

## 4. D1 — Estructura y jerarquía de la pantalla (cerrada)

**Decisión:** mantener el contenedor actual (`<main bg-paper>` + `<section max-w-2xl>` centrada, flex-col con `gap`), y reorganizar el contenido en este orden vertical:

| Orden | Zona | Contenido |
|-------|------|-----------|
| 1 | Cabecera | `Badge` + título de cierre (se mantiene `setup`/`results` namespace) |
| 2 | **Hero de cierre (A)** | Ganador destacado / "Tu resultado" (D2) |
| 3 | **Podio + ranking (B)** | Podio top-3 adaptativo (D3) + lista detallada del resto (D4) |
| 4 | Resumen AI | `AiRoundsSummary`, solo modo AI (D6) |
| 5 | **Pie de cierre (C)** | Metadata técnica como chips (D5) + aviso/estado abortada (D7) + CTAs (D8) |

Se conserva el ancho máximo y el ritmo de `gap` actuales para no romper mobile.

---

## 5. D2 — Hero de cierre: ganador y caso 1 jugador (cerrada)

**Decisión:** reemplazar el `Alert tone="info"` actual ("Mejor puntaje según la tabla…") por un **hero de recompensa**.

| Caso | Tratamiento |
|------|-------------|
| **≥ 2 jugadores** | Hero del **ganador** (`leaderboard[0]`): nombre destacado con tipografía display, puntaje grande y precisión; estética de recompensa (panel con `ribbonTitle` y/o ilustración placeholder de trofeo/laurel, D9). |
| **1 jugador** | Hero como **"Tu resultado"**: mismo bloque visual pero **sin connotación de vencer a otros** (copy neutro propio, D10). No se usa lenguaje de "ganador". |

**Reglas:**

- El hero deriva del mismo `winnerPlayerId` / `leaderboard[0]` ya existente; no se recalcula nada.
- Conservar `data-testid="game-winner"` en el contenedor del hero (estabilidad; aunque hoy ningún test lo asserte, se mantiene).
- El hero **cuenta como la representación de ese jugador** para la regla de testids de D3 (no duplicar su `finished-rank-*`).

---

## 6. D3 — Podio top-3 adaptativo, empates y ranking (cerrada)

**Decisión:** introducir un **podio visual top-3** debajo del hero, con lista detallada solo para el resto.

| Aspecto | Regla |
|---------|-------|
| Tamaño del podio | **Adaptativo**: muestra solo los puestos que existan. 2 jugadores → podio de 2; 3+ → podio de 3. **No** hay huecos vacíos. |
| 1 jugador | **No hay podio**: el hero "Tu resultado" (D2) es el cierre; la lista detallada también puede omitirse si no aporta (ver regla de testids abajo). |
| Empates | **Marcar empate**: jugadores con **mismo `score`** comparten medalla/puesto (mismo número de posición y misma medalla). El orden de despliegue sigue el del `leaderboard` (desempate determinista), pero la **etiqueta de puesto** se calcula por `score`. |
| Medallas | Oro/plata/bronce derivadas de la paleta actual (acentos del brief: dorado `#FDD835` para 1.º; variantes para 2.º/3.º), nunca **solo** color: incluir número de puesto textual. |
| Lista detallada (debajo) | **Solo los jugadores que NO entraron al podio**, con sus stats completas (puntos · aciertos · errores · precisión), reusando el formato `results.leaderboardStats`. |

**Regla de `data-testid` (crítica para no romper e2e):**

- Cada jugador debe renderizar **exactamente un** elemento con `data-testid="finished-rank-${pos}-${id}"`, **sin importar** si aparece en el hero, en el podio o en la lista detallada. Así el conteo `[data-testid^="finished-rank-"]` sigue siendo **igual al número de jugadores** (e2e `game-flow.spec.ts` espera count = 1 con 1 jugador).
- `${pos}` es la posición 1-indexada del `leaderboard` (igual que hoy).

---

## 7. D4 — Lista detallada del resto (cerrada)

**Decisión:** mantener el `Panel` de ranking para los jugadores fuera del podio, reestilizado al look de cierre.

- Reusar `results.leaderboardHeading` y `results.leaderboardStats` (sin copy nuevo obligatorio).
- Si tras el podio no queda nadie (1–3 jugadores), el `Panel` de lista **no se renderiza** (evitar bloque vacío), respetando siempre la regla de testids de D3 (los jugadores ya quedaron representados en hero/podio con su `finished-rank-*`).

---

## 8. D5 — Metadata técnica: de texto plano a forma elegante (cerrada)

**Problema explícito (product owner):** los bloques *"Estado: finalizada por rondas. 5 rondas jugadas. Puntaje: +10… Versión del dataset: …"* y *"Incidentes anti-cheat registrados: 0"* son texto plano que no condice con la estética.

**Decisión:** **mantener la información** (no se elimina dato), pero reconvertirla en un **pie de cierre secundario** con elementos visuales del sistema (chips/insignias `Badge`, panel `paper-soft`, tipografía menor), no como párrafo corrido.

| Dato | Tratamiento propuesto |
|------|------------------------|
| Estado (finalizada por rondas / abortada por anti-cheat) | **Chip/`Badge`** con tono según estado (neutro/madera para finalizada; advertencia para abortada). Ver D7. |
| Rondas jugadas | **Chip** compacto (ej. icono + "5 rondas"). |
| Nota de scoring (+10 / −5) | **Nota al pie discreta** (texto pequeño `text-ink-soft`) o tooltip/`title`; deja de ser parte de la frase principal. |
| Versión del dataset | **Caption discreta** al pie (menor jerarquía; coherente con brief §8 Home "dataset como info secundaria"). |
| Incidentes anti-cheat | **Chip** con tono neutro si `0`, tono advertencia si `> 0`. |

**Preservación de tests/i18n:**

- Conservar `data-testid="game-finished-status"` en el elemento que comunica el estado, y `data-testid="anti-cheat-incidents"` en el chip de incidentes.
- El texto del estado debe **seguir conteniendo** las subcadenas que asserta e2e/unit: *"finalizada por rondas"* (`results.statusFinished`) y *"abortada por anti-cheat"* (`results.statusAborted`); y el de incidentes debe contener el número (`App.test` asserta `/1/`). Si se decide reformular ese copy, **debe actualizarse el test** por una razón de producto clara (RF-07 del brief).

---

## 9. D6 — Resumen AI (`AiRoundsSummary`) (cerrada — decisión del autor del ADR)

**Decisión:** **solo alinear estilo** al nuevo lenguaje de cierre (tonos `Panel`/`Badge` consistentes, espaciado), **sin cambiar su estructura ni su contrato** (sigue listando por ronda: prompt, país objetivo, intento/acierto, delta de score, link Wikipedia con las mismas reglas de `isSafeWikipediaUrl`).

- Se conservan todos sus `data-testid` (`ai-rounds-summary`, `ai-rounds-summary-entry-*`, `ai-rounds-summary-attempt-badge`, `ai-rounds-summary-not-solved-badge`, `ai-rounds-summary-score-delta`, `ai-rounds-summary-source-link`/`-fallback`) y claves `results.ai.*`.
- Reestructurar el resumen queda **fuera de alcance** (§13).

---

## 10. D7 — Partida abortada por anti-cheat (cerrada)

**Decisión:** mantener el **`Alert` de advertencia actual** (`antiCheatNotice`) **integrado** al nuevo look, y reflejar el estado abortada en el chip de estado (D5) con tono advertencia.

- Debe quedar **clara la distinción finalizada vs abortada** (brief §8): chip de estado diferenciado + `Alert` de advertencia cuando corresponda.
- No se crea un "estado inválida" con tratamiento propio en esta iteración (esa es la idea de backlog *Anticheat: no persistir puntaje…*, fuera de alcance aquí).

---

## 11. D8 — CTAs de cierre (cerrada)

**Decisión:** mantener los tres CTAs y su comportamiento (mismas callbacks `onReplaySameConfig`, `onGoToSetup`, `onGoToHome`), reestilizados como piezas físicas chunky coherentes con el cierre.

- Conservar `data-testid="replay-same-config-button"` (asserted en `App.test`).
- Jerarquía: *Rejugar misma config* como acción primaria; *Nueva partida (setup)* y *Ir al inicio* secundarias.
- Reusar claves `results.replay`, `results.newGameSetup`, `results.goHome`.

---

## 12. D9 — Animación y assets (cerradas)

**Animación (micro-reveal):**

- **Permitida** una micro-animación sutil de cierre (ej. aparición del hero/podio, conteo breve de puntaje), **respetando `prefers-reduced-motion`** (sin animación si el usuario lo pide).
- **Enfoque CSS-first**: preferir transiciones/animaciones nativas sin dependencias.
- El product owner está **abierto a una librería de animación** si fuera necesario, pero su incorporación requiere **aprobación explícita aparte** siguiendo `dependency-security.mdc` (nombre exacto, versión, scripts, antigüedad, vulnerabilidades, flags de endurecimiento). El plan **no** asume librería por defecto.

**Assets:**

- **Permitido un placeholder** de ilustración de recompensa (trofeo/laurel/podio) en `src/assets/`, sustituible más adelante sin bloquear el release (mismo patrón que las cards de setup).
- Nombre propuesto (a confirmar en el plan): `src/assets/results-trophy.png` (placeholder). Formato PNG/WebP optimizado, licencia clara (propia/CC0).
- Si no aporta, puede resolverse con iconografía simple inline; el placeholder no es obligatorio para todos los estados.

---

## 13. D10 — Copy / i18n (cerrada)

**Decisión:** se **permiten claves nuevas** ES/EN (`src/i18n/resources/{es,en}.ts`, namespace `results`) para el hero, el caso "Tu resultado", etiquetas de podio/medallas y chips de metadata.

| Necesidad | Acción i18n |
|-----------|-------------|
| Hero ganador (≥2 jugadores) | Puede reusar/derivar de `results.winnerLead`/`winnerStats` o crear claves nuevas más "premiantes". |
| Caso 1 jugador ("Tu resultado") | **Clave nueva** ES/EN, copy neutro sin "ganador". |
| Etiquetas de puesto/podio y empate | Claves nuevas si hacen falta (ej. "1.º", "Empate"). |
| Chips de metadata (rondas, incidentes, scoring, dataset) | Reusar `results.*` existentes; crear claves de etiqueta corta si el formato chip lo requiere. |

**Restricción dura:** no romper las subcadenas asserted por tests (`statusFinished`, `statusAborted`) salvo que se actualice el test con justificación (D5, RF-07).

---

## 14. D11 — Accesibilidad, tests y `data-testid` (cerrada)

| Tema | Decisión |
|------|----------|
| `data-testid` a preservar | `game-finished-status`, `anti-cheat-incidents`, `game-winner`, `finished-rank-${pos}-${id}` (uno por jugador, regla D3), `replay-same-config-button`, y todos los `ai-rounds-summary-*`. |
| Conteo `finished-rank-*` | Igual al número de jugadores, esté el jugador en hero/podio/lista (D3). |
| Accesibilidad | Medallas/estado nunca solo por color; foco visible en CTAs; `aria-live="polite"` si hay reveal animado de puntaje; nombres accesibles en hero/podio. |
| `prefers-reduced-motion` | Respetado (D9). |
| Tests a actualizar/vigilar | Unit: `src/features/game/ResultsView.test.tsx`, `src/features/game/AiRoundsSummary.test.tsx`, `src/App.test.tsx`. E2E: `e2e/game-flow.spec.ts`, `e2e/ai-trivia-flow.spec.ts`. Cambios de copy → actualizar test con justificación. |
| Verificación manual | 390px; partida de 1 jugador; 2 jugadores (podio de 2); empate de puntaje; partida AI de 5 rondas; partida abortada por anti-cheat. |

---

## 15. Fuera de alcance (esta iteración)

| Tema | Dónde vive |
|------|------------|
| Reestructurar el contenido del resumen AI (más allá de estilo) | Futuro / backlog |
| Estado "partida inválida" + no persistir puntaje | Backlog *Anticheat: no persistir puntaje…* |
| Persistencia/leaderboard global, compartir resultado | Backlog *Persistencia de puntajes en servidor* |
| Tokens, tipografías o paleta global | Brief visual integral (`05-prd-rediseno-visual-brief-diseno.mdc`) |
| Rediseño de Home, Setup, HUD, mapa | Otras iteraciones |
| Incorporar librería de animación | Requiere ADR/aprobación de dependencia aparte (D9) |

---

## 16. Acciones de backlog y repo

1. Al **empezar** la implementación, mover *Pantalla de resultados — rediseño visual* de **Ideas pendientes** → **En ejecución** en [`../ideas-features-backlog.md`](../ideas-features-backlog.md), con link a [`results-redesign/`](./).
2. Carpeta de iteración: `docs/tasks/results-redesign/` (este ADR es el único doc; el plan se ejecuta sin persistirse).
3. Al **cerrar** (merge): mover a **Cerradas** y actualizar [`../../requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc) §1 (la línea del modo AI ya menciona `ResultsView`/`AiRoundsSummary`).

---

## 17. Cierre de preguntas (2026-06-08)

| Tema | Resolución |
|------|------------|
| Ganador | **Hero/podio de recompensa**; reemplaza el `Alert` "Mejor puntaje según la tabla". |
| Podio | **Top-3 adaptativo** (2 jugadores → podio de 2; sin huecos). |
| 1 jugador | Hero **"Tu resultado"**, sin lenguaje de "ganador". |
| Empates | **Marcar empate**: misma medalla/puesto para igual `score`. |
| Lista detallada | **Solo** jugadores fuera del podio (con stats completas). |
| Metadata técnica (estado/rondas/scoring/dataset/incidentes) | **Se conserva**, reconvertida a **chips/insignias secundarias**; se elimina el texto plano corrido. |
| Abortada por anti-cheat | `Alert` de advertencia integrado + chip de estado diferenciado (claridad finalizada vs abortada). |
| Resumen AI | **Solo alinear estilo**; sin cambiar estructura/contrato. |
| Animación | Micro-animación sutil, `prefers-reduced-motion`; **CSS-first**, librería solo con aprobación aparte. |
| Assets | Placeholder de trofeo/laurel permitido, sustituible. |
| Copy/i18n | Claves nuevas ES/EN permitidas; preservar subcadenas asserted por tests. |

**Próximo paso:** ejecutar el plan de implementación a partir de este ADR (frontend en `src/features/game/`), sin persistir el plan.

---

## 18. Cambios posteriores a la implementación (follow-up 2026-06-08)

Ajustes pedidos por el product owner tras revisar la primera implementación. No
cambian datos ni flujo (siguen siendo solo visuales):

| Tema | Resolución |
|------|------------|
| Trofeo coloreado | `TrophyIcon` (SVG inline recoloreable) en 3 variantes: **oro / plata / cobre**. **Multijugador**: por puesto (1.º oro, 2.º plata, 3.º cobre). **1 jugador**: por precisión (`100%` oro, `>70%` plata, resto cobre). Lógica en `resolveHeroTrophyVariant` / `resolveSoloTrophyVariant`. El rango 50–70% en solitario cae en cobre (decisión registrada). |
| Sin aciertos → sin trofeo | Si un jugador termina con `correctAnswers === 0` (`guessedNothing`), en lugar de trofeo se muestra un **esqueleto de pez** (`FishboneIcon`) como premio consuelo. Aplica a hero y a cada puesto del podio. |
| Asset del fishbone | Silueta de [game-icons.net](https://game-icons.net) ("Fishbone" de **Lorc**), **CC BY 3.0**, recoloreada. Atribución en [`../../../src/assets/ASSET-CREDITS.md`](../../../src/assets/ASSET-CREDITS.md). Reemplaza el placeholder `results-trophy.*` mencionado en D9 (que no se usa). |
| Panel de estado colapsable | La metadata técnica (D5) ya **no se muestra por defecto**: queda detrás de un botón pequeño **"Ver detalle" / "Ocultar detalle"** (`data-testid="toggle-results-meta"`, `aria-expanded`/`aria-controls`). El contenido se monta siempre (oculto con `hidden`) para no romper los unit tests; los e2e abren el panel antes de verificar el estado. |
| Badge "Resultados" | **Eliminado** del encabezado (queda solo el título). |
