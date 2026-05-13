# Backlog de ideas de features

Inbox liviano para anotar ideas de features que vayan surgiendo y todavía **no** estén comprometidas en una iteración. El objetivo es no perder ideas y poder priorizarlas más adelante sin contaminar las tareas activas.

> Este archivo **no** es una lista de tareas en ejecución. Cuando una idea se decide trabajar, se promueve a una task formal en su carpeta de iteración (por ejemplo `docs/tasks/<nombre-iteracion>/NN-...md`) y se marca aquí como **promovida**.
> Punto de entrada post-MVP: [`docs/requirements/04-current-state-post-mvp.mdc`](../requirements/04-current-state-post-mvp.mdc).

## Cómo usarlo

1. Anotá la idea en la sección **Ideas pendientes** con el formato de la plantilla.
2. Si la idea queda descartada, moverla a **Descartadas** con una nota corta del motivo (sirve de memoria para no re-evaluarla desde cero).
3. Si la idea se empieza a trabajar, moverla a **Promovidas a tarea** con el link al archivo de task creado.
4. Mantener entradas **breves**: 1–3 líneas alcanzan. El detalle se desarrolla recién al promover la idea a task.

### Plantilla por idea

```md
- **<Título corto y accionable>** — <fecha YYYY-MM-DD>
  - Contexto / problema: <qué dolor o oportunidad lo motiva>
  - Idea / dirección: <qué se imagina hacer, sin comprometerse al diseño>
  - Impacto estimado: <UX | datos | performance | accesibilidad | infra | otro> · <bajo | medio | alto>
  - Esfuerzo estimado: <bajo | medio | alto> (si ya hay intuición)
  - Notas: <links a archivos relevantes, dependencias, riesgos, descubrimientos>
```

## Ideas pendientes

<!-- Agregar nuevas entradas arriba de esta lista, las más recientes primero. -->

- **Botón “Setup”: el label no comunica que se abandona la partida** — 2026-05-10
  - Contexto / problema: al tocar el botón de setup durante una partida se navega a la pantalla de configuración y **se pierde el progreso** de la ronda en curso; el texto “Setup” suena a ajustes menores y no advierte que implica **salir / reiniciar flujo** de juego.
  - Idea / dirección: renombrar o complementar el CTA (ej. “Nueva partida”, “Opciones y reinicio”, “Salir al menú de juego”) y/o pedir **confirmación** si hay partida activa; revisar `aria-label` y copy en mobile donde el espacio es corto.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: bajo–medio (según si solo copy o también modal de confirmación).
  - Notas: al promover, ubicar el componente del HUD que renderiza el botón y el handler que cambia `view` o estado de partida; alinear tono con el resto de la UI.
  - Tener en cuenta que en docs/requirements/01-prd-mvp-producto-y-requerimientos.mdc se especifica este boton, al actualizar tmb actualizar ese PRD

- **Actualizar el Home** — 2026-05-10
  - Contexto / problema: la pantalla de Home actual quedó atrás respecto a la evolución del juego (modos, catálogo ampliado, partida full-screen, etc.) y conviene refrescarla para reflejar mejor el producto y guiar al jugador nuevo.
  - Idea / dirección: revisar contenido, jerarquía y CTA principal del Home; alinearlo con los modos y features ya existentes y dejar lugar para próximos (multilenguaje, modo aprendizaje, ranking si avanza el server). Definir qué se ve en primer pantallazo en mobile y desktop antes de tocar diseño.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: medio (según alcance: copy + layout, o rediseño completo).
  - Notas: pendiente de detalle. Cuando se promueva a tarea, decidir si el cambio es solo de copy/layout o también de arquitectura del estado de la app (`view === 'home'` en `src/App.tsx`). Considerar accesibilidad y consistencia visual con la partida y el setup. La app ya tiene **i18n ES/EN** (textos en `src/i18n/resources/`); el rediseño del Home puede aprovechar claves `home` / `common` sin rearmar infraestructura.

