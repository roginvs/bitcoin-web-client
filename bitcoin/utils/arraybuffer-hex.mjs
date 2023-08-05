import { describe, eq } from "../tests.mjs";

/**
 *
 * @param {ArrayBuffer} buf
 */
export function bufToHex(buf) {
  return new Uint8Array(buf).reduce(function (hex, byte) {
    return hex + byte.toString(16).padStart(2, "0");
  }, "");
}

/**
 *
 * @param {string} hex
 * @param {boolean} [isReversed=false]
 * @returns {ArrayBuffer}
 */
export function parseHexToBuf(hex, isReversed = false) {
  const m = hex.match(/../g);
  if (!m) {
    throw new Error(`No match!`);
  }
  const values = !isReversed ? m : [...m].reverse();
  return new Uint8Array(values.map((x) => parseInt(x, 16))).buffer;
}

describe(`bufToHex`, () => {
  eq(bufToHex(new Uint8Array([0xaa, 0xbb, 0xcc])), "aabbcc");
});

describe(`parseHexToBuf`, () => {
  eq(bufToHex(parseHexToBuf("aabbcc")), "aabbcc");
});
