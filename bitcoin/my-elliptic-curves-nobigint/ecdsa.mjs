/**
 * @typedef {import("./types").MyBigNumber} MyBigNumber
 */

import { describe, eq } from "../tests.mjs";
import { modulo_power_point } from "./curves.mjs";
import { Secp256k1 } from "./curves.named.mjs";
import {
  cmp_numbers,
  inverse,
  module_add,
  module_mul,
  number_sub,
} from "./modulo.mjs";

/**
 * @param { {
 *   curve: import("./types").CurveParams;
 *   privateKey: MyBigNumber;
 *   msgHash: MyBigNumber;
 *   k: MyBigNumber;
 * }} param0
 * @returns {import("./types").Signature}
 */
export function signature({ curve, privateKey, msgHash, k }) {
  const kQ = modulo_power_point(curve.G, k, curve.a, curve.p);
  if (!kQ) {
    throw new Error("LOL got infinity, provide better k");
  }

  const r =
    cmp_numbers(kQ[0], curve.n) === 1 ? number_sub(kQ[0], curve.n) : kQ[0];

  const s = module_mul(
    inverse(k, curve.n),
    module_add(msgHash, module_mul(r, privateKey, curve.n), curve.n),
    curve.n
  );

  return { r, s };
}

describe("signature", () => {
  const sig = signature({
    curve: Secp256k1,
    k: new Array(8).fill(0xabababab),
    msgHash: new Array(8).fill(0x01234567),
    privateKey: new Array(8).fill(0x09876543),
  });
  eq(
    sig.r,
    [
      0x81aaadc8, 0xa5e83f45, 0x76df823c, 0xf22a5b19, 0x69cf704a, 0x0d5f6f68,
      0xbd757410, 0xc9917aac,
    ]
  );
  eq(
    sig.s,
    [
      0xfd5a3b9b, 0x2d1d7c87, 0xffc098ff, 0x274d02d8, 0x7e665b45, 0xc01bd593,
      0x42786cab, 0xc649b23a,
    ]
  );
});
