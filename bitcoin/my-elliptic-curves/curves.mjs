import { modulo_inverse, modulo_power, square_root } from "./modulo.mjs";

/**
 *
 * @param {bigint} x
 * @param {bigint} a
 * @param {bigint} b
 * @param {bigint} module
 * @returns {import("./curves.types").Point}
 */
export function get_point_from_x(x, a, b, module) {
  const ySquare = (modulo_power(x, BigInt(3), module) + a * x + b) % module;
  const y = square_root(ySquare, module);
  return [x, y];
}

/**
 *
 * @param {import("./curves.types").Point} p
 * @param {bigint} a
 * @param {bigint} module
 * @returns {import("./curves.types").Point}
 */
export function point_double(p, a, module) {
  if (p === null) {
    return null;
  }
  const [xp, yp] = p;
  if (yp == BigInt(0)) {
    return null;
  }

  const lambda =
    ((((BigInt(3) * xp * xp) % module) + a) *
      modulo_inverse((BigInt(2) * yp) % module, module)) %
    module;

  const xr =
    (((lambda * lambda) % module) + module - xp + module - xp) % module;
  const yr = (((lambda * (xp + module - xr)) % module) + module - yp) % module;

  return [xr, yr];
}

/**
 *
 * @param {import("./curves.types").Point} p
 * @param {import("./curves.types").Point} q
 * @param {bigint} a
 * @param {bigint} module
 * @returns {import("./curves.types").Point}
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

  if (xp === xq) {
    if (yp === yq) {
      return point_double(p, a, module);
    } else {
      return null;
    }
  }

  const lambda =
    (((yq + module - yp) % module) *
      modulo_inverse((xq + module - xp) % module, module)) %
    module;
  const xr =
    (((lambda * lambda) % module) + module - xp + module - xq) % module;
  const yr = (((lambda * (xp + module - xr)) % module) + module - yp) % module;
  return [xr, yr];
}

/**
 *
 * @param {import("./curves.types").Point} base
 * @param {bigint} power
 * @param {bigint} a
 * @param {bigint} module
 * @returns {import("./curves.types").Point}
 */
export function modulo_power_point(base, power, a, module) {
  /** @type {import("./curves.types").Point} */
  let result = null;
  while (power > 0) {
    if (power % BigInt(2) !== BigInt(0)) {
      power = power - BigInt(1);
      result = point_add(result, base, a, module);
    }
    power = power / BigInt(2);
    base = point_double(base, a, module);
  }
  return result;
}

/**
 *
 * @param {import("./curves.types").Point} p
 * @param {bigint} a
 * @param {bigint} b
 * @param {bigint} module
 */
export function is_on_curve(p, a, b, module) {
  if (p === null) {
    return true;
  }
  const [x, y] = p;
  const y2 = (y * y) % module;
  const y2fromx = (((x * x * x) % module) + ((a * x) % module) + b) % module;
  return y2 === y2fromx;
}

/**
 *
 * @param {import("./curves.types").Point} point
 * @param {bigint} curve_p
 * @returns {import("./curves.types").Point}
 */
export function get_point_inverse(point, curve_p) {
  if (!point) {
    return point;
  }
  return [point[0], curve_p - point[1]];
}
