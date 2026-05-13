# PDR — Multilenguaje (i18n) con selector de idioma en Setup

**Estado:** **cerrado** respecto del MVP i18n descrito aquí (implementación en repo desde 2026-05-13). Stack elegido: **`i18next` + `react-i18next`**. Punto de entrada del estado del producto: [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc). Decisión de datos: [`01-decision-catalogo.md`](./01-decision-catalogo.md).  
**Idiomas iniciales:** español (`es`) e inglés (`en`).  
**Punto de control de idioma (producto):** panel de **Setup** (`SetupView`), no solo etiquetas sueltas: el jugador elige el idioma antes / durante la configuración de partida.

---

## 1. Resumen

**Situación previa:** la interfaz mezclaba copy en español e inglés; errores y validación no seguían un solo criterio de localización. El archivo `countries-catalog.json` conserva `name` y `capital` en una convención canónica del dataset (ver [`01-decision-catalogo.md`](./01-decision-catalogo.md)); el texto que ve el jugador en cada ronda se resuelve al construir el pool y se guarda en `Round.prompt` para esa ronda.

**Estado en producto (cierre 2026-05-13):** la app ofrece **español e inglés** de forma coherente (UI, validación, errores de dominio visibles, ARIA y prompts de juego según locale activo). Punto de entrada del estado general: [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc).

Los objetivos de diseño y el alcance se detallan en las secciones siguientes; la decisión concreta sobre nombres/capitales está en [`01-decision-catalogo.md`](./01-decision-catalogo.md).

> **Dependencias npm:** en el PR de cierre se adoptó **`i18next` + `react-i18next`** (+ `i18n-iso-countries` para nombres en inglés en datos). Cualquier iteración futura debe seguir las reglas del repo para nuevas dependencias.

---

## 2. Objetivos

1. **Un solo lugar conceptual** para el locale activo de la app (lectura/escritura y propagación a la UI).
2. **Selector en Setup** visible y usable (teclado, lector de pantalla), con opciones al menos `Español` / `English` (labels pueden mostrarse en el idioma destino o bilingües; definir en implementación).
3. **Escalabilidad:** añadir un tercer idioma = añadir recursos de traducción + registrar el código en una constante/tipo (`SupportedLocale`) sin reescribir la app.
4. **Coherencia:** tras cambiar idioma en Setup, **toda la superficie de usuario** que dependa de strings de producto debe actualizarse (Home si se vuelve desde Setup, partida, resultados, toasts/alertas derivadas de errores de API interna mostrada al usuario).
5. **Datos de juego:** las preguntas muestran `name` o `capital` según modo; para EN de verdad hace falta **estrategia de datos** (ver §6), no solo traducir botones.

---

## 3. Alcance y fuera de alcance

### 3.1 Dentro de alcance (MVP i18n)

- Strings de **UI** en vistas: `HomeView`, `SetupView`, `GameShell`, `ResultsView`, componentes de HUD (`GamePlayersHud`, etc.).
- **`aria-label`**, textos de controles del mapa (`WorldMap`), badges informativos.
- Mensajes de **`validate-config`**, **`setup-config-schema`** (Zod), **`game-round-service`**, **`game-session-service`** que se **muestran al usuario** (hoy mezclados EN/ES): unificar criterio — **códigos de error estables en dominio** + **mapeo a copy localizado en la capa de presentación o en un módulo `messages/` por locale**, o mensajes generados ya localizados pasando `locale` a funciones puras (ver §7).
- **`App.test.tsx`** y demás tests que hoy asertan texto fijo: migrar a **keys**, `getByRole`, o fixtures por locale.
- Atributo **`lang`** del documento y, si aplica, direccionalidad (`dir`) para futuros idiomas RTL.

### 3.2 Fuera de alcance (inicial)

- Traducción automática de contenido de terceros (Wikipedia, etc.).
- Detección por IP o forzar idioma por geografía sin consentimiento del usuario.
- Formateo avanzado (plurales complejos ICU) salvo que la librería elegida lo resuelva sin costo extra; para MVP basta con claves explícitas por número de jugadores si hace falta.

---

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| RF-1 | Existe un conjunto cerrado de **locales soportados**; MVP: `es`, `en`. |
| RF-2 | En **Setup** hay un control dedicado (select o radio) para **cambiar el idioma de la aplicación**. |
| RF-3 | Al cambiar el idioma, la UI del Setup se **re-renderiza** con el nuevo idioma sin recargar la página. |
| RF-4 | El idioma elegido **persiste** al recargar la app (recomendado: `localStorage` con clave versionada, p. ej. `map-game:locale:v1`). |
| RF-5 | El idioma afecta **partida en curso** (overlay, botones, mensajes de error visibles) y **resultados**. |
| RF-6 | Los **nombres de país y capitales** mostrados en preguntas deben corresponder al idioma seleccionado **una vez implementada la estrategia de datos** (§6); no es aceptable dejar solo la UI en EN y las preguntas siempre en ES si el locale es `en`. |
| RF-7 | **`document.documentElement.lang`** refleja el locale activo (`es` / `en`). |

