import { describe, eq } from "../tests.mjs";
import { bitcoinAddressFromData } from "./address.mjs";
import { addressToPkScript } from "./address_to_pkscript.mjs";
import { encode } from "./bech32/segwit_addr.mjs";

/**
 *
 * @param {import("../protocol/messages.types").PkScript} pkScript
 */
export function pkScriptToAddress(pkScript) {
  const view = new Uint8Array(pkScript);

  if (
    view[0] === 0 &&
    (view[1] === 0x14 || view[1] === 0x20) &&
    (view.length === 0x14 + 2 || view.length === 0x20 + 2)
  ) {
    const data = pkScript.slice(2);
    return encode("bc", 0, [...new Uint8Array(data)]);
  } else if (view[0] === 0x51 && view[1] === 0x20 && view.length === 0x20 + 2) {
    const data = pkScript.slice(2);
    return encode("bc", 1, [...new Uint8Array(data)]);
  } else if (
    view.length === 25 &&
    view[0] === 0x76 &&
    view[1] === 0xa9 &&
    view[2] === 0x14 &&
    view[23] === 0x88 &&
    view[24] === 0xac
  ) {
    const data = pkScript.slice(3, 23);
    return bitcoinAddressFromData(data, 0);
  } else if (
    view.length === 23 &&
    view[0] === 0xa9 &&
    view[1] === 0x14 &&
    view[22] === 0x87
  ) {
    const data = pkScript.slice(2, 22);
    return bitcoinAddressFromData(data, 5);
  }
  return "<unknown>";
}

describe(`pkScriptToAddress`, () => {
  for (const addr of [
    "bc1qnnadqr2q2ycw5n52f4wnsxju3fry973wvewf6q",
    "bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak",
    "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    "bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297",
  ]) {
    eq(pkScriptToAddress(addressToPkScript(addr)), addr, addr);
  }
});