- **Anticheat: no persistir puntaje y mensaje explícito al usuario** — 2026-05-10
  - Contexto / problema: si existe detección de uso indebido (scripts, automatización, manipulación de cliente), persistir puntajes daría una tabla de clasificación injusta y puede frustrar a jugadores legítimos si no entienden por qué “desapareció” el resultado.
  - Idea / dirección: cuando la sesión o la partida quede marcada como **no válida** por anticheat (reglas concretas por definir), **no guardar** puntajes en servidor ni en ranking local si aplica; mostrar un mensaje **muy claro** (no técnico): que la partida no cuenta para el ranking / historial, motivo en una línea comprensible y qué puede hacer el usuario (ej. jugar de nuevo sin interferencias). Evitar ambigüedad (“no se guardó” vs “falló la red”).
  - Impacto estimado: UX / integridad · medio–alto.
  - Esfuerzo estimado: medio–alto (depende de qué se considera trampa y cómo se audita en cliente vs servidor).
  - Notas: enlaza con **Persistencia de puntajes en servidor** del mismo backlog: la política anticheat debe documentarse junto al contrato de API. Definir falsos positivos y mensajes accesibles (`aria-live` si es toast/banner). No registrar datos personales innecesarios al bloquear.

- **Filtro por continente: priorizar territorio sobre institución (caso Guyana Francesa)** — 2026-05-10
  - Contexto / problema: con el filtro por continente, territorios dependientes quedan asignados al continente de la nación administradora. Ej.: con `americas` activo, Guyana Francesa no entra en juego porque el catálogo la lista como `Europe` (por pertenecer a Francia).
  - Idea / dirección: la regla del catálogo debe ser **territorial / geográfica**, no institucional. Auditar territorios dependientes (Guyana Francesa, Groenlandia, territorios de ultramar, etc.) y reasignarlos al continente físico. Documentar el criterio para que no se vuelva a mezclar.
  - Impacto estimado: datos / UX · medio (corrige una regla incorrecta percibida por el jugador).
  - Esfuerzo estimado: bajo–medio.
  - Notas: tocar `src/data/countries.ts`, ajustar tests en `src/data/countries.test.ts` y revisar coherencia con `docs/tasks/map-game-ux-and-data/04-catalogo-paises-completo.md`. Cuidar también la resolubilidad mapa↔catálogo (alias TopoJSON).

- **Pan del mapa: curva de movimiento poco natural al arrastrar** — 2026-05-10
  - Contexto / problema: al arrastrar el mapa, el desplazamiento se siente raro: arranca lento y “salta” rápido, como si hubiera aceleración o un factor distinto al delta del puntero.
  - Idea / dirección: revisar la conversión delta-puntero → `translate` y asegurar relación 1:1 respecto del `scale` CSS actual (sin easing implícito ni clamps que generen escalones). Verificar trackpad, mouse y touch.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: medio.
  - Notas: archivos relevantes `src/components/WorldMap.tsx` y `src/components/world-map-baseline-viewport.ts`. Relación con MAP-UX-01.


- **Persistencia de puntajes en servidor** — 2026-05-10
  - Contexto / problema: los puntajes viven solo en memoria de la sesión; al cerrar la app se pierden.
  - Idea / dirección: investigar backend simple para guardar partidas y puntajes (Supabase, Firebase, Cloudflare D1, Vercel + Postgres, etc.). Definir esquema mínimo: jugador, modo, ronda, puntaje, fecha. Decidir auth (anónimo vs identificado) y política de privacidad (sin PII innecesaria).
  - Impacto estimado: feature / infra · alto.
  - Esfuerzo estimado: alto.
  - Notas: comparar costos, vendor-lock y flujos de despliegue antes de elegir. Pensar primero la API contractual y dejar la elección de proveedor por detrás.

- **Mensajes de error de respuesta más claros y empáticos** — 2026-05-10
  - Contexto / problema: el feedback al equivocarse de país es funcional pero plano.
  - Idea / dirección: mensajes que aporten información útil (país correcto, capital, distancia o pista contextual) y un tono amable, breve y consistente. Variantes según tipo de error (clic fuera de región, país equivocado, etc.).
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: bajo.
  - Notas: revisar copy actual del overlay de feedback (relacionado con MAP-UX-02 F2.4). La base i18n ES/EN ya está en repo; cualquier mejora de tono debe hacerse en recursos `src/i18n/resources/` y claves por idioma.

