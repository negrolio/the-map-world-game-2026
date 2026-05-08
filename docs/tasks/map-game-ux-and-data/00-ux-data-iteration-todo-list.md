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

## Fase 2 — MAP-UX-02 (Layout de partida sin scroll obligatorio)

- [ ] **F2.1 — Redisenar estructura de la vista `game` (2-4 h)**
  - **Criterios de aceptacion:**
    - El layout separa claramente area de mapa y area de acciones.
    - La estructura funciona en mobile y desktop sin solapamientos criticos.

- [ ] **F2.2 — Hacer visible CTA principal above-the-fold (1-3 h)**
  - **Criterios de aceptacion:**
    - En 375x667, el usuario ve prompt + mapa + CTA principal sin scroll obligatorio.
    - La visibilidad se mantiene en estado de responder y estado post-respuesta.

- [ ] **F2.3 — Compactar informacion secundaria (debug) (1-2 h)**
  - **Criterios de aceptacion:**
    - El bloque de debug deja de competir con elementos criticos de juego.
    - No se pierde informacion util en desarrollo (se conserva via modo dev o equivalente).

- [ ] **F2.4 — Ajustar accesibilidad y foco de acciones (1-2 h)**
  - **Criterios de aceptacion:**
    - Orden de foco en CTA y controles es logico.
    - Feedback de ronda no genera ruido duplicado para lectores de pantalla.

- [ ] **F2.5 — Actualizar tests de `App`/e2e afectados por layout (1-3 h)**
  - **Criterios de aceptacion:**
    - Tests ajustados a estructura nueva (`data-testid`/flujo visible).
    - `npm run test` y smoke e2e relevante siguen en verde.

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
    - No aparecen regresiones criticas en mapa, HUD o CTA principal.

- [ ] **CF.2 — Actualizar estado en tasks fuente (1-2 h)**
  - **Criterios de aceptacion:**
    - Cada archivo `01..05` refleja estado real de avance.
    - Quedan anotadas decisiones tecnicas clave y excepciones conocidas.
