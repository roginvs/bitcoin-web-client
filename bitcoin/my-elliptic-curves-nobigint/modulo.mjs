import { describe, eq } from "../tests.mjs";

/**
 * @typedef {import("./types").MyBigNumber} MyBigNumber
 *
 */

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
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @returns {MyBigNumber}
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
 * @param {MyBigNumber} n
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
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @returns {MyBigNumber}
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
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 */
export function cmp_numbers(a, b) {
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
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @param {MyBigNumber} module
 * @returns {MyBigNumber}
 */
export function module_add(a, b, module) {
  if (a.length !== b.length || a.length !== module.length) {
    throw new Error(
      `Wrong amount of digits ${a.length} ${b.length} ${module.length}`
    );
  }
  const sum = number_add(a, b);
  const afterReduce =
    cmp_numbers(sum, module) !== -1 ? number_sub(sum, module) : sum;

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
}

/**
 * Returns bit on a number counting from the lowest one
 *
 * @param {MyBigNumber} n
 * @param {number} bitPos
 */
export function get_bit_at(n, bitPos) {
  const numberPos = bitPos >>> 5;
  const bitInNumber = bitPos % 32;
  const numberIndex = n.length - 1 - numberPos;
  if (numberIndex < 0) {
    throw new Error(`Outside of bounds`);
  }
  const num = n[numberIndex];
  const bit = (num >>> bitInNumber) & 1;
  return bit;
}

/**
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @param {MyBigNumber} module
 * @returns {MyBigNumber}
 */
export function module_mul(a, b, module) {
  const bitsTotal = b.length * 32;
  let base = a;
  let result = new Array(module.length).fill(0);
  for (let bitIndex = 0; bitIndex < bitsTotal; bitIndex++) {
    const bit = get_bit_at(b, bitIndex);
    if (bit) {
      result = module_add(result, base, module);
    }
    base = module_add(base, base, module);
  }
  return result;
}

/**
 *
 * @param {number} len
 * @param {number} value
 * @returns {MyBigNumber}
 */
export function to_big_num(len, value) {
  let result = new Array(len).fill(0);
  result[result.length - 1] = value;
  return result;
}

/**
 * Return (a ** b) % module
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @param {MyBigNumber} module
 * @returns {MyBigNumber}
 */
export function module_power(a, b, module) {
  const bitsTotal = b.length * 32;
  let base = a;

  let result = to_big_num(module.length, 1);

  for (let bitIndex = 0; bitIndex < bitsTotal; bitIndex++) {
    const bit = get_bit_at(b, bitIndex);
    if (bit) {
      result = module_mul(result, base, module);
    }
    base = module_mul(base, base, module);
  }
  return result;
}

/**
 *
 * @param {MyBigNumber} n
 * @param {number} bits
 * @returns {MyBigNumber}
 */
function shift(n, bits) {
  if (bits > 32) {
    throw new Error(`Not implemented`);
  }
  const out = [...n];
  for (let i = out.length - 1; i >= 0; i--) {
    const digit = out[i];
    const shiftedPart = digit & (0xffffffff >>> (32 - bits));
    out[i] = digit >>> bits;
    if (i < out.length - 1) {
      const partToAdd = shiftedPart * 2 ** (32 - bits);
      out[i + 1] += partToAdd;
    }
  }
  return out;
}

describe("shift", () => {
  eq(
    shift([0xaabbccdd, 0x11223344, 0x55667788], 8),
    [0x00aabbcc, 0xdd112233, 0x44556677]
  );
});

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
    module_add(
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

describe(`getBitAt`, () => {
  eq(get_bit_at([0, 0b1101], 0), 1);
  eq(get_bit_at([0, 0b1101], 1), 0);

  eq(get_bit_at([0x80000000, 0b1101], 32 + 31 - 1), 0);
  eq(get_bit_at([0x80000000, 0b1101], 32 + 31), 1);
});

describe("modulo_mul", () => {
  const module = [0xffffffff, 0xffffffc5];

  eq(module_mul([0xaabbccdd, 0xeeff3311], [0, 0], module), [0, 0], "zero");

  eq(
    module_mul([0xaabbccdd, 0xeeff3311], [0, 1], module),
    [0xaabbccdd, 0xeeff3311],
    "one"
  );
  /*

  ((BigInt('0xaabbccddeeff3311') * BigInt('0x6622331111884411')) %
     BigInt('0xffffffffffffffc5')).toString(16)
  */
  eq(
    module_mul([0xaabbccdd, 0xeeff3311], [0x66223311, 0x11884411], module),
    [0xc2deba4a, 0x6c8ccdca],
    "many"
  );
});

describe("modulo_power", () => {
  const module = [0xffffffff, 0xffffffc5];

  eq(module_power([0xaabbccdd, 0xeeff3311], [0, 0], module), [0, 1], "zero");

  eq(
    module_power([0xaabbccdd, 0xeeff3311], [0, 1], module),
    [0xaabbccdd, 0xeeff3311],
    "one"
  );
  /*
  
    ((BigInt('0xaabbccddeeff3311') ** BigInt('0x6622331111884411')) %
       BigInt('0xffffffffffffffc5')).toString(16)
    */
  eq(
    module_power([0xaabbccdd, 0xeeff3311], [0x66223311, 0x11884411], module),
    [0x32fe333c, 0x98df7120],
    "many"
  );
});

/**
 *
 * @param {MyBigNumber} a
 * @param {MyBigNumber} module
 */
export function square_root(a, module) {
  const one = to_big_num(module.length, 1);
  let power = number_add(module, one);
  if (get_bit_at(power, 0) !== 0 || get_bit_at(power, 1) !== 0) {
    throw new Error(`Module+1 is not divideable by 4`);
  }
  power = shift(power, 2);
  const result = module_power(a, power, module);
  return result;
}

describe("square_root", () => {
  const module = [0x805e692e, 0xeebc4f6f];
  const num = [0x00abccdd, 0x44331169];
  const root = square_root(num, module);

  const numAgain = module_mul(root, root, module);
  eq(num, numAgain);
});

/**
 * Find inverse if module is a prime number
 * @param {MyBigNumber} n
 * @param {MyBigNumber} module
 */
export function inverse(n, module) {
  const m = number_sub(module, to_big_num(module.length, 2));
  return module_power(n, m, module);
}

describe(`inverse`, () => {
  const module = [0x805e692e, 0xeebc4f6f];
  const num = [0x00abccdd, 0x44331169];
  const inv = inverse(num, module);
  eq(module_mul(num, inv, module), to_big_num(module.length, 1));
});

/**
 *
 * @param {MyBigNumber} a
 * @param {MyBigNumber} b
 * @param {MyBigNumber} module
 */
export function module_sub(a, b, module) {
  const cmp = cmp_numbers(a, b);
  if (cmp === 0) {
    return to_big_num(a.length, 0);
  }
  if (cmp === 1) {
    return number_sub(a, b);
  }
  const afterModuleReduce = number_sub(number_add(a, module), b);
  if (afterModuleReduce.length === module.length) {
    return afterModuleReduce;
  } else if (afterModuleReduce.length === module.length + 1) {
    if (afterModuleReduce[0] !== 0) {
      throw new Error("Unexpected non-zero value");
    }
    return afterModuleReduce.slice(1);
  } else {
    throw new Error(`Unexpected length`);
  }
}

describe("module_sub", () => {
  {
    const module = [0x805e692e, 0xeebc4f6f];
    const num = [0x00abccdd, 0x44331169];

    eq(module_sub(num, num, module), to_big_num(module.length, 0));
  }
  {
    // a + b == c
    // a == c - b
    // b == c - a
    const a = [0xaabbccdd, 0xeeff1122, 0x004422aa];
    const b = [0xffeeccdd, 0x22441199, 0xbbcceeaa];
    const c = [0xaaaaccdd, 0xeeff1122, 0x004422aa];
    const module = [0xffffccdd, 0x22441199, 0xbbcceeaa];

    eq(module_add(a, b, module), c, "Once again verify that a+b == c");
    eq(module_sub(c, b, module), a);
    eq(module_sub(c, a, module), b);
  }
});