---

## 5. Requisitos no funcionales

- **Orden de código:** módulos bajo un prefijo claro, p. ej. `src/i18n/` (tipos, proveedor React, lista de locales, carga de mensajes) o `src/locales/` con subcarpetas `es/`, `en/`. Evitar strings largos dispersos en servicios sin criterio.
- **Tipado:** códigos de locale como union type (`type AppLocale = 'es' | 'en'`) ampliable al añadir idiomas.
- **Tests:** ningún test debe depender de un idioma “accidental”; usar locale fijo en `setup` de Vitest o queries agnósticas.
- **Rendimiento:** bundles de mensajes **lazy** opcional para idiomas no activos en una fase posterior; MVP puede importar estático `es` + `en`.
- **Privacidad:** no persistir PII en la clave de idioma; solo el código de locale.

---

## 6. Datos: catálogo de países y `Round.prompt`

**Situación actual:** `buildQuestionPool` asigna `prompt` con `country.name` o `country.capital` desde un solo JSON.

**Opciones (decidir en implementación, documentar en el PR):**

1. **Catálogo por locale:** `countries-catalog.es.json` / `countries-catalog.en.json` (o un único JSON con `{ "name": { "es": "...", "en": "..." } }`). Ventaja: datos explícitos. Desventaja: tamaño y mantenimiento.
2. **Catálogo canónico + tabla de traducción:** ISO2 + campo + mapa de strings por locale, generado o curado.
3. **Mantener ISO2 en ronda y resolver texto en UI:** el modelo de ronda podría evolucionar a “payload mínimo + modo” y el texto mostrado se calcula al render; implica revisar todo consumo de `round.prompt`.

El PDR exige que la opción elegida **no rompa** la resolubilidad mapa↔catálogo ni los tests de datos existentes sin plan de migración.

**Implementado (2026-05-13):** ver [`01-decision-catalogo.md`](./01-decision-catalogo.md) (nombres ES vía `i18n-iso-countries`, capitales ES vía `capital-es-map.json`, prompts localizados en `buildQuestionPool`).

---

## 7. Dominio vs presentación (mensajes de error)

Patrón recomendado:

- Los servicios pueden seguir devolviendo **`error.code`** estable (`ROUND_NOT_ACTIVE`, `INVALID_GUESS`, …) y un `message` técnico opcional para logs, **o** aceptar `locale` en funciones de “formato para UI” delgadas.
- Evitar duplicar lógica de negocio solo para traducir; preferir **un mapa `errorCode → messageKey`** por locale en `src/i18n/messages/errors.ts` (ejemplo de ruta conceptual).

`DomainError` y mensajes lanzados con `throw` para casos internos pueden permanecer en inglés técnico si nunca llegan al usuario.

---

## 8. Arquitectura recomendada (alto nivel)

1. **`AppLocale`** + **`DEFAULT_LOCALE`** + **`FALLBACK_LOCALE`** (típicamente `en` o `es`).
2. **React Context** `LocaleProvider` montado en `main.tsx` o `App.tsx` por encima de rutas/vistas, leyendo persistencia al iniciar.
3. **Hook** `useT` / `useTranslation` / función `t('setup.playerCount.label')` según librería.
4. **Namespaces sugeridos:** `common`, `home`, `setup`, `game`, `results`, `errors`, `aria` (o prefijos de clave en un solo namespace en MVP).
5. **Setup:** el selector llama `setLocale(next)` del proveedor y opcionalmente persiste; no hace falta guardar locale dentro de `GameConfig` **salvo** que producto quiera “idioma fijado por partida” en sesiones exportadas; MVP puede ser **global de app**, no por sesión.

---

## 9. Inventario de archivos a tocar (referencia para la implementación)

> Lista orientativa según el codebase actual; puede crecer al afinar copy oculto.

### 9.1 Entrada y estado global

| Archivo | Motivo |
|---------|--------|
| `src/main.tsx` | Envolver la app con el proveedor de locale; opcional: hidratar `lang` antes del primer paint si se lee storage. |
| `src/App.tsx` | Estado o consumo del locale si parte de la lógica vive aquí; pasar callbacks a `SetupView` (`onLocaleChange`, `locale`). |
| `src/App.test.tsx` | Asertos por texto / `aria-describedby`; fijar locale en test. |

### 9.2 Setup (selector obligatorio)

