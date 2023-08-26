import { describe, eq } from "../tests.mjs";

/**
 * Adds 32-bit unsigned numbers
 * Returns [overflow, sum]
 * @param {number} a
 * @param {number} b
 * @param {number} [c]
 */
function digit_add(a, b, c) {
  const sum = a + b + (c || 0);
  return [sum >= 2 ** 32 ? 1 : 0, sum >>> 0];
}

/**
 * Subs 32-bit unsigned numbers
 * @param {number} a
 * @param {number} b
 */
function digit_sub(a, b) {
  if (a >= b) {
    return [0, a - b];
  } else {
    return [1, 0x100000000 + a - b];
  }
}

/**
 * Returns sum of two big numbers. Must have same amount of digits
 * Result have 1 digit more due to possible overflow
 * @param {import("./types").MyBigNumber} a
 * @param {import("./types").MyBigNumber} b
 */
function number_add(a, b) {
  const sum = new Array(a.length + 1).fill(0);

  let overflow = 0;
  for (let i = a.length - 1; i >= 0; i--) {
    const [o, s] = digit_add(a[i], b[i], overflow);
    overflow = o;
    sum[i + 1] = s;
  }
  sum[0] = overflow;

  return sum;
}

/**
 * @param {import("./types").MyBigNumber} n
} n 
 */
function remove_leading_zeros(n) {
  let i = 0;
  while (i < n.length) {
    if (n[i] !== 0) {
      break;
    }
    i++;
  }
  return n.slice(i);
}

/**
 * Always expecting that a >= b, throws if not
 * @param {import("./types").MyBigNumber} a
 * @param {import("./types").MyBigNumber} b
 */
function number_sub(a, b) {
  const maxlen = Math.max(a.length, b.length);

  let overflow = 0;
  const sub = new Array(maxlen).fill(0);
  for (let i = maxlen - 1; i >= 0; i--) {
    const digitAindex = i - (maxlen - a.length);
    const digitBindex = i - (maxlen - b.length);
    const aDigit = digitAindex >= 0 ? a[digitAindex] : 0;
    const bDigit = digitBindex >= 0 ? b[digitBindex] : 0;
    const [overflow1, digit1] = digit_sub(aDigit, bDigit);
    const [overflow2, digit2] = digit_sub(digit1, overflow);
    sub[i] = digit2;
    overflow = overflow1 + overflow2;
  }
  if (overflow !== 0) {
    throw new Error(`Looks like a < b`);
  }

  return sub;
}

/**
 * Returns 1 if a > b
 * Returns -1 if a < b
 * Return 0 if equal
 * @param {import("./types").MyBigNumber} a
 * @param {import("./types").MyBigNumber} b
 */
function cmp_numbers(a, b) {
  const maxlen = Math.max(a.length, b.length);
  for (let i = 0; i < maxlen; i++) {
    const digitAindex = i - (maxlen - a.length);
    const digitBindex = i - (maxlen - b.length);
    const aDigit = digitAindex >= 0 ? a[digitAindex] : 0;
    const bDigit = digitBindex >= 0 ? b[digitBindex] : 0;
    if (aDigit > bDigit) {
      return 1;
    }
    if (aDigit < bDigit) {
      return -1;
    }
  }
  return 0;
}

/**
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
  const sum = number_add(a, b);
  if (cmp_numbers(sum, module) !== -1) {
    const afterReduce = number_sub(sum, module);

    if (afterReduce.length === a.length) {
      return afterReduce;
    } else if (afterReduce.length === a.length + 1) {
      if (afterReduce[0] !== 0) {
        throw new Error(`Internal error: must be zero`);
      }
      return afterReduce.slice(1);
    } else {
      throw new Error(`Unknown length after reduce`);
    }
  } else {
    return sum;
  }
}

describe(`number_add`, () => {
  // (BigInt('0xaabbccddeeff1122004422aa') + BigInt('0xffeeccdd22441199bbcceeaa'))
  //  == BigInt('0x1aaaa99bb114322bbbc111154')
  eq(
    number_add(
      [0xaabbccdd, 0xeeff1122, 0x004422aa],
      [0xffeeccdd, 0x22441199, 0xbbcceeaa]
    ),
    [0x1, 0xaaaa99bb, 0x114322bb, 0xbc111154],
    "Some big number with overflow"
  );
});
describe(`number_sub`, () => {
  /*
   (BigInt('0xaabbccddeeff1122004422aa') + BigInt('0xffeeccdd22441199bbcceeaa'))
    == BigInt('0x1aaaa99bb114322bbbc111154')
    */

  eq(number_sub([0x1], [0x1]), [0], "Small num 1");
  eq(number_sub([0x10], [0x1]), [0xf], "Small num 1");

  eq(
    number_sub(
      [0x1, 0xaaaa99bb, 0x114322bb, 0xbc111154],
      [0xffeeccdd, 0x22441199, 0xbbcceeaa]
    ),
    [0, 0xaabbccdd, 0xeeff1122, 0x004422aa],
    "Some big number with overflow"
  );

  /*

        (BigInt('0x1aaaa99bb114322bbbc111154') - BigInt('0xaaaaccddeeff1122004422aa')) ===
        BigInt('0xffffccdd22441199bbcceeaa')
  */
  eq(
    number_sub(
      [0x1, 0xaaaa99bb, 0x114322bb, 0xbc111154],
      [0xaaaaccdd, 0xeeff1122, 0x004422aa]
    ),
    [0x0, 0xffffccdd, 0x22441199, 0xbbcceeaa],
    "Some big number with overflow 2"
  );
});

describe("modulo_add", () => {
  /* 
    ((BigInt('0xaabbccddeeff1122004422aa') + BigInt('0xffeeccdd22441199bbcceeaa')) % 
      BigInt('0xffFFccdd22441199bbcceeaa')) ===
      BigInt('0xaaaaccddeeff1122004422aa')
    */
  eq(
    modulo_add(
      [0xaabbccdd, 0xeeff1122, 0x004422aa],
      [0xffeeccdd, 0x22441199, 0xbbcceeaa],
      [0xffffccdd, 0x22441199, 0xbbcceeaa]
    ),
    [0xaaaaccdd, 0xeeff1122, 0x004422aa],
    "Some big number with overflow"
  );
});
describe(`cmp_numbers`, () => {
  eq(cmp_numbers([], []), 0);
  eq(cmp_numbers([1, 2, 3], [1, 2, 3]), 0);
  eq(cmp_numbers([1, 2, 3], [0, 0, 1, 2, 3]), 0);
  eq(cmp_numbers([1, 2, 3], [2, 2, 3]), -1);
  eq(cmp_numbers([1, 2, 3], [1, 2, 4]), -1);
  eq(cmp_numbers([5, 2, 3], [5, 1, 4]), 1);
});

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
