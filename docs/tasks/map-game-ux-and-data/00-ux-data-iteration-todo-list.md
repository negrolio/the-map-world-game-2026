# TODO list — Iteracion UX + Datos

Origen: plan `plan_ux_data_iteracion_5f5e1e95.plan.md` y tasks `MAP-UX-01/02/03/05` + `DATA-01`.

Regla de ejecucion: cada tarea esta pensada para completarse en **1-4 horas**.

---

## Fase 1 — MAP-UX-01 (Zoom, pan y contenedor de mapa)

- [x] **F1.1 — Definir estado de viewport y limites de zoom (1-2 h)**
  - **Criterios de aceptacion:**
    - Existe estado de vista del mapa (escala + desplazamiento) con limites min/max documentados.
    - El zoom no permite valores fuera del rango definido.

- [x] **F1.2 — Implementar controles accesibles de zoom y reset (1-2 h)**
  - **Criterios de aceptacion:**
    - Hay controles `zoom in`, `zoom out` y `reset` visibles.
    - Cada control tiene `aria-label` y foco visible por teclado.

- [x] **F1.3 — Integrar pan dentro de contenedor sin desbordes (2-4 h)**
  - **Criterios de aceptacion:**
    - El pan ocurre dentro del contenedor del mapa, sin desplazar la pagina.
    - En viewport movil y desktop tipicos, el mapa no rompe el layout.

- [x] **F1.4 — Validar click de pais bajo transformaciones y estado `locked` (2-4 h)**
  - **Criterios de aceptacion:**
    - Con zoom distinto de 100%, el click sigue resolviendo ISO2 correcto.
    - El comportamiento con `locked` queda consistente y documentado en el componente.

- [x] **F1.5 — Actualizar pruebas de `WorldMap` para zoom/pan/reset (1-3 h)**
  - **Criterios de aceptacion:**
    - Hay pruebas nuevas o ajustadas para controles y estado de vista.
    - `npm run test` permanece verde.

---

## Fase 2 — MAP-UX-02 (Mapa a pantalla completa + overlay mínimo armonioso)

- [x] **F2.1 — Shell de partida a pantalla completa sin scroll de documento (1-3 h)**
  - **Criterios de aceptacion:**
    - La vista `game`/`playing` usa alto/ancho del viewport (`100dvh`/`100svh` o equivalente documentado).
    - No aparece scroll vertical de **pagina** por el contenido esencial de partida en 375x667 y 1280x800.

- [x] **F2.2 — Mapa como capa base edge-to-edge (2-4 h)**
  - **Criterios de aceptacion:**
    - `WorldMap` ocupa todo el area de juego visible (full bleed dentro del shell).
    - El mapa no queda “encajonado” en una fracción pequeña del viewport salvo decision explicita de producto.

- [x] **F2.3 — Overlay con informacion indispensable: ronda, objetivo, turno, puntaje (2-4 h)**
  - **Criterios de aceptacion:**
    - Son visibles sin interaccion extra: numero de ronda, texto de pais/capital a adivinar, jugador en turno, puntaje (compacto o por jugador segun acuerdo con HUD).
    - Composicion armoniosa (safe-area, contraste, no satura el centro del mapa sin necesidad).

- [x] **F2.4 — Overlay de acciones y navegacion: siguiente, setup, home + feedback minimo (1-3 h)**
  - **Criterios de aceptacion:**
    - Visibles: Siguiente pregunta / Ver resultado final cuando corresponda; acceso a Setup y Home.
    - Feedback de acierto/error es breve y legible sobre el mapa.

- [x] **F2.5 — Integrar zoom + / − y reset en el overlay (armonia con MAP-UX-01) (1-2 h)**
  - **Criterios de aceptacion:**
    - Los controles de zoom y reset siguen funcionando y son accesibles (`aria-label`, foco).
    - No hay duplicacion confusa de controles entre overlay y mapa salvo que este justificado y documentado.

- [x] **F2.6 — Pan/zoom como compensacion cuando la UI tapa geografia (1-2 h)**
  - **Criterios de aceptacion:**
    - Queda documentado (comentario o copy breve) que el usuario puede mover/acercar la vista si un pais queda bajo el overlay.
    - Verificacion manual: con pan/zoom se puede clicar 2-3 paises que inicialmente quedarian parcialmente ocultos.

- [x] **F2.7 — Accesibilidad: foco, pointer-events y live regions (1-3 h)**
  - **Criterios de aceptacion:**
    - Orden de foco coherente entre overlay y mapa; overlays no bloquean de forma opaca toda interaccion sin alternativa.
    - `aria-live` u anuncios sin duplicar ruido en cada render.

- [x] **F2.8 — Debug solo en dev y tests App/e2e (1-3 h)**
  - **Criterios de aceptacion:**
    - Lineas de debug no compiten con la UI de juego en produccion.
    - `npm run test` y smoke e2e relevante verdes con `data-testid`/flujo actualizado.

