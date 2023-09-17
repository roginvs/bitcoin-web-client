/**
 * @typedef {import("./types").MyBigNumber} MyBigNumber
 */

import { describe, eq } from "../tests.mjs";
import { Secp256k1 } from "./curves.named.mjs";
import {
  modulo_add,
  modulo_mul,
  modulo_power,
  square_root,
  to_big_num,
} from "./modulo.mjs";

/**
 *
 * @param {MyBigNumber} x
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @param {MyBigNumber} module
 * @returns {import("./types").NonZeroPoint}
 */
export function get_point_from_x(x, a, b, module) {
  const ySquare = modulo_add(
    modulo_add(
      modulo_power(x, to_big_num(x.length, 3), module),
      modulo_mul(a, x, module),
      module
    ),
    b,
    module
  );

  const y = square_root(ySquare, module);
  return [x, y];
}

describe("get_point_from_x", () => {
  eq(
    get_point_from_x(Secp256k1.G[0], Secp256k1.a, Secp256k1.b, Secp256k1.p)[1],
    Secp256k1.G[1]
  );
});
