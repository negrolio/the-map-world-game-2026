# UX-HOME-01 — Actualizar portada (home): idioma, CTAs y limpieza técnica

**Estado:** pendiente  
**Prioridad:** media (primera impresión del producto)  
**Ámbito:** frontend — pantalla de inicio (`HomeView`)

**PRD de implementación (cards + assets):** [`02-prd-home-page-ux-cards.md`](./02-prd-home-page-ux-cards.md)

---

## Objetivo

Mejorar la **home** para que sea clara para jugadores finales: idioma accesible pero discreto, un camino principal obvio hacia el juego, modo aprendizaje como opción secundaria, y sin elementos de depuración visibles.

---

## Situación actual

En `src/features/home/HomeView.tsx`:

- El **selector de idioma** está en un `Panel` centrado bajo el lead (reutiliza `FieldSelect` y textos de `setup`).
- **«Modo aprendizaje»** usa `ChunkyButton` `tone="primary"` y va **antes** que «Comenzar setup» (`tone="secondary"`).
- Existe el botón **«Ver estado técnico»** (`home.viewTechnical`) **sin** `onClick` — no hace nada.
- Abajo hay un **`Panel`** con «Estado técnico», versión del dataset y chips de módulos (`shellModules` / `datasetVersion` pasados desde `App.tsx`).

Copys actuales (es): `startSetup: 'Comenzar setup'`, `startLearn: 'Modo aprendizaje'` — «setup» no comunica bien que es el inicio del **juego**.

---

## Cambios solicitados

### 1. Selector de idioma en esquina superior

- Mover la selección de idioma a la **esquina superior derecha o izquierda** (definir en implementación; debe ser visible en móvil y desktop).
- No debe ocupar el centro de la pantalla ni un panel grande.
- Mantener los locales soportados (`es` / `en`) y la persistencia vía i18n existente.
- Reutilizar patrones de UI del proyecto si ya hay un control compacto; si no, un toggle o select minimal en header fijo (`position` / layout de cabecera).

### 2. Eliminar controles y panel de estado técnico

- **Quitar** el botón «Ver estado técnico» / `viewTechnical`.
- **Quitar** el panel inferior de «Estado técnico» (dataset version + listado de módulos).
- Valorar si `shellModules` y `datasetVersion` dejan de pasarse a `HomeView` desde `App.tsx` (limpieza de props muertas).

### 3. Jerarquía visual y copy de botones

- El CTA principal debe ser el que **inicia el juego** (hoy `onStartSetup` → vista `setup`), no el modo aprendizaje.
- **Modo aprendizaje** queda como acción **secundaria** (tono, tamaño y/o posición inferior o lateral respecto al primario).
- Mejorar textos i18n para que «Comenzar setup» se entienda como empezar a jugar, por ejemplo (borrador, afinar en implementación):
  - ES: «Jugar», «Empezar partida», «Configurar partida» o similar.
  - EN: equivalente claro («Play», «Start game», «New game»).
- Revisar estilos de `ChunkyButton` (primary/secondary/size) y espaciado del grupo de CTAs para que la jerarquía sea evidente sin leer mucho.

---

## Criterios de aceptación

- [ ] Idioma cambiable desde esquina superior (izq. o der.) en home; funciona en `es` y `en`.
- [ ] No aparece el botón «Ver estado técnico» ni el panel «Estado técnico» en home.
- [ ] El botón que lleva a setup/partida es el **más prominente**; modo aprendizaje es claramente secundario.
- [ ] El texto del CTA principal deja claro que se va a **jugar** (no jerga «setup» salvo que se acuerde explícitamente).
- [ ] Tests E2E/unit de home actualizados si asertan textos o elementos eliminados (`src/App.test.tsx` u otros).

---

## Referencias en código

| Área | Archivo |
|------|---------|
| Vista | `src/features/home/HomeView.tsx` |
| Navegación | `src/App.tsx` (`currentView === 'home'`) |
| i18n | `src/i18n/resources/es.ts`, `en.ts` — namespaces `home`, `common` |
| Botones | `src/components/ui` — `ChunkyButton` |
| Locale | `src/i18n/app-locale.ts` |

### Claves i18n a revisar / posible eliminación

- `home.viewTechnical`
- `common.technicalStatus` (si solo se usa en home; si se usa en otras vistas, mantener)
- `home.startSetup` → renombrar o cambiar copy

---

## Notas

- No es cambio de API backend; documentado aquí por contexto del flujo modo aprendizaje + portada del producto.
- El badge «Home · MVP» y el lead pueden mantenerse en esta iteración salvo que producto pida otro ajuste.
