/**
 * Adds two 32-bit unsigned numbers
 * @param {number} a
 * @param {number} b
 */
function number_add(a, b) {
  const sum = a + b;
  return [sum >= 2 ** 32 ? 1 : 0, sum >>> 0];
}

/**
 *
 * @param {import("./types").MyBigNumber} a
 * @param {import("./types").MyBigNumber} b
 * @param {import("./types").MyBigNumber} module
 */
function modulo_add(a, b, module) {
  if (a.length !== b.length) {
    throw new Error(`Wrong amount of digits`);
  }
  if (a.length !== module.length) {
    throw new Error(`Wrong amount of digits`);
  }
}

/**
 *
 * @param {import("./types").MyBigNumber} base
 * @param {import("./types").MyBigNumber} power
 * @param {import("./types").MyBigNumber} module
 */
export function modulo_power(base, power, module) {
  // TODO
}

/**
 *
 * @param {bigint} a
 * @param {bigint} module
 */
function legendre_symbol(a, module) {
  return modulo_power(a, (module - BigInt(1)) / BigInt(2), module);
}

/**
 *
 * @param {bigint} a
 * @param {bigint} module
 */
export function square_root(a, module) {
  // Tonelli–Shanks_algorithm
  if (legendre_symbol(a, module) != BigInt(1)) {
    throw new Error(`Not a quadratic residue`);
  }
  /**
   *
   * @param {bigint} p
   * @returns
   */
  function get_2s_q(p) {
    const p1 = p - BigInt(1);
    let q = p1;
    let s = BigInt(0);
    while (q % BigInt(2) == BigInt(0)) {
      q = q / BigInt(2);
      s += BigInt(1);
    }
    // if (BigInt(2) ** BigInt(s) * q !== p1) {
    //   throw new Error("Internal error");
    // }
    // if (q % BigInt(2) == BigInt(0)) {
    //   throw new Error("Internal error ");
    // }

    return { s, q };
  }

  const { s, q } = get_2s_q(module);

  if (s == BigInt(1)) {
    const result = modulo_power(a, (module + BigInt(1)) / BigInt(4), module);
    // if (modulo_power(result, BigInt(2), module) != a) {
    //   throw new Error("Internal error");
    // }
    return result;
  } else {
    throw new Error("LOL not implemented");
  }
}

/**
 * Return (g, x, y) such that a*x + b*y = g = gcd(a, b)
 * @param {bigint} a
 * @param {bigint} b
 * @returns {[bigint, bigint, bigint]}
 */
function extended_euclidean(a, b) {
  if (a == BigInt(0)) {
    return [b, BigInt(0), BigInt(1)];
  } else {
    const [g, y, x] = extended_euclidean(b % a, a);
    return [g, x - (b / a) * y, y];
  }
}

/**
 *
 * @param {bigint} a
 * @param {bigint} module
 */
export function modulo_inverse(a, module) {
  const [g, x, y] = extended_euclidean(a, module);
  if (g != BigInt(1)) {
    throw new Error("modular inverse does not exist");
  } else {
    return (x + module) % module;
  }
}
