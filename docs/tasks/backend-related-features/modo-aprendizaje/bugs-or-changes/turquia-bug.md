# Bugs y cambios pendientes (backend / modo aprendizaje)

Registro de incidencias y mejoras detectadas en pruebas manuales o producción. Cada ítem debe poder convertirse en tarea de implementación o issue.

---

## BUG-LEARN-01 — Turquía en español: nombre en inglés y artículo de Wikipedia equivocado

**Estado:** resuelto (2026-05-19) — ver [`03-prd-wikipedia-locale-resolution.md`](./03-prd-wikipedia-locale-resolution.md)  
**Prioridad:** media (datos incorrectos visibles al usuario)  
**Ámbito:** modo aprendizaje, `locale=es`, país `TR` (Turquía)

### Síntoma (histórico)

Con la UI en **español**:

1. El país **Turquía** se mostraba como **"Turkey"** (nombre en inglés).
2. El resumen y el enlace de Wikipedia correspondían al **pavo americano** (ave), no al estado de Turquía.

### Causa

Override `TR: 'Turkey'` en inglés priorizado sobre el sitelink `eswiki` «Turquía».

### Fix aplicado

Mapa `shared/wikipedia-sitelinks.json` (Wikidata) + `displayName` desde i18n; candidatos de artículo usan sitelink por locale antes que búsqueda libre.

---

## BUG-LEARN-02 — CD en español: contenido en inglés

**Estado:** resuelto (2026-05-19)  
**Ámbito:** `CD`, `locale=es`

### Síntoma (histórico)

Ficha en inglés por fallback tras fallar títulos incorrectos (`Democratic_Republic_of_the_Congo` en eswiki, nombre i18n ambiguo).

### Fix aplicado

Sitelink `República Democrática del Congo` en el mapa Wikidata.

---

## BUG-LEARN-03 — FK en inglés: 404

**Estado:** resuelto (2026-05-19)  
**Ámbito:** `FK`, `locale=en`

### Síntoma (histórico)

Catálogo usaba «Malvinas Argentinas (Falkland Islands)» como nombre EN; no coincide con `en.wikipedia.org`.

### Fix aplicado

`getCountryDisplayName` usa i18n-iso-countries también para `en`; sitelink `Falkland Islands`; catálogo normalizado.
