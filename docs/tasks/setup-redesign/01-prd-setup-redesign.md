# PRD — Setup redesign: menos web, más game

**Estado:** **borrador** — pendiente de aprobación humana antes de plan e implementación.
**Fecha:** 2026-06-04
**Idioma del documento:** español
**Audiencia:** desarrollo (frontend), QA, planificación de tareas

**Referencias obligadas:**

- Decisión que origina este PRD: [`00-decision-setup-look-and-feel.md`](./00-decision-setup-look-and-feel.md) — D1–D9 y §14 (cierre 2026-06-01) + aclaraciones 2026-06-04 (recorte de jugadores, assets, claves i18n).
- Brief visual integral: [`../../requirements/05-prd-rediseno-visual-brief-diseno.mdc`](../../requirements/05-prd-rediseno-visual-brief-diseno.mdc) §8 (Setup) y §7 (sistema visual).
- PRD MVP (setup base): [`../../requirements/01-prd-mvp-producto-y-requerimientos.mdc`](../../requirements/01-prd-mvp-producto-y-requerimientos.mdc) §RF-01/RF-02.
- Estado actual del producto: [`../../requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc).
- Backlog: [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — *Setup redesign* (En ejecución) y *Modo AI — control de costo* C1.
- Reglas del repo: `.cursor/rules/docs-tasks-conventions.mdc`, `.cursor/rules/core.mdc`, `.cursor/rules/privacy.mdc`, `.cursor/rules/dependency-security.mdc`.

---

## 0. Cambios respecto a iteraciones previas

| Origen | Decisión previa | Estado en esta iteración |
|--------|-----------------|--------------------------|
| `01-prd-mvp-producto-y-requerimientos.mdc` §RF-01 (setup) | Setup permite elegir cantidad de jugadores (1–6) y cantidad de preguntas en todos los modos. | **Extendida** por RF-S30: en modo AI el máximo es **2 jugadores** y la cantidad de preguntas se fija en **5** (oculta en UI). País/capital conservan 1–6 y conteo editable. |
| `01-prd-mvp-producto-y-requerimientos.mdc` §RF-02 (validaciones) | Impedir iniciar con configuración inválida; feedback en tiempo real. | **Sigue vigente**; se reduce el feedback a **solo errores** (se elimina el cartel de éxito y el preview JSON). |
| `00-decision-ux-feedback-modo-ai.md` §11 (Topes Setup AI aplazados) | Topes de jugadores/preguntas aplazados a otra iteración (proponía 3 jugadores). | **Sustituida**: cerrada aquí con **2 jugadores** y **5 preguntas fijas**. |
| Backlog *Modo AI — control de costo* C1 | Máximo 3 jugadores y 5 preguntas por jugador en AI. | **Sustituida** (jugadores 3 → 2). C2 (reintentos backend) sigue pendiente. |

El callout de superseding sobre el PRD MVP (regla `docs-tasks-conventions.mdc`) se agrega al **inicio de implementación**, no antes.

---

## 1. Resumen

Rediseñar `SetupView` para que se sienta como **lobby de partida** y no como formulario web. Se separa la pantalla en dos zonas:

- **Lobby** (fuera del pergamino): tres cards verticales de modo (País, Capital, IA Trivia) + botón ancho **Jugar ahora**. El jugador puede iniciar en pocos toques con los defaults actuales.
- **Panel de configuración** (pergamino existente, reordenado): opciones avanzadas debajo, sin bloquear el path rápido.

Reglas de producto nuevas para **modo AI**: máximo **2 jugadores** y **5 preguntas fijas** (ocultas). Limpieza de UX: se elimina preview JSON, cartel de "configuración válida" y aviso de anti-cheat estricto; el feedback queda **solo para errores**. Copy de Home y Setup actualizado para reflejar los tres modos y un tono más lúdico.

**Sin cambios** al motor de juego, scoring, contrato API AI (`shared/ai-trivia-api.ts`), Convex, mapa, HUD ni resultados. **Sin nuevas dependencias npm.**

---

## 2. Decisiones de producto (cerradas)

Heredadas del ADR `00-decision-setup-look-and-feel.md` + aclaraciones 2026-06-04. Resumen accionable:

| Tema | Decisión |
|------|----------|
| Jerarquía | Lobby (cards + CTA) **fuera** del pergamino; panel de configuración debajo; segundo CTA + "Volver al home" al pie. |
| Cards de modo | Patrón `HomeModeCard`; solo nombre; 3 columnas en todas las anchuras; seleccionado = **borde rojo** (`border-action`). |
| Selección a11y | `role="radiogroup"` + `role="radio"` + `aria-checked`; **título visible corto** sobre las cards. |
| Assets de cards | **Placeholder por CSS** (color/gradiente del design system) en Fase 1; brief de ilustración para sustitución posterior. |
| Tags AI | Primera opción **dentro** del pergamino cuando `questionMode === 'ai'`. |
| Idioma | Primera opción del pergamino cuando el modo no es AI (debajo de tags si es AI). |
| Modo AI — jugadores | Máx. **2** (mín. 1). Al entrar con >2: conservar los **2 primeros** (con sus nombres) + **popup** que avisa el tope. |
| Modo AI — al salir | La cantidad de jugadores **se queda en 2** (no se restaura el valor previo). |
| Modo AI — preguntas | Fijas en **5**; control oculto; reset a 5 al cambiar de modo (entrar o salir). |
| Modo AI — anti-cheat | Control oculto; aviso `aiStrictRequired` eliminado; `strict` sigue forzado en `App.tsx`. |
| Feedback | Solo **errores**. Se elimina cartel de éxito (`validConfig`) y preview JSON (`configPreviewHeading`). |
| Continente | Label "Elige un continente" / "Choose a continent"; opción **Mundo** se mantiene. |
| Home | Card Partida menciona los tres modos en `description` y `ariaLabel`. |
| `PRODUCT_RULES.ai` | Bloque nuevo `{ maxPlayers: 2, fixedQuestionCount: 5 }` como fuente única. |
| Claves i18n obsoletas | **Eliminar** `validConfig`, `configPreviewHeading`, `aiStrictRequired` (y `questionModeLegend` si deja de usarse). |
| CTA | "Jugar ahora" / "Play now" en ambos botones; `disabled` si config inválida. |

---

## 3. User stories

| ID | Como… | Quiero… | Para… |
|----|-------|---------|-------|
| US-01 | Jugador casual | ver los tres modos como cards grandes apenas entro al setup | entender de inmediato qué puedo jugar sin leer un formulario |
| US-02 | Jugador con prisa | tocar un modo y pulsar "Jugar ahora" sin scrollear | empezar una partida en pocos toques con la configuración por defecto |
| US-03 | Jugador en móvil | ver las 3 cards + el botón completos sin hacer scroll | decidir y arrancar desde la primera pantalla |
| US-04 | Jugador que quiere afinar | abrir el panel de configuración debajo y ajustar jugadores, continente y anti-cheat | personalizar la partida cuando lo deseo, no obligatoriamente |
| US-05 | Jugador de modo IA | que la pantalla me muestre solo lo relevante para IA (tags, jugadores) | no perder tiempo con preguntas o anti-cheat que no puedo cambiar |
| US-06 | Jugador de modo IA con grupo grande | recibir un aviso claro si elijo IA con más de 2 jugadores | entender por qué se ajustó la cantidad sin sentir un error |
| US-07 | Usuario que navega con teclado/lector | seleccionar el modo con flechas y saber cuál está activo | usar el setup de forma accesible |
| US-08 | Jugador nuevo desde Home | leer en la card "Partida" que existe modo país, capital y trivia con IA | descubrir el modo IA antes de entrar |
| US-09 | Jugador que se equivoca en la config | ver solo los errores que bloquean el inicio, no carteles técnicos | corregir rápido sin ruido visual |

---

## 4. Requerimientos funcionales con criterios de aceptación

Nomenclatura: `RF-S##` (Setup). Cada RF lista criterios de aceptación verificables (Gherkin abreviado).

### 4.1 Lobby y jerarquía

**RF-S10 — Lobby fuera del pergamino**
La pantalla de setup muestra, **antes** del panel pergamino y fuera de él: (a) un título corto del grupo de modo, (b) tres cards de modo, (c) un botón ancho "Jugar ahora".

- DADO que estoy en el setup, CUANDO carga la pantalla, ENTONCES veo las 3 cards de modo y el botón "Jugar ahora" por encima del panel de configuración.
- El bloque del lobby usa el mismo ancho máximo que el pergamino (`max-w-4xl`) y no está contenido dentro del `Panel`.

**RF-S11 — Above the fold en móvil**
En viewports móviles típicos (referencia ≤ 390×844, p. ej. iPhone SE/12), las 3 cards + el botón "Jugar ahora" entran **completos** sin scroll.

- DADO un viewport de 390px de ancho, CUANDO carga el setup, ENTONCES las 3 cards y el CTA "Jugar ahora" son visibles sin desplazamiento vertical.
- Las cards reducen su altura en breakpoints pequeños (más compactas) y crecen en desktop/horizontal mostrando más imagen/fondo.

**RF-S12 — CTA duplicado**
"Jugar ahora" aparece dos veces: en el lobby (arriba) y al pie (debajo del pergamino). Ambos comparten etiqueta i18n, acción (`onStartGame`) y estado `disabled`.

- DADO config válida, CUANDO pulso cualquiera de los dos "Jugar ahora", ENTONCES inicia la partida con la misma configuración.
- DADO config inválida, ENTONCES ambos botones están `disabled`.

**RF-S13 — Botón Volver al home**
"Volver al home" se mantiene al pie, después del segundo CTA.

- CUANDO pulso "Volver al home", ENTONCES navego a la vista home sin iniciar partida.

### 4.2 Cards de modo

**RF-S20 — Cards seleccionables como radiogroup**
Las cards reemplazan el `FieldRadioGroup` de modo. Reutilizan el patrón visual de `HomeModeCard` (zona de imagen/fondo + nombre). Muestran **solo el nombre** del modo.

- El contenedor tiene `role="radiogroup"` con nombre accesible (título visible corto, p. ej. "Elegí un modo").
- Cada card tiene `role="radio"` y `aria-checked` reflejando la selección.
- Exactamente una card está seleccionada en todo momento (comportamiento equivalente a radio).
- Cada card expone `data-testid`: `setup-mode-country`, `setup-mode-capital`, `setup-mode-ai`.

**RF-S21 — Estado seleccionado visible**
La card seleccionada se distingue con **borde rojo** (`border-action` / `#D94C38`), coherente con el indicador del radio actual; el estado no depende solo del color (también `aria-checked` y, opcionalmente, refuerzo de grosor/sombra).

- DADO modo "País" seleccionado, ENTONCES la card País muestra borde rojo y `aria-checked="true"`; las otras `aria-checked="false"`.

**RF-S22 — Navegación por teclado**
El radiogroup es operable por teclado: foco al grupo, flechas para cambiar de opción, foco visible.

- DADO foco en el radiogroup, CUANDO presiono flecha derecha/izquierda, ENTONCES cambia la card seleccionada y se anuncia su estado.
- El foco visible cumple contraste.

**RF-S23 — Placeholder de assets por CSS**
En Fase 1, el fondo de cada card usa un **placeholder por CSS** (color/gradiente del design system), sin archivo de imagen. La estructura permite sustituir por imagen sin refactor.

- No se introducen archivos binarios de imagen en esta iteración para las cards de modo.
- El brief de ilustración queda documentado (ADR §5) para iteración posterior.

### 4.3 Panel de configuración (pergamino)

**RF-S24 — Orden de campos**
Dentro del pergamino, el orden es:
1. Tags temáticos (`AiTriviaTagsPicker`) — solo si `questionMode === 'ai'`.
2. Idioma.
3. Cantidad de jugadores + nombres.
4. Continente.
5. Anti-cheat — solo si el modo **no** es AI.
6. Número de preguntas — solo si el modo **no** es AI.

- DADO modo país/capital, ENTONCES no se ven tags y sí se ven anti-cheat y número de preguntas.
- DADO modo AI, ENTONCES los tags son el primer control del pergamino y no se ven anti-cheat ni número de preguntas.

**RF-S25 — Eliminación de ruido visual**
Se eliminan de la UI: el cartel de éxito "Configuración válida…" (`validConfig`), el panel preview JSON (`configPreviewHeading` + `setupDraft`), y el aviso `aiStrictRequired`.

- En ningún estado válido aparece un cartel de éxito.
- No se renderiza JSON de configuración en la pantalla.
- En modo AI no aparece el aviso de anti-cheat estricto.

**RF-S26 — Feedback solo de errores**
El feedback de validación se muestra **únicamente** cuando hay errores (dominio o schema) que bloquean el inicio, vía `Alert tone="error"` con `aria-live`/`role` adecuado.

- DADO un nombre de jugador vacío, ENTONCES se muestra el error correspondiente y los CTAs quedan `disabled`.
- DADO config válida, ENTONCES no se muestra ningún Alert de validación.

**RF-S27 — Idioma como primera opción (no AI)**
El selector de idioma se mantiene en el pergamino. Es el primer control cuando el modo no es AI; cuando es AI, va inmediatamente debajo de los tags.

**RF-S28 — Label de continente**
El label del selector de región pasa a "Elige un continente" (ES) / "Choose a continent" (EN). La opción "Mundo"/"World" se conserva en la lista.

### 4.4 Reglas de modo AI

**RF-S30 — `PRODUCT_RULES.ai` como fuente única**
Se agrega `PRODUCT_RULES.ai = { maxPlayers: 2, fixedQuestionCount: 5 }`. UI, `validateConfig`, schema Zod y tests leen de esta fuente (sin números mágicos duplicados).

**RF-S31 — Tope de 2 jugadores en AI con popup**
Al cambiar a modo AI con `playerCount > 2`: se recorta a **2 jugadores conservando los 2 primeros** (con sus nombres) y se muestra un **aviso emergente** informando que el modo AI permite por ahora un máximo de 2 jugadores.

- DADO 5 jugadores en país, CUANDO selecciono AI, ENTONCES `playerCount` pasa a 2, se conservan los nombres de Jugador 1 y 2, y aparece el aviso.
- El aviso es un toast/banner que **se auto-oculta** tras unos segundos y se anuncia con `aria-live="polite"`.
- DADO ≤ 2 jugadores, CUANDO selecciono AI, ENTONCES no aparece el aviso de recorte.

**RF-S32 — Máximo de jugadores acotado en AI**
Mientras el modo es AI, el control de jugadores no permite superar 2 (input `max=2`); el mínimo sigue siendo 1.

- DADO modo AI, CUANDO intento subir a 3 jugadores, ENTONCES el valor se limita a 2.

**RF-S33 — Preguntas fijas en AI (ocultas)**
En modo AI el número de preguntas es siempre **5**, sin control visible. El valor 5 se usa internamente en la request al backend y en la pantalla de juego (HUD muestra "Ronda X / 5").

- DADO modo AI, ENTONCES no existe control de número de preguntas en el setup.
- CUANDO inicio una partida AI, ENTONCES la sesión usa `questionCount === 5`.

**RF-S34 — Reset de preguntas al cambiar de modo**
Al **entrar** o **salir** de modo AI, `questionCount` se resetea a **5** (que es también el default global).

- DADO modo país con 8 preguntas, CUANDO selecciono AI y luego vuelvo a país, ENTONCES el número de preguntas en país es 5.

**RF-S35 — Persistencia del recorte al salir de AI**
Al volver de AI a país/capital, la cantidad de jugadores **permanece en 2** (no se restaura el valor previo).

- DADO 5 jugadores → AI (recorta a 2) → vuelvo a país, ENTONCES siguen 2 jugadores.

**RF-S36 — Anti-cheat forzado y oculto en AI**
En modo AI el control de anti-cheat no se muestra; `effectiveAntiCheatMode` sigue siendo `strict` al iniciar la partida (lógica de `App.tsx` intacta).

- CUANDO inicio una partida AI, ENTONCES la sesión se crea con `antiCheatMode: 'strict'`.

**RF-S37 — Validación alineada**
`validateConfig` y `setup-config-schema` rechazan configuraciones AI con `players.length > 2` o `questionCount !== 5`, devolviendo errores i18n existentes/nuevos.

- DADO una config AI manipulada con 3 jugadores, ENTONCES la validación marca error y el inicio queda bloqueado.

### 4.5 Home

**RF-S40 — Copy de la card Partida con tres modos**
`home.gameCard.description` y `home.gameCard.ariaLabel` (ES/EN) mencionan explícitamente país, capital y trivia con IA.

- La card "Partida" en Home nombra los tres modos.
- El `aria-label` incluye los tres modos.
- La card "Modo aprendizaje" no cambia.

### 4.6 i18n y limpieza

**RF-S50 — Claves nuevas y eliminadas**
- Se agrega clave para el aviso de recorte de jugadores AI (p. ej. `setup.aiPlayersClamped`) en ES/EN.
- Se agrega/ajusta título del grupo de modo y label de continente en ES/EN.
- Se **eliminan** de `es.ts`/`en.ts`: `validConfig`, `configPreviewHeading`, `aiStrictRequired`, y `questionModeLegend` si deja de usarse.

- Tras la limpieza, no quedan referencias en código a claves eliminadas (verificable por `tsc`/grep).

---

## 5. Requerimientos no funcionales

### 5.1 Performance

- **RNF-P01:** el rediseño no agrega dependencias npm ni assets binarios nuevos (cards por CSS). El peso del bundle del setup no aumenta de forma significativa.
- **RNF-P02:** la selección de modo y el recorte de jugadores son operaciones de estado locales (sin llamadas de red). El cambio de modo no dispara fetch al backend; la request AI sigue ocurriendo solo al iniciar partida.
- **RNF-P03:** sin animaciones permanentes costosas; transiciones de selección de card livianas (border/shadow), respetando `prefers-reduced-motion`.

### 5.2 Seguridad y privacidad

- **RNF-S01:** sin nuevos logs con PII; los nombres de jugador no se registran (regla `privacy.mdc`).
- **RNF-S02:** el tope de 2 jugadores y 5 preguntas en AI se valida también en `validateConfig`/schema (defensa en cliente); la request al backend nunca pide más de 5 ítems en AI, acotando costo/abuso de LLM.
- **RNF-S03:** no se exponen secretos ni variables sensibles; sin cambios en `VITE_*`.

### 5.3 Escalabilidad y mantenibilidad

- **RNF-E01:** `PRODUCT_RULES.ai` centraliza los límites; cambiar el tope (p. ej. a 3) implica un solo punto de edición + tests.
- **RNF-E02:** el componente de card de modo (`SetupModeCard` o variante de `HomeModeCard`) queda reutilizable y parametrizable por assets, sin acoplarse al setup.
- **RNF-E03:** la estructura de card permite sustituir el placeholder CSS por imagen sin refactor de layout.

### 5.4 Accesibilidad

- **RNF-A01:** radiogroup de modo navegable por teclado, con `aria-checked` y foco visible (RF-S20/S22).
- **RNF-A02:** distinción de modo seleccionado no depende solo del color (borde + estado ARIA).
- **RNF-A03:** avisos dinámicos (recorte de jugadores, errores) usan `aria-live` apropiado.
- **RNF-A04:** contraste de texto y CTAs cumple lo definido en el brief visual.

### 5.5 Compatibilidad / i18n

- **RNF-I01:** todos los textos nuevos existen en ES y EN; sin strings hardcodeados.
- **RNF-I02:** el rediseño no rompe roles/labels críticos de tests salvo los cambios intencionales documentados (cards en vez de radios, eliminación de preview/éxito).

---

## 6. Casos límite y escenarios de error

| # | Escenario | Comportamiento esperado |
|---|-----------|--------------------------|
| E-01 | Selecciono AI con 6 jugadores | Recorte a 2 (Jugador 1 y 2 con sus nombres), aviso auto-oculto; CTAs habilitados si lo demás es válido. |
| E-02 | Selecciono AI con 1 jugador | Sin aviso; queda en 1 (mínimo permitido). |
| E-03 | AI → país → AI repetidas veces | Cada entrada a AI fija preguntas en 5 y mantiene jugadores ≤ 2; cada salida resetea preguntas a 5; jugadores no suben solos. |
| E-04 | Nombre de jugador vacío | Error de validación visible, CTAs `disabled`; ningún cartel de éxito. |
| E-05 | Continente sin preguntas suficientes (pool vacío) en país/capital | Error de pool existente; en AI el conteo es fijo 5 y la disponibilidad de pool sigue las reglas del backend (sin bloqueo nuevo en setup más allá de lo existente). |
| E-06 | Config AI manipulada (devtools) con 3 jugadores o questionCount≠5 | `validateConfig`/schema rechazan; inicio bloqueado (RF-S37). |
| E-07 | Cambio de idioma con aviso de recorte visible | El aviso se re-renderiza en el idioma activo o se auto-oculta sin romper layout. |
| E-08 | `prefers-reduced-motion` activo | Transiciones de card y cualquier animación se reducen/eliminan. |
| E-09 | Viewport muy angosto (<360px) | Las 3 cards siguen en 3 columnas legibles; el nombre del modo no se trunca de forma ilegible (ajuste tipográfico). |
| E-10 | Teclado: Tab dentro del lobby | Orden de foco coherente: radiogroup → "Jugar ahora" → panel → CTA inferior → "Volver al home". |
| E-11 | Doble clic rápido en "Jugar ahora" | Una sola sesión iniciada; no se duplica la navegación ni la request AI. |
| E-12 | Selección de modo durante carga AI previa | No aplica en setup (la carga AI ocurre tras iniciar); el setup no permite estados intermedios de red. |

---

## 7. Fuera de alcance

| Tema | Dónde vive |
|------|------------|
| Cambiar paleta global, tipografías o tokens (`tokens.css`) | Brief visual integral / iteración aparte |
| Rediseñar `AiTriviaTagsPicker` (chips) | Solo cambia su posición, no su diseño |
| Ilustraciones finales de las cards de modo | Brief en ADR §5; iteración posterior (placeholder CSS por ahora) |
| Animaciones de transición entre modos | No incluido |
| Renombrar botón "Setup" en partida + confirmación de salida | Backlog *Botón "Setup"* |
| Auto-zoom del mapa (`fit-bounds`) | Backlog *Mapa — auto-zoom post-respuesta* |
| Reintentos batch LLM (C2) | Backlog *Modo AI — control de costo* |
| Pista vía `justification` | Backlog *Modo AI — pista vía justification* |
| Audio / mute | Backlog *Audio del juego* |
| Mover selector de idioma al header global | No incluido (idioma permanece en el pergamino) |
| Persistencia de preferencias de setup en `localStorage` | No incluido |
| Cambios en motor de juego, scoring, contrato API AI, Convex, HUD, mapa, resultados | No incluido |

---

## 8. Impacto técnico (orientativo, se detalla en el plan)

| Área | Archivos probables |
|------|--------------------|
| Reglas de producto | `src/services/product-rules.ts` (+ test) |
| Validación | `src/services/validate-config.ts`, `src/features/setup/setup-config-schema.ts` (+ tests) |
| Setup | `src/features/setup/SetupView.tsx`, nuevo `SetupModeCard` (o variante de `HomeModeCard`) |
| Estado de app | `src/App.tsx` (handlers de cambio de modo, recorte de jugadores, reset de preguntas, aviso) |
| Home | `src/features/home/HomeView.tsx` (copy) |
| i18n | `src/i18n/resources/es.ts`, `src/i18n/resources/en.ts` |
| Tests | unit de setup/validación/product-rules; e2e de selección por cards y path "Jugar ahora" |

---

## 9. Criterios de aceptación globales

1. Al entrar al setup, las 3 cards de modo y "Jugar ahora" son lo primero y, en móvil de referencia, entran sin scroll.
2. Seleccionar un modo y pulsar "Jugar ahora" inicia la partida con defaults, sin tocar el panel de configuración.
3. La card seleccionada se distingue por borde rojo + `aria-checked`; el grupo es navegable por teclado con título accesible visible.
4. En modo AI: máximo 2 jugadores (con aviso al recortar), sin control de preguntas (fijas en 5), sin control ni aviso de anti-cheat.
5. Al salir de AI, los jugadores quedan en 2 y las preguntas vuelven a 5.
6. No aparece preview JSON ni cartel de "configuración válida"; el feedback es solo de errores.
7. El label de región dice "Elige un continente" / "Choose a continent" y conserva "Mundo".
8. La card "Partida" de Home menciona los tres modos en texto y `aria-label`.
9. `PRODUCT_RULES.ai` es la fuente única de los límites; validación y UI lo respetan.
10. Claves i18n obsoletas eliminadas; sin strings hardcodeados; ES/EN completos.
11. `tsc`, lint, Vitest y e2e verdes (e2e actualizados para cards/CTA y reglas AI).
12. Sin nuevas dependencias npm ni cambios en motor, API o tokens globales.

---

## 10. Preguntas abiertas

_Ninguna pendiente al momento del borrador (2026-06-04). Las aclaraciones de recorte de jugadores, assets por CSS, claves i18n y título visible del grupo de modo quedaron cerradas._
