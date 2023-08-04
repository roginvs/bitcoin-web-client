/**
 *
 * @param {ArrayBuffer} buf
 */
export function arrayToBigint(buf) {
  let bits = 8n;
  const bufView = new Uint8Array(buf);

  let ret = 0n;
  for (const i of bufView.values()) {
    const bi = BigInt(i);
    ret = (ret << bits) + bi;
  }
  return ret;
}

/**
 *
 * @param {string} hex
 * @returns {ArrayBuffer}
 */
export function parseHexToBuf(hex) {
  const m = hex.match(/../g);
  if (!m) {
    throw new Error(`No match!`);
  }
  return new Uint8Array(m.map((x) => parseInt(x, 16))).buffer;
}
/*


arrayToBigint(
    new Uint8Array('5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'.match(/../g).map(x => parseInt(x, 16)))
) == BigInt(
    "0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"
)

*/
