# PRD — Home con cards de modo (juego + aprendizaje)

**Estado:** aprobado para implementación (producto)  
**Fecha:** 2026-05-19  
**Idioma del documento:** español  
**Audiencia:** desarrollo, QA, revisión de código  

**Referencias:**

- Especificación origen / limpieza técnica: [`home-page-ux.md`](./home-page-ux.md) (UX-HOME-01)
- Modo aprendizaje (comportamiento al entrar): [`../01-prd-modo-aprendizaje.md`](../01-prd-modo-aprendizaje.md)
- i18n del proyecto: [`../../../i18n-multilenguaje/00-pdr-multilenguaje-i18n.md`](../../../i18n-multilenguaje/00-pdr-multilenguaje-i18n.md)

**Assets de diseño (proporcionados por producto):**

| Modo | Uso | Origen (sesión) | Destino en repo (propuesto) |
|------|-----|-----------------|-----------------------------|
| Juego / partida | Fondo visual del card principal | Mapa político pergamino con países resaltados | `src/assets/home-card-game.png` |
| Aprendizaje | Fondo visual del card secundario | Mapa vintage explorador (barcos, rosa de los vientos) | `src/assets/home-card-learn.png` |

> Antes de implementar, **copiar y optimizar** las imágenes al directorio `src/assets/` (mismo criterio que `learn-modal-paper.png`: import estático en Vite, sin URL externa). Objetivo de peso: &lt; 200 KB por card en WebP/PNG según calidad aceptable; documentar en PR si se comprimen.

---

## 1. Resumen

La **home** deja de ser una columna centrada con botones genéricos (`ChunkyButton`) y un panel de idioma dominante. Pasa a ser una **portada de producto** con:

1. **Cabecera compacta:** título de la app, badge MVP opcional, selector de idioma en **esquina superior** (no panel central).
2. **Dos cards grandes y clickeables** (casi pantalla en móvil, lado a lado o apiladas en desktop según breakpoint):
   - **Card juego** — imagen 1, título orientado a “jugar / partida”, reseña basada en el lead actual.
   - **Card aprendizaje** — imagen 2, título “Modo aprendizaje” (o variante acordada), reseña que explique exploración sin puntaje.
3. **Limpieza:** sin botón “Ver estado técnico”, sin panel de dataset/módulos en home (UX-HOME-01).

No hay cambios de API backend. La navegación sigue siendo `onStartSetup` → `setup` y `onStartLearn` → `learn` en `App.tsx`.

---

## 2. Decisiones de producto (cerradas)

| Tema | Decisión |
|------|----------|
| Patrón UI | Dos **cards clickeables** (`<button>` o enlace con rol de botón), no `ChunkyButton` sueltos en fila |
| Jerarquía | **Card juego** más prominente (orden primero, tamaño y/o borde/sombra); **card aprendizaje** secundaria pero igual de usable |
| Título modo juego | **Recomendado:** «Partida» (ES) / «Play a match» o «Match» (EN). Alternativas válidas en implementación si QA prefiere: «Jugar», «Modo partida». **Evitar** «Comenzar setup» y «Modo juego» genérico |
| Título modo aprendizaje | Mantener **«Modo aprendizaje»** / **«Learning mode»** salvo A/B futuro |
| Lead global | El párrafo largo actual (`home.lead`) **se divide**: parte va al card juego; el card aprendizaje tiene su propia reseña. Opcional: acortar o eliminar un lead global duplicado |
| Idioma | Selector **esquina superior derecha** (preferencia producto); compacto (toggle ES/EN o `select` sin `Panel`) |
| Estado técnico | **Eliminado** de home; props `shellModules` / `datasetVersion` dejan de usarse en `HomeView` |
| Imágenes | Decorativas (`alt=""`); el nombre accesible del control viene del **título del card** + reseña en texto visible |
| i18n | Nuevas claves en namespace `home`; `es` y `en` obligatorios |
| Setup | Sigue teniendo selector de idioma; locale global compartido (RF-L03 del PRD aprendizaje) |

---

## 3. User stories

### US-H01 — Elegir actividad de un vistazo

**Como** visitante de la home,  
**quiero** ver dos opciones grandes con imagen y texto,  
**para** entender al instante si quiero jugar una partida o explorar en modo aprendizaje.

### US-H02 — Entrar al juego sin jerga

