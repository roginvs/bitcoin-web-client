/**
 * @typedef {import("./types").MyBigNumber} MyBigNumber
 * @typedef {import("./types").Point} Point
 * @typedef {import("./types").NonZeroPoint} NonZeroPoint
 */

import { describe, eq } from "../tests.mjs";
import { Secp256k1 } from "./curves.named.mjs";
import {
  module_add,
  inverse,
  module_mul,
  module_power,
  square_root,
  to_big_num,
  module_sub,
  cmp_numbers,
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
  const ySquare = module_add(
    module_add(
      module_power(x, to_big_num(x.length, 3), module),
      module_mul(a, x, module),
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

  const lambda_top = module_add(
    module_mul(module_mul(to_big_num(xp.length, 3), xp, module), xp, module),
    a,
    module
  );
  const lambda_bottom = module_mul(to_big_num(xp.length, 2), yp, module);

  const lambda = module_mul(lambda_top, inverse(lambda_bottom, module), module);

  const xr = module_sub(
    module_sub(module_mul(lambda, lambda, module), xp, module),
    xp,
    module
  );

  const yr = module_sub(
    module_mul(lambda, module_sub(xp, xr, module), module),
    yp,
    module
  );
  return [xr, yr];
}

/**
 *
 * @param {Point} p
 * @param {Point} q
 * @param {MyBigNumber} a
 * @param {MyBigNumber} module
 * @returns {Point}
 */
export function point_add(p, q, a, module) {
  if (p === null) {
    return q;
  }
  if (q === null) {
    return p;
  }
  const [xp, yp] = p;
  const [xq, yq] = q;

  if (cmp_numbers(xp, xq) === 0) {
    if (cmp_numbers(yp, yq) === 0) {
      return point_double(p, a, module);
    } else {
      return null;
    }
  }

  const lambda = module_mul(
    module_sub(yq, yp, module),
    inverse(module_sub(xq, xp, module), module),
    module
  );

  const xr = module_sub(
    module_sub(module_mul(lambda, lambda, module), xp, module),
    xq,
    module
  );

  const yr = module_sub(
    module_mul(lambda, module_sub(xp, xr, module), module),
    yp,
    module
  );

  return [xr, yr];
}

describe(`point_double`, () => {
  const GG = point_double(Secp256k1.G, Secp256k1.a, Secp256k1.p);
  if (GG === null) {
    throw new Error(`Got null`);
  }
  eq(
    GG[0],
    "c6047f94 41ed7d6d 3045406e 95c07cd8 5c778e4b 8cef3ca7 abac09b9 5c709ee5"
      .split(" ")
      .map((x) => parseInt(x, 16))
  );

  eq(
    GG[1],
    "1ae168fe a63dc339 a3c58419 466ceaee f7f63265 3266d0e1 236431a9 50cfe52a"
      .split(" ")
      .map((x) => parseInt(x, 16))
  );
});

describe("point_add", () => {
  const GG = point_double(Secp256k1.G, Secp256k1.a, Secp256k1.p);
  const GGG = point_add(Secp256k1.G, GG, Secp256k1.a, Secp256k1.p);
  if (GGG === null) {
    throw new Error(`Got null`);
  }
  eq(
    GGG[0],
    "f9308a01 9258c310 49344f85 f89d5229 b531c845 836f99b0 8601f113 bce036f9"
      .split(" ")
      .map((x) => parseInt(x, 16))
  );

  eq(
    GGG[1],
    "388f7b0f 632de814 0fe337e6 2a37f356 6500a999 34c2231b 6cb9fd75 84b8e672"
      .split(" ")
      .map((x) => parseInt(x, 16))
  );
});
