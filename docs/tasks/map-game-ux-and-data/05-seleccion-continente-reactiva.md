# Tarea: Seleccion de continente reactiva en el mapa

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-05 |
| **Prioridad** | P1 |
| **Estimacion** | 3-6 h |
| **Dependencias** | MAP-UX-01 (zoom/pan), DATA-01 (catalogo amplio y continentes consistentes) |

## Objetivo

Cuando el usuario selecciona un continente en configuracion o partida (en lugar de `world`), el mapa debe reaccionar visualmente para reforzar el contexto geografico de juego.

## Decision recomendada para MVP

Implementar primero un **modo enfoque sobre mapa mundial**:

1. Mantener el mapa del mundo completo (sin cambiar a otro asset).
2. Resaltar paises del continente activo.
3. Atenuar el resto de paises (opacidad menor y sin competir visualmente).
4. Recentrar/ajustar el viewport del mapa al continente cuando cambia el filtro (siempre con opcion de reset).

Esta opcion minimiza riesgo tecnico, reutiliza `WorldMap` y es mas facil de testear que renderizar "mapas por continente" separados.

## Contexto en repo

- `src/App.tsx`: maneja filtro de region (`RegionFilter`) y estado de partida.
- `src/components/WorldMap.tsx`: renderiza el mapa y estilos por geografia.
- `src/data/countries.ts`: mapea `iso2 -> continent` para saber que paises pertenecen al continente activo.
- Con **MAP-UX-02** (mapa a pantalla completa + overlay), el fit inicial y el resaltado deben convivir con las bandas/chips de UI sin tapar de forma permanente la zona de juego; el usuario ya cuenta con pan/zoom (MAP-UX-01) para afinar.

## Alcance

1. Agregar al mapa una prop de region activa (`world | continent`) y aplicarla en estilos.
2. Definir estados visuales:
   - Continente activo: estilo normal/resaltado.
   - Resto del mundo: opacidad baja y borde suave.
3. Si `region !== 'world'`, realizar enfoque inicial al continente (fit aproximado) sin perder controles de zoom/pan/reset.
4. Mantener seleccion de pais por click solo sobre paises jugables del pool activo (o bloquear con feedback claro si se hace click fuera de region).
5. Asegurar coherencia con feedback de ronda (`correct/incorrect`) y `locked`.

## Fuera de alcance

- Cargar archivos de mapa independientes por continente.
- Cambiar reglas de negocio de `buildQuestionPool` (solo representacion e interaccion visual del filtro).

## Criterios de aceptacion

- [ ] Al elegir `world`, el mapa mantiene comportamiento global actual.
- [ ] Al elegir un continente, la diferencia visual entre continente activo y resto del mundo es evidente.
- [ ] El viewport inicial tras cambiar continente centra/encuadra razonablemente su zona geografica.
- [ ] Los clicks fuera de la region seleccionada no introducen respuestas ambiguas.
- [ ] `npm run test` se mantiene verde; se agregan pruebas de UI/props del mapa para estados `world` vs continente.

## Riesgos y mitigaciones

- Desfase entre geometrias del TopoJSON y continente del catalogo: documentar excepciones y mantener tabla de alias/exclusion si aplica.
- Enfoque de viewport inestable en algunos continentes (ej. Oceania): permitir fallback a solo resaltado si el fit no es confiable.

## Orden sugerido

Ejecutar despues de MAP-UX-01 y en paralelo con DATA-01; idealmente antes de ajustes finos de UX final para validar la experiencia de filtros continentales.
