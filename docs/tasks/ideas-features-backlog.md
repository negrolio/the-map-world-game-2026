# Backlog de ideas de features

Inbox liviano para anotar ideas de features que vayan surgiendo y todavía **no** estén comprometidas en una iteración. El objetivo es no perder ideas y poder priorizarlas más adelante sin contaminar las tareas activas.

> Este archivo **no** es una lista de tareas en ejecución. Cuando una idea se decide trabajar, se promueve a una task formal en su carpeta de iteración (por ejemplo `docs/tasks/<nombre-iteracion>/NN-...md`) y se marca aquí como **promovida**.

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