| Archivo | Motivo |
|---------|--------|
| `src/features/setup/SetupView.tsx` | Todo el copy, opciones de región/modo/anticheat, botones; **añadir bloque “Idioma / Language”**. |
| `src/features/setup/setup-config-schema.ts` | Mensajes Zod en inglés hoy; alinear con i18n o con códigos + traducción. |

### 9.3 Home y partida

| Archivo | Motivo |
|---------|--------|
| `src/features/home/HomeView.tsx` | Copy principal y CTAs. |
| `src/features/game/GameShell.tsx` | Badges, navegación, leyendas de atajos, `aria-label`. |
| `src/features/game/GameShell.test.tsx` | Strings y atributos localizados. |
| `src/features/game/ResultsView.tsx` | Textos de fin de partida (si aplica). |

### 9.4 Componentes compartidos

| Archivo | Motivo |
|---------|--------|
| `src/components/WorldMap.tsx` | `aria-label` de mapa y controles de zoom. |
| `src/components/WorldMap.test.tsx` | Expectativas de texto. |
| `src/components/GamePlayersHud.tsx` | `aria-label`, “pts”, textos de lista. |
| `src/components/GamePlayersHud.test.tsx` | Idem. |
| `src/components/ui/*` | Solo si algún componente UI incrusta copy por defecto (revisión puntual). |

### 9.5 Servicios y validación

| Archivo | Motivo |
|---------|--------|
| `src/services/validate-config.ts` | Mensajes de validación mostrados en Setup. |
| `src/services/validate-config.test.ts` | Expectativas de mensajes. |
| `src/services/game-round-service.ts` | Mensajes de `ApiResponse.error.message` al usuario. |
| `src/services/game-round-service.test.ts` | Regex y strings en español/inglés. |
| `src/services/game-session-service.ts` | Mensajes expuestos al usuario. |
| `src/services/game-session-service.test.ts` | Idem. |
| `src/services/build-question-pool.ts` | **Punto crítico** para `prompt` multilenguaje (§6). |

### 9.6 Datos

| Archivo | Motivo |
|---------|--------|
| `src/data/countries.ts` | Tipo `CountryRecord` si el shape del catálogo cambia. |
| `src/data/countries-catalog.json` | Evolución según estrategia §6. |
| `src/data/countries.test.ts` | Datos y nombres esperados por locale. |

### 9.7 Nuevos artefactos (plantilla)

| Ruta sugerida | Motivo |
|---------------|--------|
| `src/i18n/types.ts` | `AppLocale`, helpers. |
| `src/i18n/locale-provider.tsx` | Context + persistencia. |
| `src/i18n/messages/es.ts` (o `.json`) | Strings `es`. |
| `src/i18n/messages/en.ts` | Strings `en`. |
| `src/i18n/index.ts` | Reexports públicos. |

*(Ajustar nombres a la convención del repo: kebab-case en archivos no componente.)*

---

## 10. Fases de implementación sugeridas

1. **Infra mínima:** tipos, proveedor, persistencia, `lang` en `<html>`, 1–2 pantallas piloto (Home + Setup) incluyendo **selector de idioma en Setup**.
2. **Migración de copy:** resto de vistas y `aria-*`.
3. **Dominio visible:** validación Zod + `validate-config` + errores de `game-round-service` / `game-session-service` vía mapa de claves o locale en formateadores.
4. **Datos de preguntas:** implementar §6 y actualizar tests de pool / rondas.
5. **Pulido:** revisión e2e Playwright si existe smoke con textos fijos.

---

## 11. Criterios de aceptación (checklist)

- [ ] Locales `es` y `en` funcionan de punta a punta en flujo: Home → Setup → Partida → Resultados (o hasta donde esté el flujo actual).
- [ ] **Selector en Setup** cambia el idioma de inmediato y persiste tras recarga.
- [ ] `document.documentElement.lang` coincide con el locale.
- [ ] Tests unitarios verdes con **locale explícito** en configuración de test.
- [ ] Documentación de la **estrategia de catálogo** añadida en este folder o en el PR (un párrafo basta).
- [ ] Añadir un tercer locale de prueba en una rama posterior es **mecánicamente simple** (nuevo archivo de mensajes + ampliar union type + opción en selector).

---

## 12. Riesgos y decisiones abiertas

- **Tamaño del bundle** si el catálogo se duplica por idioma.
- **Inconsistencia histórica:** sesiones guardadas (si en el futuro hay persistencia de partida) con `prompt` en un idioma y UI en otro; para MVP solo memoria, riesgo bajo.
- **Librería externa vs interna:** trade-off mantenimiento vs características (plurales, interpolación).

---

## 13. Referencias en repo

- Setup actual: `src/features/setup/SetupView.tsx`
- Estado de vistas: `src/App.tsx`
- Modelo de config: `src/types/domain.ts` (`GameConfig` — no incluye locale hoy)
- Backlog origen: `docs/tasks/ideas-features-backlog.md`