- **Modo aprendizaje (explorar países sin penalizar)** — 2026-05-10
  - Contexto / problema: la app solo ofrece modo de adivinanza; no hay forma de explorar libremente para aprender.
  - Idea / dirección: modo dedicado donde al clickear un país se muestre nombre, bandera y reseña corta (origen Wikipedia / Wikidata REST). Sin puntaje ni penalización.
  - Impacto estimado: feature / educativo · alto.
  - Esfuerzo estimado: alto.
  - Notas: evaluar Wikipedia REST API (resumen + thumbnail), caching para no re-pegar, internacionalización del contenido y modo offline degradado. Definir cómo se entra/sale del modo desde el setup.

## Promovidas a tarea

<!-- Cuando una idea pase a ejecutarse, mover acá con link a la task creada. -->

- **Multilenguaje (i18n) con selector de idioma** — 2026-05-13 (**cerrado en repo**)
  - Entregado: `i18next` + `react-i18next`; locales `es`/`en`; selector en Setup; persistencia en `localStorage` (clave versionada); `document.documentElement.lang`; errores API y validación por código → i18n; prompts de ronda según locale (`buildQuestionPool` + `country-localization` / `capital-es-map.json`). Estado del producto: [`docs/requirements/04-current-state-post-mvp.mdc`](../requirements/04-current-state-post-mvp.mdc) §1 y §2.
  - Documentación: [`i18n-multilenguaje/README.md`](./i18n-multilenguaje/README.md) · PDR [`00-pdr-multilenguaje-i18n.md`](./i18n-multilenguaje/00-pdr-multilenguaje-i18n.md) · decisión datos [`01-decision-catalogo.md`](./i18n-multilenguaje/01-decision-catalogo.md).
  - Notas: `npm install` del proyecto puede requerir `--legacy-peer-deps` por el peer de `react-simple-maps` con React 19; ver `package-lock.json` / README raíz si aplica.

- **Vite: acceso desde dispositivo móvil real en red local** — 2026-05-10 (implementado en repo, sin task formal en carpeta de iteración)
  - Hecho: `server.host: true` en `vite.config.ts` para que `npm run dev` escuche en la LAN.
  - Pendiente opcional del backlog original: añadir al README la URL `http://<IP-local>:5173` (o el puerto que muestre Vite), firewall y avisos de red no confiable.
  - Seguridad: solo afecta al servidor de desarrollo de Vite, no al build de producción (`vite build`). No se configuró `server.allowedHosts: true` (evitar rebinding amplio).

- **Mapa en mobile: pan y zoom táctil (MAP-UX-06)** — 2026-05-13 (implementado en repo, sin task formal `NN-...md`)
  - Hecho: `src/components/WorldMap.tsx` — Pointer Events con `setPointerCapture`, pan con un dedo y pinch con dos; rueda y ratón sin regresión. Tests en `src/components/WorldMap.test.tsx`.
  - Documentación de estado: `docs/requirements/04-current-state-post-mvp.mdc` y nota en `docs/tasks/map-game-ux-and-data/01-mapa-zoom-pan-contenedor.md`. QA manual en dispositivo físico (Safari iOS / Chrome Android) sigue recomendable.

- **Atajos para “siguiente pregunta” (solo desktop)** — 2026-05-13 (implementado en repo, sin task formal `NN-...md`)
  - Alcance acordado: **solo teclado en desktop** (`Enter` / barra espaciadora) cuando ya hay respuesta en la ronda; **sin gestos extra en mobile** (el tap en el botón alcanza). Media query `(hover: hover) and (pointer: fine)` para no registrar el listener ni mostrar leyenda en táctil típico.
  - Hecho: `src/features/game/GameShell.tsx` — listener global con guardas de foco (no robar Enter/Space de otros `button`/`input`/etc.; el propio CTA de avance delega en el comportamiento nativo del botón). Leyenda pequeña bajo el label y `aria-keyshortcuts` solo en ese caso. Tests: `src/features/game/GameShell.test.tsx`.

## Descartadas

<!-- Conservar memoria de ideas que decidimos no hacer y por qué. -->

_Sin descartes todavía._
