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

- **Vite: acceso desde dispositivo móvil real en red local** — 2026-05-10
  - Contexto / problema: al levantar el dev server en la máquina de desarrollo, por defecto suele escuchar solo en `localhost`, así que no se puede abrir la URL desde un teléfono o tablet en la misma Wi‑Fi para probar touch, viewport y rendimiento reales.
  - Idea / dirección: configurar `vite.config` (`server.host` en `true` o `0.0.0.0`, y si hace falta `strictPort` / `port` documentado) para exponer el servidor en la LAN; documentar en README la URL tipo `http://<IP-local>:<puerto>` y recordar firewall / HTTPS mixto si aplica.
  - Impacto estimado: infra / DX · bajo.
  - Esfuerzo estimado: bajo.
  - Notas: no comprometer seguridad en producción (solo dev). Si Vite avisa de `allowedHosts`, ajustar según versión del proyecto.

- **Mapa en mobile: pan y zoom no funcionan** — 2026-05-10
  - Contexto / problema: en dispositivos táctiles, el arrastre (pan) y el zoom del mapa no responden como en desktop; la partida en mobile queda degradada o bloqueada para explorar el mapa.
  - Idea / dirección: auditar handlers de puntero vs touch (`pointerdown`/`touch-action`, `preventDefault` en listeners pasivos, conflicto con scroll del contenedor), pinch-zoom y coherencia con el viewport del mapa (`WorldMap`, baseline de viewport). Probar en iOS Safari y Chrome Android tras habilitar acceso LAN (ver tarea relacionada de Vite arriba).
  - Impacto estimado: UX · alto.
  - Esfuerzo estimado: medio.
  - Notas: enlaza con **Pan del mapa: curva de movimiento poco natural al arrastrar** (misma zona de código); esta entrada se centra en **funcionalidad rota en touch**, no solo en la sensación del movimiento.

- **Actualizar el Home** — 2026-05-10
  - Contexto / problema: la pantalla de Home actual quedó atrás respecto a la evolución del juego (modos, catálogo ampliado, partida full-screen, etc.) y conviene refrescarla para reflejar mejor el producto y guiar al jugador nuevo.
  - Idea / dirección: revisar contenido, jerarquía y CTA principal del Home; alinearlo con los modos y features ya existentes y dejar lugar para próximos (multilenguaje, modo aprendizaje, ranking si avanza el server). Definir qué se ve en primer pantallazo en mobile y desktop antes de tocar diseño.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: medio (según alcance: copy + layout, o rediseño completo).
  - Notas: pendiente de detalle. Cuando se promueva a tarea, decidir si el cambio es solo de copy/layout o también de arquitectura del estado de la app (`view === 'home'` en `src/App.tsx`). Considerar accesibilidad y consistencia visual con la partida y el setup.

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

- **Tema Dark / Light con switch de usuario** — 2026-05-10
  - Contexto / problema: hoy la app es solo tema oscuro; no respeta preferencia del sistema ni permite cambio.
  - Idea / dirección: introducir tema claro + toggle accesible (`aria-label`, foco visible). Tomar como default `prefers-color-scheme` y persistir la elección manual.
  - Impacto estimado: UX / accesibilidad · medio.
  - Esfuerzo estimado: medio.
  - Notas: consolidar colores actuales del HUD/overlay en variables CSS o tokens de Tailwind antes de duplicar paletas.

- **Multilenguaje (i18n) con selector de idioma** — 2026-05-10
  - Contexto / problema: textos de UI hardcodeados en español; nombres y capitales del catálogo también.
  - Idea / dirección: integrar una librería de i18n (ej. `react-i18next` u opción liviana equivalente), separar diccionarios de UI y decidir si los datos del catálogo se localizan o se mantienen en un idioma canónico con tabla de traducciones.
  - Impacto estimado: UX / alcance · alto.
  - Esfuerzo estimado: alto.
  - Notas: definir idiomas iniciales (ES/EN al menos), evaluar impacto en `src/data/countries.ts` (campos `name`/`capital`) y en tests que comparan strings.

- **Persistencia de puntajes en servidor** — 2026-05-10
  - Contexto / problema: los puntajes viven solo en memoria de la sesión; al cerrar la app se pierden.
  - Idea / dirección: investigar backend simple para guardar partidas y puntajes (Supabase, Firebase, Cloudflare D1, Vercel + Postgres, etc.). Definir esquema mínimo: jugador, modo, ronda, puntaje, fecha. Decidir auth (anónimo vs identificado) y política de privacidad (sin PII innecesaria).
  - Impacto estimado: feature / infra · alto.
  - Esfuerzo estimado: alto.
  - Notas: comparar costos, vendor-lock y flujos de despliegue antes de elegir. Pensar primero la API contractual y dejar la elección de proveedor por detrás.

- **Atajos para “siguiente pregunta”: teclado en desktop, gesto en mobile** — 2026-05-10
  - Contexto / problema: avanzar entre rondas requiere apuntar y clickear el botón.
  - Idea / dirección: en desktop, atajo de teclado (`Enter` o `Espacio`) cuando `roundAnswered` lo permita. En mobile, gesto natural (ej. swipe horizontal o doble tap en zona segura del mapa). Mantener el botón visible.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: bajo–medio.
  - Notas: evitar conflictos con foco de inputs, con la navegación por teclado existente y con el pan/zoom del mapa. Revisar accesibilidad y feedback visible al disparar el atajo.

- **Mensajes de error de respuesta más claros y empáticos** — 2026-05-10
  - Contexto / problema: el feedback al equivocarse de país es funcional pero plano.
  - Idea / dirección: mensajes que aporten información útil (país correcto, capital, distancia o pista contextual) y un tono amable, breve y consistente. Variantes según tipo de error (clic fuera de región, país equivocado, etc.).
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: bajo.
  - Notas: revisar copy actual del overlay de feedback (relacionado con MAP-UX-02 F2.4). Considerar i18n si avanza en paralelo.

- **Modo aprendizaje (explorar países sin penalizar)** — 2026-05-10
  - Contexto / problema: la app solo ofrece modo de adivinanza; no hay forma de explorar libremente para aprender.
  - Idea / dirección: modo dedicado donde al clickear un país se muestre nombre, bandera y reseña corta (origen Wikipedia / Wikidata REST). Sin puntaje ni penalización.
  - Impacto estimado: feature / educativo · alto.
  - Esfuerzo estimado: alto.
  - Notas: evaluar Wikipedia REST API (resumen + thumbnail), caching para no re-pegar, internacionalización del contenido y modo offline degradado. Definir cómo se entra/sale del modo desde el setup.

## Promovidas a tarea

<!-- Cuando una idea pase a ejecutarse, mover acá con link a la task creada. -->

_Sin promociones todavía._

## Descartadas

<!-- Conservar memoria de ideas que decidimos no hacer y por qué. -->

_Sin descartes todavía._
