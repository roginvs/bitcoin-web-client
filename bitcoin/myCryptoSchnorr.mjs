import {
  get_point_from_x,
  get_point_inverse,
  modulo_power_point,
  point_add,
} from "./my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./my-elliptic-curves/curves.named.mjs";
import { taggedTash } from "./my-hashes/taggedHash.mjs";
import { describe, eq } from "./tests.mjs";
import { arrayToBigint, bigintToArray } from "./utils/arraybuffer-bigint.mjs";
import { bufToHex, parseHexToBuf } from "./utils/arraybuffer-hex.mjs";
import { joinBuffers } from "./utils/joinBuffers.mjs";

/**
 * @param {Uint8Array} privateKey
 * @param {Uint8Array} message
 */
export function signSchnorr(privateKey, message) {
  const kBuf = new Uint8Array(32);
  crypto.getRandomValues(kBuf);
  return signSchnorrWithK(privateKey, message, kBuf);
}

/**
 * @param {Uint8Array} privateKey
 * @param {Uint8Array} message
 * @param {Uint8Array} a
 */
function signSchnorrWithK(privateKey, message, a) {
  if (a.byteLength !== 32) {
    throw new Error(`Wrong K`);
  }

  const dPrime = arrayToBigint(privateKey);
  if (dPrime === 0n || dPrime >= Secp256k1.n) {
    throw new Error(`Wrong private key`);
  }
  const P = modulo_power_point(Secp256k1.G, dPrime, Secp256k1.a, Secp256k1.p);
  if (!P) {
    throw new Error(`Got null as public key`);
  }

  const d = P[1] % 2n === 0n ? dPrime : Secp256k1.n - dPrime;
  const bytes_d = bigintToArray(d, 32);
  const t = byteWiseXor(
    new Uint8Array(bytes_d),
    new Uint8Array(taggedTash("BIP0340/aux", a))
  );
  const bytes_P = new Uint8Array(bigintToArray(P[0], 32));
  const rand = taggedTash("BIP0340/nonce", joinBuffers(t, bytes_P, message));
  const kPrime = arrayToBigint(rand) % Secp256k1.n;
  if (kPrime === 0n) {
    throw new Error(`Back luck with K`);
  }
  const R = modulo_power_point(Secp256k1.G, kPrime, Secp256k1.a, Secp256k1.p);
  if (!R) {
    throw new Error(`Bad luck with K, got null`);
  }
  const k = R[1] % 2n === 0n ? kPrime : Secp256k1.n - kPrime;
  const bytes_R = new Uint8Array(bigintToArray(R[0], 32));

  const e =
    arrayToBigint(
      taggedTash("BIP0340/challenge", joinBuffers(bytes_R, bytes_P, message))
    ) % Secp256k1.n;

  const sig1 = bytes_R;
  const sig2 = new Uint8Array(bigintToArray((k + e * d) % Secp256k1.n, 32));

  const sig = joinBuffers(sig1, sig2);

  if (!verifySchnorr(bytes_P, message, sig)) {
    throw new Error(`Verification failed`);
  }

  return sig;
}
/**
 *
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 */
function byteWiseXor(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Must be equal length`);
  }
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i] ^ b[i];
  }
  return out;
}

/**
 *
 * @param {bigint} x
 * @returns {import("./my-elliptic-curves/curves.types").Point}
 */
function lift_x(x) {
  const P = get_point_from_x(x, Secp256k1.a, Secp256k1.b, Secp256k1.p);
  if (!P) {
    return null;
  }
  if (P[1] % 2n === 0n) {
    return P;
  } else {
    return [P[0], Secp256k1.p - P[1]];
  }
}
/**
 *
 * @param {Uint8Array} publicKey
 * @param {Uint8Array} message
 * @param {Uint8Array} sig
 */
export function verifySchnorr(publicKey, message, sig) {
  const P = lift_x(arrayToBigint(publicKey));
  if (!P) {
    return false;
  }
  const r = arrayToBigint(sig.slice(0, 32));
  if (r >= Secp256k1.p) {
    return false;
  }
  const s = arrayToBigint(sig.slice(32, 64));
  if (s >= Secp256k1.n) {
    return false;
  }
  const e =
    arrayToBigint(
      taggedTash(
        "BIP0340/challenge",
        joinBuffers(
          sig.slice(0, 32),
          new Uint8Array(bigintToArray(P[0], 32)),
          message
        )
      )
    ) % Secp256k1.n;
  const R = point_add(
    modulo_power_point(Secp256k1.G, s, Secp256k1.a, Secp256k1.p),
    get_point_inverse(
      modulo_power_point(P, e, Secp256k1.a, Secp256k1.p),
      Secp256k1.p
    ),
    Secp256k1.a,
    Secp256k1.p
  );
  if (!R) {
    return false;
  }
  if (R[1] % 2n !== 0n) {
    return false;
  }
  if (R[0] !== r) {
    return false;
  }
  return true;
}

describe("byteWiseXor", () => {
  eq(
    bufToHex(
      byteWiseXor(
        new Uint8Array(parseHexToBuf("AABBCCDD")),
        new Uint8Array(parseHexToBuf("EE993312"))
      )
    ),
    "4422ffcf"
  );
});

describe("Schnorr signature", () => {
  const sig = bufToHex(
    signSchnorrWithK(
      new Uint8Array(
        parseHexToBuf(
          "C90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B14E5C9"
        )
      ),
      new Uint8Array(
        parseHexToBuf(
          "7E2D58D8B3BCDF1ABADEC7829054F90DDA9805AAB56C77333024B9D0A508B75C"
        )
      ),
      new Uint8Array(
        parseHexToBuf(
          "C87AA53824B4D7AE2EB035A2B5BBBCCC080E76CDC6D1692C4B0B62D798E6D906"
        )
      )
    )
  );
  eq(
    sig.toUpperCase(),
    "5831AAEED7B44BB74E5EAB94BA9D4294C49BCF2A60728D8B4C200F50DD313C1BAB745879A5AD954A72C45A91C3A51D3C7ADEA98D82F8481E0E1E03674A6F3FB7"
  );
});
