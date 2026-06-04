# Decisión — Setup redesign: menos web, más game

**Estado:** **aprobado** — input para `01-prd-setup-redesign.md` (revisión humana 2026-06-01).
**Fecha:** 2026-06-01
**Idioma del documento:** español
**Audiencia:** producto, diseño, desarrollo (frontend), QA, agente de planificación

**Referencias:**

- Backlog (origen de la idea): [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — entrada *Setup redesign — menos web, más game* (2026-05-27).
- Brief visual integral (paleta, pergamino, chunky): [`../../requirements/05-prd-rediseno-visual-brief-diseno.mdc`](../../requirements/05-prd-rediseno-visual-brief-diseno.mdc).
- Estado actual del producto: [`../../requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc).
- Implementación vigente: `src/features/setup/SetupView.tsx`, `src/features/home/HomeView.tsx`, `src/features/home/HomeModeCard.tsx`, `src/App.tsx`, `src/services/product-rules.ts`.
- Reglas del repo: `.cursor/rules/docs-tasks-conventions.mdc`, `.cursor/rules/core.mdc`, `.cursor/rules/privacy.mdc`.

---

## 1. Propósito de este documento

Cerrar **antes** del PRD las decisiones de producto y diseño para que la pantalla de configuración deje de sentirse como un formulario web largo y pase a comportarse como **lobby de partida**: elegir modo, iniciar rápido, afinar opciones debajo.

Este documento **no es un PRD**: define jerarquía de UI, reglas por modo (especialmente AI), copy, assets y límites de alcance. El PRD (`01-prd-setup-redesign.md`) traduce estas decisiones en requisitos, criterios de aceptación y checklist de tests.

---

## 2. Contexto del problema

### 2.1 Comportamiento y UI actuales relevantes

- `SetupView.tsx` presenta un único panel pergamino con formulario lineal: idioma → jugadores → nombres → **modo (radios)** → tags AI → continente → anti-cheat → preguntas → aviso “configuración válida” → preview JSON → CTAs fuera del panel.
- El CTA principal (`Iniciar partida`) está **debajo** del panel; en móvil el usuario debe hacer scroll para empezar.
- El modo de juego no es el primer foco visual; compite con campos de configuración.
- En modo AI: hasta 6 jugadores (`PRODUCT_RULES.players.max`), número de preguntas editable, aviso `aiStrictRequired`, anti-cheat visible (aunque se fuerza `strict` en `App.tsx`).
- La card **Partida** en `HomeView` describe solo país y capital; no menciona el modo AI.
- Existen paneles de depuración/producto (`configPreviewHeading` + JSON, `validConfig`) que refuerzan sensación “herramienta”.

### 2.2 Restricciones a respetar

- **Defaults de partida** sin cambio de intención: misma lógica de pool, scoring, anti-cheat forzado en AI, generación de batch, HUD y mapa.
- Mobile-first: modo + CTA visibles sin scroll en viewports típicos (implica cards compactas en móvil).
- i18n ES/EN en `src/i18n/resources/`.
- Accesibilidad: foco visible, roles/labels; modo como radiogroup aunque la UI sean cards.
- Sin nuevas dependencias npm salvo aprobación explícita del usuario.
- No rediseñar partida, resultados, mapa ni HUD en esta iteración (salvo lo que derive de reglas de setup en `App.tsx` / validación).

---

## 3. Decisión global

> El setup se divide en **lobby** (fuera del pergamino: tres cards de modo + **Jugar ahora**) y **panel de configuración** (pergamino existente, reordenado). El jugador puede iniciar en pocos toques con defaults actuales; la configuración avanzada queda debajo sin bloquear el path rápido. El modo AI acota a **2 jugadores** y **5 preguntas fijas** (ocultas en setup); al cambiar de/ hacia AI se resetea el conteo de preguntas a 5.

---

## 4. D1 — Jerarquía: lobby vs panel de configuración (cerrada)

**Decisión:**

| Zona | Contenido | Contenedor visual |
|------|-----------|-------------------|
| **Lobby** | Tres cards verticales (País, Capital, IA Trivia) + botón ancho **Jugar ahora** | **Fuera** del panel pergamino; elementos “flotando” sobre `bg-paper` (misma anchura máxima que el pergamino: `max-w-4xl`) |
| **Panel de configuración** | Formulario actual reordenado (ver D4, D5, D9) | Panel pergamino existente (`Panel` + `setup-panel-background`) |
| **Pie de página** | Segundo **Jugar ahora** + **Volver al home** | Debajo del pergamino (como hoy, fuera del form interno) |

**Encabezado del panel:** se mantiene el título actual **“Panel de configuración”** (`setup.title`). El lead (`setup.lead`) se actualiza en D9 (no se elimina el bloque de título).

**Above the fold (móvil):** las tres cards + **Jugar ahora** del lobby deben entrar **enteras** en la primera pantalla. Implicación de implementación: altura/aspect ratio de cards **más compactas** en breakpoints pequeños; en desktop/tablet horizontal las cards pueden crecer en altura para mostrar más imagen de fondo.

**CTA duplicado:** coexisten **Jugar ahora** en el lobby (arriba) y **Jugar ahora** abajo (misma etiqueta i18n, mismo `disabled={!canStartGame}`, misma acción `onStartGame`). No hay `<form>` envolvente; botones sueltos con `type="button"` / submit explícito como hoy.

---

## 5. D2 — Cards de modo en el lobby (cerrada)

**Decisión:** reemplazar el `FieldRadioGroup` de modo por **tres cards** seleccionables, reutilizando el patrón visual de `HomeModeCard` (imagen superior + nombre debajo; sin descripción en la card).

| Aspecto | Regla |
|---------|--------|
| Layout | Tres columnas en **todas** las anchuras (móvil incluido), usando el ancho completo del contenedor (`grid-cols-3`) |
| Desktop / horizontal | Cards más altas; más área visible de imagen de fondo |
| Contenido | Solo **nombre** del modo (`modeCountry`, `modeCapital`, `modeAi`) |
| Selección | Una sola card activa (equivalente a radio) |
| Estado seleccionado | **Borde rojo** (`border-action` / `#D94C38`, alineado al acento acción del design system), análogo al indicador del radio actual |
| Semántica a11y | `role="radiogroup"` en el contenedor; cada card `role="radio"` + `aria-checked`; navegación por teclado (flechas / tab + activación) |
| `data-testid` | `setup-mode-country`, `setup-mode-capital`, `setup-mode-ai` (convención a confirmar en PRD; obligatorio para e2e) |

**Componente:** extraer o adaptar desde `HomeModeCard` un `SetupModeCard` (o variante parametrizada) en `src/features/setup/`, sin romper la home.

**Assets (Fase 1):** placeholders en `src/assets/` (nombres propuestos):

- `setup-card-country.png` (placeholder)
- `setup-card-capital.png` (placeholder)
- `setup-card-ai.png` (placeholder)

**Brief de ilustración (sustitución posterior, sin bloquear release):**

| Modo | Dirección visual |
|------|------------------|
| País | Mapa / pin sobre territorio, tono exploración |
| Capital | Ciudad / edificio icónico + pin, coherente con pergamino/madera |
| IA Trivia | Pergamino + “chispa” / tinta mágica; diferenciado de las cards de Home |

Formato: PNG/WebP optimizado, ratio coherente con `HomeModeCard` (`aspect-[16/10]` en zona imagen), licencia clara (propia o CC0).

---

## 6. D3 — Home: card Partida menciona los tres modos (cerrada)

**Decisión:** actualizar copy de la card **Partida** en namespace `home` (ES + EN):

- **Descripción:** mencionar explícitamente los tres modos (país, capital, trivia con IA) en una o dos frases cortas.
- **`ariaLabel`:** incluir los tres modos para lectores de pantalla.

**Propuesta de copy (aprobada como base del PRD; ajuste fino en i18n permitido sin cambiar intención):**

| Clave | ES (propuesta) | EN (propuesta) |
|-------|----------------|----------------|
| `home.gameCard.description` | Partida de geografía en el mapa: modo **país**, **capital** o **trivia con IA**. Configurá jugadores y región, o empezá con un toque. | A geography match on the map: **country**, **capital**, or **AI trivia**. Set players and region, or jump in with defaults. |
| `home.gameCard.ariaLabel` | Iniciar partida: elegir entre modo país, capital o trivia con IA | Start a match: choose country, capital, or AI trivia mode |

La card de **Modo aprendizaje** no se modifica en esta iteración.

---

## 7. D4 — Orden y visibilidad dentro del pergamino (cerrada)

**Orden de campos** (de arriba a abajo):

1. **Tags temáticos** (`AiTriviaTagsPicker`) — **solo si** `questionMode === 'ai'`, primera opción dentro del pergamino.
2. **Idioma** (`FieldSelect` app-locale) — primera opción cuando el modo **no** es AI; si es AI, va **debajo** de tags.
3. Cantidad de jugadores + nombres.
4. **Continente** (`FieldSelect` región) — label actualizado (D8).
5. **Anti-cheat** — **oculto** si `questionMode === 'ai'` (F20); visible en país/capital.
6. **Número de preguntas** — **oculto** si `questionMode === 'ai'` (D6); visible en país/capital.

**Eliminados del pergamino:**

- Alerta de éxito `validConfig` (“Configuración válida…”).
- Panel preview JSON (`configPreviewHeading` + `setupDraft`).
- Aviso `aiStrictRequired` (desaparece; el strict sigue aplicándose en servidor de estado `App.tsx`).

**Feedback:** solo **errores** (`Alert` tone error): validación de dominio, schema, y `setupSubmitMessage` informativo si aplica (sin cartel de éxito).

**Bloque “preguntas disponibles / rango”:** oculto completo en modo AI (D15). En país/capital se mantiene; copy del bloque se limpia en D9.

---

## 8. D5 — Reglas de producto modo AI en setup (cerrada)

**Decisión:** extender `PRODUCT_RULES` con bloque dedicado (fuente única para UI, `validateConfig`, schema Zod y tests):

```ts
// Forma orientativa; el PRD fija nombres exactos de claves
ai: {
  maxPlayers: 2,
  fixedQuestionCount: 5,
}
```

| Regla | Comportamiento |
|-------|----------------|
| Máximo jugadores | **2** en modo AI (mínimo sigue **1**) |
| Preguntas | Siempre **5** en AI; el control no se muestra |
| Al **entrar** en modo AI | `questionCount` → **5**; si `playerCount > 2`, **recortar** a 2 y **avisar** (toast/alert info, copy i18n nuevo, `aria-live="polite"`) |
| Al **salir** de modo AI | `questionCount` → **5** (reset; el default global ya es 5) |
| Anti-cheat UI | Oculto; `effectiveAntiCheatMode` sigue siendo `strict` en `App.tsx` |
| Validación | `validateConfig` / `setup-config-schema` rechazan AI con >2 jugadores o `questionCount !== 5` |

**Relación con backlog *Modo AI — control de costo* (C1):** el tope de **3 jugadores** propuesto en backlog queda **sustituido** por **2 jugadores** en esta iteración. Al cerrar el PRD, actualizar la entrada del backlog (ver §12).

**Pantalla de juego:** sin cambios de criterio: el HUD sigue mostrando `Ronda X / Y` con Y=5 en partidas AI.

---

## 9. D6 — Copy y micro-UX del setup (alcance ampliado, cerrada)

Cambios de copy y chrome **dentro del alcance** (listado explícito para evitar “rediseño total” no planificado):

| Elemento | Decisión |
|----------|----------|
| `setup.badge` | Actualizar: quitar tono “MVP técnico”; ej. “Preparar partida” / “Match setup” |
| `setup.lead` | Acortar y orientar a “elegí modo arriba y afiná acá si querés” |
| `setup.regionLabel` | ES: **“Elige un continente”**; EN: **“Choose a continent”** (opción **Mundo** se mantiene) |
| `setup.startGame` | Renombrar clave o reutilizar valor: **“Jugar ahora”** / **“Play now”** (ambos CTAs) |
| Bloque `questionsAvailable` + `questionRange` | Mantener en país/capital; redactar más jugable, menos “panel técnico” (propuesta en PRD) |
| `setup.questionModeLegend` | Ya no visible como legend de radios; opcional mantener clave para SR-only o eliminar en implementación si no se usa |
| Claves obsoletas | `validConfig`, `configPreviewHeading`, `aiStrictRequired` — dejar de usarse en UI (pueden permanecer en i18n hasta limpieza o borrarse en la misma iteración) |
| Nuevas claves | Aviso recorte jugadores AI (`setup.aiPlayersClamped` o similar) ES/EN |

**Fuera de alcance explícito (no hacer en esta iteración):**

- Cambiar paleta global, tipografías o tokens (`tokens.css`).
- Rediseñar `AiTriviaTagsPicker` (chips siguen igual; solo cambia posición).
- Animaciones de transición entre modos.
- Renombrar botón “Setup” en partida (backlog aparte).
- Ilustraciones finales de cards (solo placeholders + brief D2).
- Mover selector de idioma al header global.

---

## 10. D7 — Validación, estado y tests (cerrada)

| Tema | Decisión |
|------|----------|
| CTA habilitado | `canStartGame` igual que hoy; botones deshabilitados si config inválida |
| Props `setupDraft` | Dejar de renderizar JSON; el PRD puede eliminar la prop de `SetupView` si ya no se usa |
| Tests unitarios | Actualizar tests de `SetupView`, validación AI, `product-rules` |
| Tests e2e | Actualizar flujos que usan radios de modo, preview JSON, mensaje “configuración válida”; añadir selección por cards y path “Jugar ahora” arriba |
| `data-testid` | Conservar IDs estables donde existan; documentar nuevos en PRD |

---

## 11. Relación con PRDs e iteraciones previas

| Origen | Relación |
|--------|----------|
| [`05-prd-rediseno-visual-brief-diseno.mdc`](../../requirements/05-prd-rediseno-visual-brief-diseno.mdc) §8 Setup | **Implementación diferida** de look lúdico completo; esta iteración ejecuta la jerarquía “lobby + pergamino” acordada en backlog |
| [`modo-ai-trivia-ux-feedback/00-decision-ux-feedback-modo-ai.md`](../modo-ai-trivia-ux-feedback/00-decision-ux-feedback-modo-ai.md) §11 | Topes Setup AI (3 jugadores) **aplazados** allí; **cerrados aquí** con 2 jugadores |
| [`ideas-features-backlog.md`](../ideas-features-backlog.md) C1 | Tope **3 → 2** jugadores AI; actualizar nota al promover/cerrar |
| Motor de juego / API AI | **Sin cambios** de contrato; solo límites de config en cliente + validación compartida |

**Callouts de superseding:** no se modifican PRDs inmutables de modo AI trivia por esta iteración (no cambia scoring, intentos ni API). Si el PRD MVP original menciona setup literal, el `01-prd-setup-redesign.md` llevará §0 “Cambios respecto a iteraciones previas” según `docs-tasks-conventions.mdc`.

---

## 12. Acciones de backlog y repo (cerradas)

1. Mover *Setup redesign — menos web, más game* de **Ideas pendientes** → **En ejecución** con link a [`setup-redesign/`](./).
2. En *Modo AI — control de costo y robustez API*, sub-feature **C1**: anotar que el tope de jugadores en setup quedó en **2** vía [`00-decision-setup-look-and-feel.md`](./00-decision-setup-look-and-feel.md) (2026-06-01); C2 (reintentos batch) sigue pendiente.
3. Carpeta de iteración: `docs/tasks/setup-redesign/` (confirmada).
4. Próximo artefacto: `01-prd-setup-redesign.md` + actualización de [`README.md`](./README.md) de la carpeta.

---

## 13. Fuera de alcance (esta iteración)

| Tema | Dónde vive |
|------|------------|
| Auto-zoom mapa (`fit-bounds`) | Backlog *Mapa — auto-zoom post-respuesta* |
| Reintentos batch LLM (C2) | Backlog *Modo AI — control de costo* |
| Pista `justification` | Backlog *Modo AI — pista vía justification* |
| Audio / mute | Backlog *Audio del juego* |
| Renombrar botón Setup en partida + confirmación | Backlog *Botón “Setup”* |
| Rediseño de tags, HUD, mapa, resultados | Fuera de D1–D9 |

---

## 14. Cierre de preguntas (2026-06-01)

Todas las respuestas del product owner quedaron incorporadas en D1–D9. Resumen de cierres críticos:

| Tema | Resolución |
|------|------------|
| Jugadores AI | Máx. **2**; recorte automático + aviso |
| Preguntas AI | Fijas **5**; UI oculta; reset al cambiar modo |
| Layout modo | 3 cards verticales siempre; lobby fuera del pergamino |
| CTA | **Jugar ahora** arriba y abajo; `disabled` si inválido |
| Tags AI | Primera fila del pergamino cuando modo AI |
| Anti-cheat / aviso strict | Ocultos en AI |
| Preview JSON / éxito | Eliminados de UI |
| Continente | “Elige un continente” / “Choose a continent” |
| Home | Descripción + aria con tres modos |
| `PRODUCT_RULES.ai` | Sí, fuente única |
| Tests | Actualizar unit + e2e |

**Próximo paso:** redactar `01-prd-setup-redesign.md` y actualizar `ideas-features-backlog.md` + `README.md` de la carpeta.
