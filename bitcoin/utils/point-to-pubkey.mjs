/**
 *
 * @param {import("../my-elliptic-curves/curves.types").Point} point
 */
export function pointToCompressedPubkey(point) {
  if (!point) {
    throw new Error(`Must not be zero!`);
  }
  //
}
