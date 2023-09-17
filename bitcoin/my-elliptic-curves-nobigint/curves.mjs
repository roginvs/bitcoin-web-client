/**
 * @typedef {import("./types").MyBigNumber} MyBigNumber
 * @typedef {import("./types").Point} Point
 * @typedef {import("./types").NonZeroPoint} NonZeroPoint
 */

import { describe, eq } from "../tests.mjs";
import { Secp256k1 } from "./curves.named.mjs";
import {
  modulo_add,
  inverse,
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
 * @returns {NonZeroPoint}
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

/**
 *
 * @param {Point} p
 * @param {MyBigNumber} a
 * @param {MyBigNumber} module
 * @returns {Point}
 */
export function point_double(p, a, module) {
  if (p === null) {
    return null;
  }
  const [xp, yp] = p;
  if (yp.every((x) => x === 0)) {
    return null;
  }

  const lambda_top = modulo_add(
    modulo_mul(modulo_mul(to_big_num(xp.length, 3), xp, module), xp, module),
    a,
    module
  );
  const lambda_bottom = modulo_mul(to_big_num(xp.length, 2), yp, module);

  const lambda = modulo_mul(lambda_top, inverse(lambda_bottom, module), module);

  //const lambda =
  //  ((((BigInt(3) * xp * xp) % module) + a) *
  //    modulo_inverse((BigInt(2) * yp) % module, module)) %
  //  module;
  //
  //const xr =
  //  (((lambda * lambda) % module) + module - xp + module - xp) % module;
  //const yr = (((lambda * (xp + module - xr)) % module) + module - yp) % module;
  //
  //return [xr, yr];
}