**Como** jugador,  
**quiero** que la opción principal diga claramente que voy a **jugar / configurar una partida**,  
**para** no confundirme con “setup” técnico.

### US-H03 — Entender el modo aprendizaje

**Como** usuario curioso,  
**quiero** una reseña breve del modo aprendizaje en su card,  
**para** saber que puedo tocar países y leer fichas sin competir.

### US-H04 — Cambiar idioma sin robar foco

**Como** usuario bilingüe,  
**quiero** cambiar ES/EN desde una esquina discreta,  
**para** leer títulos y reseñas de los cards en mi idioma.

### US-H05 — Teclado y lector de pantalla

**Como** usuario de teclado o lector de pantalla,  
**quiero** enfocar y activar cada card con Enter/Espacio y oír un nombre claro del destino,  
**para** navegar sin ratón.

---

## 4. Requisitos funcionales y criterios de aceptación

Convención: **RF-H** = home.

### 4.1 Layout y navegación

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-H01 | Dos cards en home | En `HomeView` hay exactamente **dos** controles principales que navegan a `setup` y `learn` respectivamente |
| RF-H02 | Card juego primero | En DOM y orden visual (LTR), el card de **partida/juego** aparece **antes** que el de aprendizaje |
| RF-H03 | Clic en card juego | Activa `onStartSetup`; usuario llega a `SetupView` |
| RF-H04 | Clic en card aprendizaje | Activa `onStartLearn`; usuario llega a `LearnMapView` |
| RF-H05 | Sin estado técnico | No existen botón «Ver estado técnico» ni panel «Estado técnico» / versión dataset en home |
| RF-H06 | Props limpias | `HomeView` no recibe `shellModules` ni `datasetVersion`; `App.tsx` deja de pasarlos solo para home |

### 4.2 Contenido y copy (i18n)

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-H07 | Título y reseña por card | Cada card muestra **título** (heading corto) y **reseña** (1–2 frases) desde `home.*` |
| RF-H08 | Reseña juego | ES alinea con mensaje actual: partida de geografía, mapa, jugadores, país/capital, continentes. EN equivalente natural |
| RF-H09 | Reseña aprendizaje | Menciona: mapa libre, clic en países, ficha Wikipedia, **sin** puntaje ni rondas |
| RF-H10 | Locales | Al cambiar idioma, títulos y reseñas de ambos cards se actualizan sin recargar |
| RF-H11 | Claves obsoletas | Eliminar o dejar de usar `home.startSetup`, `home.startLearn`, `home.viewTechnical` en UI (sustituidas por claves de card); actualizar tests |

**Borrador de copy (afinar en PR si hace falta):**

| Clave propuesta | ES | EN |
|-----------------|----|----|
| `home.gameCard.title` | Partida | Play a match |
| `home.gameCard.description` | Una partida de geografía sobre un mapa interactivo. Configurá jugadores, modo país o capital, cobertura por continente y empezá la expedición. | A geography game on an interactive map. Set up players, country or capital mode, coverage by continent, and start the expedition. |
| `home.learnCard.title` | Modo aprendizaje | Learning mode |
| `home.learnCard.description` | Explorá el mapa sin puntaje: tocá un país y leé su ficha con bandera y texto de Wikipedia. Ideal para curiosear antes o después de jugar. | Explore the map with no score: tap a country and read its card with flag and Wikipedia summary. Great for browsing before or after a match. |
| `home.gameCard.ariaLabel` | (opcional) Iniciar partida: configurar jugadores y reglas | (opcional) Start a match: configure players and rules |
| `home.learnCard.ariaLabel` | (opcional) Abrir modo aprendizaje: explorar países en el mapa | (opcional) Open learning mode: explore countries on the map |

### 4.3 Selector de idioma

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-H12 | Posición | Control de locale en **esquina superior derecha** de la home (header fijo o sticky dentro del `main`) |
| RF-H13 | Compacto | Sin `Panel` centrado; altura visual mínima |
| RF-H14 | Persistencia | Misma lógica que hoy: `i18n.changeLanguage`, `localStorage`, `document.documentElement.lang` |
| RF-H15 | Accesibilidad | `label` asociado o `aria-label` en el control; opciones ES/EN legibles |

