/**
 * @param {never} x
 * @returns {never}
 */
export function assertNever(x) {
  throw new Error(`Unexpected ${x}`);
}
