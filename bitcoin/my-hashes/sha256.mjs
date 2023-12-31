// https://csrc.nist.gov/csrc/media/publications/fips/180/2/archive/2002-08-01/documents/fips180-2.pdf

/**
 *
 * @param {ArrayBuffer} msg
 */
export function padMessage(msg) {
  const Lbytes = msg.byteLength;
  const sizeWithNoAppends = Lbytes + 1 + 8;
  const bytesAppend = 64 - (sizeWithNoAppends % 64);

  const out = new Uint8Array(sizeWithNoAppends + bytesAppend);
  out.set(new Uint8Array(msg));
  out[Lbytes] = 0b10000000;
  out.fill(0, sizeWithNoAppends, sizeWithNoAppends + bytesAppend);
  new DataView(out.buffer).setBigUint64(
    sizeWithNoAppends + bytesAppend - 8,
    BigInt(Lbytes * 8),
    false
  );

  return out.buffer;
}

/**
 *
 * @param {number} n
 * @param {number} bits
 */
export function rightrotate(n, bits) {
  return ((n >>> bits) | (((n * 2 ** (32 - bits)) & 0xffffffff) >>> 0)) >>> 0;
}
/**
 *
 * @param {number} n
 * @param {number} bits
 */
export function rightshift(n, bits) {
  if (bits === 32) {
    // Why >>> works like this?
    return 0;
  }
  return n >>> bits;
}

/**
 *
 * @param {number[]} args
 */
export function xor(...args) {
  let out = args[0];
  for (let i = 1; i < args.length; i++) {
    out = (out ^ args[i]) >>> 0;
  }
  return out;
}
/**
 *
 * @param {number} a
 * @returns
 */
export function not(a) {
  return ~a >>> 0;
}
/**
 *
 * @param {number} a
 * @param {number} b
 * @returns
 */
export function and(a, b) {
  return (a & b) >>> 0;
}

/**
 *
 * @param {ArrayBuffer} data
 */
export function sha256(data) {
  const chunks = padMessage(data);
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const w = new Array(64).fill(0);

  let chunkIndex = 0;
  while (chunks.byteLength > 64 * chunkIndex) {
    const chunk = new DataView(
      chunks.slice(64 * chunkIndex, 64 * chunkIndex + 64)
    );

    // copy chunk into first 16 words w[0..15] of the message schedule array
    for (let i = 0; i < 16; i++) {
      w[i] = chunk.getUint32(i * 4, false);
    }

    // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array:
    for (let i = 16; i < 64; i++) {
      // s0 := (w[i-15] rightrotate  7) xor (w[i-15] rightrotate 18) xor (w[i-15] rightshift  3)
      const s0 = xor(
        rightrotate(w[i - 15], 7),
        rightrotate(w[i - 15], 18),
        rightshift(w[i - 15], 3)
      );
      // s1 := (w[i-2] rightrotate 17) xor (w[i-2] rightrotate 19) xor (w[i-2] rightshift 10)
      const s1 = xor(
        rightrotate(w[i - 2], 17),
        rightrotate(w[i - 2], 19),
        rightshift(w[i - 2], 10)
      );
      // w[i] := w[i-16] + s0 + w[i-7] + s1
      const w_i = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      w[i] = w_i;
    }

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (let i = 0; i < 64; i++) {
      // S1 := (e rightrotate 6) xor (e rightrotate 11) xor (e rightrotate 25)
      const s1 = xor(rightrotate(e, 6), rightrotate(e, 11), rightrotate(e, 25));
      // ch := (e and f) xor ((not e) and g)
      const ch = xor(and(e, f), and(not(e), g));
      // temp1 := h + S1 + ch + k[i] + w[i]
      const temp1 = (h + s1 + ch + k[i] + w[i]) >>> 0;
      // S0 := (a rightrotate 2) xor (a rightrotate 13) xor (a rightrotate 22)
      const s0 = xor(rightrotate(a, 2), rightrotate(a, 13), rightrotate(a, 22));
      // maj := (a and b) xor (a and c) xor (b and c)
      const maj = xor(and(a, b), and(a, c), and(b, c));
      // temp2 := S0 + maj
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;

    chunkIndex++;
  }

  const out = new DataView(new ArrayBuffer(8 * 4));
  for (let i = 0; i < 8; i++) {
    out.setUint32(i * 4, hash[i], false);
  }
  return out.buffer;
}

/**
 *
 * @param {ArrayBuffer} data
 */
export function double_sha256(data) {
  return sha256(sha256(data));
}
