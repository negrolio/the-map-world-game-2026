/**
 * Tiny class name concatenation helper.
 *
 * Joins truthy class values with spaces. Accepts strings, `false`/`null`/
 * `undefined` for conditional cases. Intentionally not a dependency on a
 * third-party utility: there is no class-merge logic, callers control order.
 */
export function cn(...values: ReadonlyArray<string | false | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ')
}
