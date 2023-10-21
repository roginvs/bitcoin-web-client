import { describe, eq } from "./bitcoin/tests.mjs";

/**
 * @param {number} sat
 */
export function satToBtcStr(sat) {
  let out = sat.toString();
  out = "0".repeat(Math.max(0, 9 - out.length)) + out;
  out = out.slice(0, -8) + "." + out.slice(-8);
  return out;
}

/**
 *
 * @param {string} str
 */
export function btcStrToSat(str) {
  let dotIdx = str.indexOf(".");
  if (dotIdx < 0) {
    dotIdx = str.length;
  }
  const beforeDot = str.slice(0, dotIdx);
  const afterDot = str.slice(dotIdx + 1).padEnd(8, "0");
  if (afterDot.length > 8) {
    return null;
  }
  const out = Number(beforeDot + afterDot);
  if (isNaN(out)) {
    return null;
  }
  return out;
}

describe(`BtcStr -> sat conversion`, () => {
  const testCases = {
    0: 0,
    "0.": 0,
    1: 100000000,
    "0.00000001": 1,
    0.00001: 1000,
    "0.00001000": 1000,
    0.001: 100000,
    ".001": 100000,

    "0.00001000000": null,
    "a0.1": null,
    "0.222d": null,
    "1a": null,
    "1 ": null,
  };
  for (const [btc, sat] of Object.entries(testCases)) {
    eq(btcStrToSat(btc), sat, `${btc} -> ${sat}`);
  }
});
describe("sat -> btcStr conversion", () => {
  const testCases = /** @type {const} */ ([
    [1, "0.00000001"],
    [1234, "0.00001234"],
    [1234000, "0.01234000"],
    [123456789, "1.23456789"],
  ]);
  for (const [sat, btc] of testCases) {
    eq(satToBtcStr(sat), btc, `${sat} -> ${btc}`);
  }
});
