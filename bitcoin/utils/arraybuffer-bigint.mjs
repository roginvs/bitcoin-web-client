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
 * @param {bigint} int
 * @returns {ArrayBuffer}
 */
export function bigintToArray(int) {
  /** @type {number[]} */
  const arr = [];
  while (int > 0n) {
    const digit = int % 256n;
    int = int / 256n;
    arr.unshift(Number(digit));
  }

  return new Uint8Array(arr).buffer;
}

/*


arrayToBigint(
    new Uint8Array('5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'.match(/../g).map(x => parseInt(x, 16)))
) == BigInt(
    "0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"
)

*/
