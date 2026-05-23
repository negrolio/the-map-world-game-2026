/**
 * Constantes del backend del modo AI trivia. No deben filtrar al bundle del
 * frontend (lo del cliente vive en `src/services/ai-trivia-rules.ts`).
 */

/** Re-rolls extra permitidos por ítem inválido tras la primera llamada al LLM. */
export const MAX_REROLLS = 2

/**
 * Si más de este ratio de items del último intento fueron rechazados, se
 * corta el loop de re-rolls para acotar coste/latencia (RNF-P04 del PRD).
 * Solo se aplica cuando hay al menos `CIRCUIT_BREAKER_MIN_ITEMS` items
 * pendientes; para batches pequeños siempre se ejecutan todos los re-rolls
 * porque el coste es despreciable y un solo item siempre tendría tasa 0% o
 * 100% (ver `generate-ai-prompts.ts`).
 */
export const CIRCUIT_BREAKER_RATIO = 0.5
export const CIRCUIT_BREAKER_MIN_ITEMS = 4

/** TTL por defecto de la caché de prompts validados (30 días, RF-B45 del PRD). */
export const AI_TRIVIA_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Máximo de items aceptados en un request al endpoint (RF-B41). */
export const MAX_ITEMS_PER_REQUEST = 50

/** Longitud aceptable del riddle (V3). */
export const RIDDLE_MIN_LENGTH = 20
export const RIDDLE_MAX_LENGTH = 280
