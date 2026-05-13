# Decisión de catálogo — nombres y capitales (i18n)

**Fecha:** 2026-05-13  
**Estado:** adoptada en implementación.

## Resumen

- **Nombres de país (`es`):** `i18n-iso-countries` con locale `es` registrado (`getName(iso2, 'es')`), con fallback al nombre en inglés del catálogo (`countries-catalog.json`).
- **Nombres de país (`en`):** campos `name` / `capital` del catálogo (inglés).
- **Capitales (`es`):** archivo generado [`src/data/capital-es-map.json`](../../src/data/capital-es-map.json) (ISO2 → capital en español), con parches manuales para formas habituales; si falta clave, se usa la capital en inglés del catálogo.
- **Pool de preguntas:** [`buildQuestionPool`](../../src/services/build-question-pool.ts) recibe `locale: AppLocale` y construye el `prompt` con [`getLocalizedCountryName` / `getLocalizedCapital`](../../src/data/country-localization.ts).

## Notas

- El catálogo JSON no duplica columnas `nameEs` por fila: los nombres en español vienen del paquete ISO para mantener el JSON alineado al dataset existente.
- Ampliar idiomas: registrar nuevo locale en i18n, extender `AppLocale`, y decidir fuente de datos para nombres/capitales (similar a `capital-*-map` o tabla única).
