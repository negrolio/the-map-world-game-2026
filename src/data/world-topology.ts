/**
 * Placeholder minimo para desacoplar la carga de TopoJSON del rendering.
 * En fases siguientes se reemplaza por el archivo real 110m/50m.
 */
export const worldTopology = {
  type: 'Topology',
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [],
    },
  },
  arcs: [],
  transform: {
    scale: [1, 1],
    translate: [0, 0],
  },
} as const
