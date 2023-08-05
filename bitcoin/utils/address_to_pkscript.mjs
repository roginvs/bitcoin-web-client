import { describe, eq } from "../tests.mjs";
import { bufToHex } from "./arraybuffer-hex.mjs";
import { decode } from "./bech32/segwit_addr.mjs";

/**
 *
 * @param {string} addr
 */
export function addressToPkScript(addr) {
  if (addr.startsWith("bc1")) {
    const decoded = decode("bc", addr);
    if (!decoded) {
      throw new Error(`Failed to decode!`);
    }
    if (decoded.version !== 0) {
      throw new Error(`Unknown version`);
    }
    const buf = new Uint8Array([0, decoded.program.length, ...decoded.program]);
    return buf;
  }

  throw new Error(`Not implemented yet!`);
}

describe(`addressToPkScript`, () => {
  eq(
    bufToHex(addressToPkScript("bc1qnnadqr2q2ycw5n52f4wnsxju3fry973wvewf6q")),
    "00149cfad00d405130ea4e8a4d5d381a5c8a4642fa2e",
    "P2WPKH address"
  );
  eq(
    bufToHex(
      addressToPkScript(
        "bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak"
      )
    ),
    "0020cdbf909e935c855d3e8d1b61aeb9c5e3c03ae8021b286839b1a72f2e48fdba70",
    "P2WSH address"
  );
});
