import { sha256 } from "../my-hashes/sha256.mjs";
import { describe, eq } from "../tests.mjs";
import { bufToHex } from "./arraybuffer-hex.mjs";
import { base58decode } from "./base58.mjs";
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
  } else if (addr.startsWith("1")) {
    const buf = base58decode(addr);
    const withNetId = buf.slice(0, buf.byteLength - 4);
    const checksum = buf.slice(buf.byteLength - 4);
    const hash = sha256(sha256(withNetId)).slice(0, 4);
    if (bufToHex(checksum) !== bufToHex(hash)) {
      throw new Error(`Checksum verification failed`);
    }
    if (new Uint8Array(withNetId)[0] !== 0) {
      throw new Error(`Not a mainnet address!`);
    }
    const data = withNetId.slice(1);
    if (data.byteLength !== 0x14) {
      throw new Error(`Wrong data length`);
    }
    return new Uint8Array([
      0x76,
      0xa9,
      0x14,
      ...new Uint8Array(data),
      0x88,
      0xac,
    ]);
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
  eq(
    bufToHex(addressToPkScript("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")),
    "76a91477bff20c60e522dfaa3350c39b030a5d004e839a88ac",
    "P2PKH"
  );
});
