/**
 *
 * @param  {...Uint8Array} buffers
 */
export function joinBuffers(...buffers) {
  const len = buffers.reduce((acc, cur) => (acc = acc + cur.length), 0);
  const out = new Uint8Array(len);

  let i = 0;
  for (const b of buffers) {
    out.set(b, i);
    i += b.length;
  }
  return out;
}
