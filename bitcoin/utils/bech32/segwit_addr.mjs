// Copyright (c) 2017, 2021 Pieter Wuille
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as bech32 from "./bech32.mjs";

/**
 *
 * @param {number[]} data
 * @param {number} frombits
 * @param {number} tobits
 * @param {boolean} pad
 */
function convertbits(data, frombits, tobits, pad) {
  var acc = 0;
  var bits = 0;
  var ret = [];
  var maxv = (1 << tobits) - 1;
  for (var p = 0; p < data.length; ++p) {
    var value = data[p];
    if (value < 0 || value >> frombits !== 0) {
      throw new Error();
    }
    acc = (acc << frombits) | value;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (tobits - bits)) & maxv);
    }
  } else if (bits >= frombits || (acc << (tobits - bits)) & maxv) {
    throw new Error();
  }
  return ret;
}

/**
 *
 * @param {string} hrp
 * @param {string} addr
 */
export function decode(hrp, addr) {
  var bech32m = false;
  var dec = bech32.decode(addr, bech32.encodings.BECH32);
  if (dec === null) {
    dec = bech32.decode(addr, bech32.encodings.BECH32M);
    bech32m = true;
  }
  if (
    dec === null ||
    dec.hrp !== hrp ||
    dec.data.length < 1 ||
    dec.data[0] > 16
  ) {
    return null;
  }
  var res = convertbits(dec.data.slice(1), 5, 8, false);
  if (res === null || res.length < 2 || res.length > 40) {
    return null;
  }
  if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
    return null;
  }
  if (dec.data[0] === 0 && bech32m) {
    return null;
  }
  if (dec.data[0] !== 0 && !bech32m) {
    return null;
  }
  return { version: dec.data[0], program: res };
}

/**
 *
 * @param {string} hrp
 * @param {number} version
 * @param {number[]} program
 * @returns
 */
export function encode(hrp, version, program) {
  const enc = version > 0 ? bech32.encodings.BECH32M : bech32.encodings.BECH32;

  var ret = bech32.encode(
    hrp,
    [version].concat(convertbits(program, 8, 5, true)),
    enc
  );
  if (decode(hrp, ret) === null) {
    return null;
  }
  return ret;
}