### 4.4 Visual y responsive

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-H16 | Imagen de fondo | Cada card usa su asset (`home-card-game.png`, `home-card-learn.png`) como fondo o bloque superior con `object-cover` |
| RF-H17 | Área clickeable | Toda la card (o zona definida ≥ 44×44 px en móvil) es clickeable; hover/focus visible |
| RF-H18 | Breakpoints | **Móvil (&lt; md):** cards apiladas, ancho ~100%, altura mínima generosa (p. ej. 200–280 px). **Desktop (≥ md):** grid 2 columnas, alturas alineadas |
| RF-H19 | Contraste texto | Título y reseña legibles sobre imagen (overlay semitransparente, gradiente o zona de texto en papel — tokens `--color-paper`, `--color-ink`) |
| RF-H20 | Coherencia diseño | Usar tokens en `src/styles/tokens.css`, tipografías `font-display` / `font-body`, bordes `rounded-control` / `border-wood` si aplican |

---

## 5. Diseño de componentes (código ordenado)

### 5.1 Estructura de archivos propuesta

```
src/features/home/
  HomeView.tsx              # layout portada + header idioma
  HomeModeCard.tsx          # card clickeable reutilizable (nuevo)
  HomeModeCard.test.tsx     # unit del card (nuevo)
  home-mode-card.types.ts   # props tipadas (opcional si props son pocas)
src/assets/
  home-card-game.png
  home-card-learn.png
```

### 5.2 `HomeModeCard` (contrato)

```ts
export interface HomeModeCardProps {
  readonly title: string
  readonly description: string
  readonly imageUrl: string
  readonly imageAlt?: string // default ''
  readonly ariaLabel?: string
  readonly variant: 'primary' | 'secondary'
  readonly onActivate: () => void
}
```

- Implementación: `<button type="button">` con estilos Tailwind; `variant` controla borde, sombra y escala en hover.
- `data-testid`: `home-card-game`, `home-card-learn` para E2E.

### 5.3 `HomeView`

- Header: `Badge` + `h1` (`common.appTitle`) + selector idioma a la derecha (`justify-between` en fila superior).
- Cuerpo: grid de dos `HomeModeCard`.
- **No** importar `ChunkyButton` salvo que se reutilice en otro subelemento (preferible no).
- Lead global (`home.lead`): **eliminar** de la UI si el copy ya está en `gameCard.description`; mantener clave en i18n deprecada un sprint o borrar en el mismo PR.

### 5.4 Cambios en `App.tsx`

```tsx
<HomeView
  onStartSetup={() => setCurrentView('setup')}
  onStartLearn={() => setCurrentView('learn')}
/>
```

---

## 6. Accesibilidad

| Criterio | Implementación |
|----------|----------------|
| Nombre accesible | `aria-label` en el botón-card si título+descripción no bastan; si no, título visible como nombre |
| Imagen decorativa | `alt=""` en `<img>` si el fondo es solo decoración |
| Foco | `:focus-visible` con anillo acorde a tokens (p. ej. `ring-wood-dark`) |
| Orden de tabulación | Idioma → card juego → card aprendizaje (o idioma al final si está en esquina; documentar elección) |
| Contraste | Verificar WCAG AA en texto sobre overlay (herramienta manual o Lighthouse en PR) |

---

## 7. Internacionalización

### 7.1 Archivos

- `src/i18n/resources/es.ts` — namespace `home`
- `src/i18n/resources/en.ts` — namespace `home`
- Registrar claves nuevas; no hardcodear español en componentes.

### 7.2 Claves a añadir / retirar

| Acción | Claves |
|--------|--------|
| Añadir | `home.gameCard.title`, `home.gameCard.description`, `home.learnCard.title`, `home.learnCard.description`, opcional `home.gameCard.ariaLabel`, `home.learnCard.ariaLabel` |
| Retirar de UI | `home.startSetup`, `home.startLearn`, `home.viewTechnical`, `home.lead` (si duplicado) |
| Mantener | `home.badge` |
| `common.technicalStatus` | Mantener si otras vistas lo usan; si solo home, no borrar sin grep |

### 7.3 Setup

- Reutilizar labels de idioma: `setup.languageOptionEs` / `languageOptionEn` o extraer a `common` en iteración futura (fuera de alcance si duplicar una línea es aceptable).

---

## 8. Pruebas y revisión

### 8.1 Unit / integración (Vitest + Testing Library)

