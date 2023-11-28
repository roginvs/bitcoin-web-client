import { modulo_power_point } from "./my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./my-elliptic-curves/curves.named.mjs";
import { describe } from "./tests.mjs";
import { arrayToBigint, bigintToArray } from "./utils/arraybuffer-bigint.mjs";

/**
 * @param {Uint8Array} privateKey
 * @param {Uint8Array} message
 * @param {Uint8Array} a
 */
function signSchnorrWithK(privateKey, message, a) {
  const dPrime = arrayToBigint(privateKey);
  if (dPrime === 0n || dPrime >= Secp256k1.n) {
    throw new Error(`Wrong private key`);
  }
  const P = modulo_power_point(Secp256k1.G, dPrime, Secp256k1.a, Secp256k1.p);
  if (!P) {
    throw new Error(`Got null as public key`);
  }
  const d = P[1] % 2n === 0n ? dPrime : Secp256k1.n - dPrime;
  const dBytes = bigintToArray(d);
  if (a.byteLength !== 32) {
    throw new Error(`Wrong K`);
  }
}

describe("Schnorr signature", () => {
  //kek
});
