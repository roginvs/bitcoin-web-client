import { describe, eq } from "../tests.mjs";
import { arrayToBigint } from "./arraybuffer-bigint.mjs";
import { bufToHex, parseHexToBuf } from "./arraybuffer-hex.mjs";

const codeString = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 *
 * @param {ArrayBuffer} data
 */
export function base58encode(data) {
  let output = "";
  let x = arrayToBigint(data);

  while (x > BigInt(0)) {
    const remainder = x % BigInt(58);
    x = x / BigInt(58);
    output += codeString.charAt(Number(remainder));
  }
  let i = 0;
  const view = new Uint8Array(data);
  while (i < view.length && view[i] === 0x00) {
    output += "1";
    i++;
  }
  return output.split("").reverse().join("");
}

/**
 *
 * @param {string} data
 */
export function base58decode(data) {
  let out = BigInt(0);
  for (const [pos, digit] of data.split("").reverse().entries()) {
    const digitNum = codeString.indexOf(digit);
    if (digitNum < 0) {
      throw new Error(`Wrong base58 char ${digit}`);
    }
    out = out + BigInt(digitNum) * BigInt(58) ** BigInt(pos);
  }
  let outStr = out.toString(16);
  if (outStr.length % 2 != 0) {
    outStr = "0" + outStr;
  }

  let i = 0;
  while (i < data.length && data.charAt(i) === "1") {
    outStr = "00" + outStr;
    i++;
  }
  return parseHexToBuf(outStr);
}

const testData = {
  "0000030405": "1121kY",
  "009C13ABEAA29473787191861F62952F651CE6EDAC3D6CC5B3":
    "1FEFyjGTFbc128EXz298mRd2PsPGhobkWe",
};
describe(`base58encode`, () => {
  for (const [input, output] of Object.entries(testData)) {
    eq(
      base58encode(parseHexToBuf(input)),
      output,
      `Encodes ${input} into ${output}`
    );
  }
});
describe(`base58decode`, () => {
  for (const [output, input] of Object.entries(testData)) {
    eq(
      bufToHex(base58decode(input)).toUpperCase(),
      output,
      `Decodes ${input} into ${output}`
    );
  }
});