| Archivo | Qué cubrir |
|---------|------------|
| `HomeModeCard.test.tsx` | Render título/descripción; `onActivate` al click; `aria-label` si se pasa |
| `App.test.tsx` | Actualizar selectores: card/botón por nuevo copy («Partida» / `home-card-game` test id); **eliminar** test «muestra versión de dataset en vista dev» si el panel desaparece |
| Navegación | Clic en card juego → Setup; card aprendizaje → `learn-map-view` |
| i18n | Opcional: test con locale `en` y textos EN en cards |

### 8.2 E2E (Playwright)

| Archivo | Cambios |
|---------|---------|
| `e2e/helpers.ts` | `goToSetup`: clic en card por `data-testid="home-card-game"` o rol/nombre «Partida»; `selectAppLocale`: selector en header (actualizar `#app-locale` si cambia id) |
| `e2e/smoke.spec.ts` | Assert de dos cards visibles; título app |
| Nuevo (opcional) | `e2e/home-cards.spec.ts`: cambio de idioma reflejado en reseña; navegación a learn |

### 8.3 Checklist de revisión manual (QA)

- [ ] Home en ES y EN: textos correctos en ambos cards
- [ ] Móvil 375px y desktop 1280px: layout apilado / dos columnas
- [ ] Foco teclado visible en cards y selector idioma
- [ ] Sin panel técnico ni botón muerto
- [ ] Imágenes cargan en build de producción (`npm run build`)
- [ ] Lighthouse: sin regresión grave de LCP por imágenes (comprimir si hace falta)

### 8.4 Comandos de verificación (implementador)

```bash
npm run test -- src/features/home HomeModeCard App.test
npm run test:e2e -- e2e/smoke.spec.ts
npm run build
```

---

## 9. Plan de implementación sugerido

| Fase | Entregable |
|------|------------|
| 1 | Assets en `src/assets/`, componente `HomeModeCard`, tests unitarios |
| 2 | Refactor `HomeView` (grid, header idioma, wire callbacks) |
| 3 | i18n ES/EN + limpieza claves y props en `App.tsx` |
| 4 | Actualizar `App.test.tsx`, `e2e/helpers.ts`, smoke |
| 5 | Revisión visual + ajuste overlay/contraste; PR con capturas antes/después |

**Estimación:** 1 PR acotado al frontend (sin dependencias nuevas).

---

## 10. Fuera de alcance

- Rediseño del badge «Home · MVP» o del título global (salvo espaciado).
- Animaciones complejas entre cards.
- Tercer modo (ranking, multijugador online).
- Cambios en `SetupView` copy salvo coherencia menor («Volver al home»).
- Optimización CDN de imágenes (Vercel sirve estáticos del build).

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Imágenes pesadas | Comprimir; `loading="lazy"` solo si below-the-fold; en home above-the-fold usar tamaños razonables |
| Texto ilegible sobre foto | Overlay obligatorio; revisar en tema claro/oscuro si aplica |
| Tests rotos por copy | `data-testid` estables en cards; helpers E2E centralizados |
| Duplicación lead + descripción | Un solo bloque de copy por card; quitar `home.lead` de UI |

---

## 12. Criterios de aceptación globales (checklist PR)

- [ ] Dos cards grandes clickeables con imágenes asignadas y reseñas i18n ES/EN
- [ ] Card juego más prominente y primero; navega a setup
- [ ] Card aprendizaje navega a learn
- [ ] Idioma en esquina superior derecha, compacto
- [ ] Sin estado técnico en home; props muertas eliminadas
- [ ] Código en `src/features/home/` con componente dedicado y tipos claros
- [ ] Tests unitarios + `App.test` + E2E actualizados en verde
- [ ] `npm run build` sin errores
- [ ] Revisión de accesibilidad básica (foco, roles, contraste)

---

## 13. Referencias en código (estado actual)

| Área | Archivo |
|------|---------|
| Vista | `src/features/home/HomeView.tsx` |
| Navegación | `src/App.tsx` |
| i18n | `src/i18n/resources/es.ts`, `en.ts` |
| Tests app | `src/App.test.tsx` |
| E2E | `e2e/smoke.spec.ts`, `e2e/helpers.ts` |
| Tokens | `src/styles/tokens.css` |
| Patrón asset | `src/features/learn/CountryLearnModal.tsx` (`learn-modal-paper.png`) |