---

## Fase 3 — MAP-UX-03 (HUD movil intuitivo)

- [ ] **F3.1 — Reemplazar patron `<details>` movil por vista inmediata (2-4 h)**
  - **Criterios de aceptacion:**
    - En `< md`, el turno activo se ve sin interaccion extra.
    - La solucion elegida mantiene legibilidad con hasta 6 jugadores.

- [ ] **F3.2 — Mantener semantica de estado `roundAnswered` (1-2 h)**
  - **Criterios de aceptacion:**
    - Cuando `roundAnswered` es `true`, no se muestra turno activo ambiguo.
    - El comportamiento visual coincide con la logica actual de juego.

- [ ] **F3.3 — Conservar o migrar `data-testid` del HUD (1-2 h)**
  - **Criterios de aceptacion:**
    - Los selectores de test existentes no quedan rotos sin reemplazo.
    - Cualquier cambio de testid queda reflejado en pruebas.

- [ ] **F3.4 — Ajustar tests de HUD/App (1-3 h)**
  - **Criterios de aceptacion:**
    - Hay cobertura de visibilidad de turno activo en movil.
    - Suite de tests relevante permanece verde.

---

## Fase 4 — DATA-01 (Catalogo completo de paises)

- [ ] **F4.1 — Definir fuente y formato del catalogo ampliado (1-3 h)**
  - **Criterios de aceptacion:**
    - Queda definida una fuente mantenible para datos de paises.
    - El formato respeta `iso2`, `iso3`, `name`, `continent`, `capital`.

- [ ] **F4.2 — Reemplazar catalogo reducido por catalogo amplio (2-4 h)**
  - **Criterios de aceptacion:**
    - `countriesCatalog` pasa de lista reducida a cobertura amplia (>>10).
    - La app sigue compilando y cargando datos sin errores.

- [ ] **F4.3 — Validar coherencia continente/region y normalizacion (1-3 h)**
  - **Criterios de aceptacion:**
    - No hay valores de continente fuera del conjunto esperado por `RegionFilter`.
    - Nombres/capitales mantienen consistencia de idioma y formato.

- [ ] **F4.4 — Agregar validacion resolubilidad mapa<->catalogo (2-4 h)**
  - **Criterios de aceptacion:**
    - Existe test o script que detecta paises no resolubles por TopoJSON.
    - Excepciones quedan documentadas en alias/exclusiones cuando aplique.

- [ ] **F4.5 — Actualizar tests dependientes de longitud fija (1-3 h)**
  - **Criterios de aceptacion:**
    - Tests que asumian `length === 10` pasan a reglas derivadas/fixtures.
    - `validateConfig` y `buildQuestionPool` quedan verdes con el nuevo catalogo.

---

## Fase 5 — MAP-UX-05 (Continente reactivo en el mapa)

- [ ] **F5.1 — Pasar region activa al mapa y aplicar estilos por estado (1-3 h)**
  - **Criterios de aceptacion:**
    - `world` conserva comportamiento global.
    - En continente, region activa y resto del mundo se distinguen visualmente.

- [ ] **F5.2 — Implementar enfoque inicial por continente con fallback (2-4 h)**
  - **Criterios de aceptacion:**
    - Al cambiar region, el viewport centra/encuadra razonablemente el continente.
    - Si el enfoque falla en casos limite, se aplica fallback estable documentado.

- [ ] **F5.3 — Definir comportamiento de click fuera de region activa (1-2 h)**
  - **Criterios de aceptacion:**
    - Los clicks fuera de region no generan respuestas ambiguas.
    - El usuario recibe feedback claro cuando la accion no es valida.

- [ ] **F5.4 — Verificar compatibilidad con `locked` y feedback de ronda (1-2 h)**
  - **Criterios de aceptacion:**
    - No hay conflicto entre resaltado regional, estados de respuesta y bloqueo.
    - Flujo de ronda mantiene consistencia visual.

- [ ] **F5.5 — Actualizar pruebas para `world` vs continente (1-3 h)**
  - **Criterios de aceptacion:**
    - Existen pruebas de estados clave de region.
    - `npm run test` permanece verde.

---

## Cierre de iteracion (validacion final)

- [ ] **CF.1 — Pasada integral de regresion funcional (1-2 h)**
  - **Criterios de aceptacion:**
    - Flujo setup -> juego -> resultado se mantiene operativo.
    - No aparecen regresiones criticas en mapa full-screen, overlay de partida o acciones principales.

- [ ] **CF.2 — Actualizar estado en tasks fuente (1-2 h)**
  - **Criterios de aceptacion:**
    - Cada archivo `01..05` refleja estado real de avance.
    - Quedan anotadas decisiones tecnicas clave y excepciones conocidas.
