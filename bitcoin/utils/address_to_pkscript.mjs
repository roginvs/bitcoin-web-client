import { sha256 } from "../my-hashes/sha256.mjs";
import { describe, eq } from "../tests.mjs";
import { bufToHex } from "./arraybuffer-hex.mjs";
import { base58decode } from "./base58.mjs";
import { decode } from "./bech32/segwit_addr.mjs";

/**
 *
 * @param {string} addr
 * @returns {import("../protocol/messages.types").PkScript}
 */
export function addressToPkScript(addr) {
  if (addr.startsWith("bc1")) {
    const decoded = decode("bc", addr);
    if (!decoded) {
      throw new Error(`Failed to decode!`);
    }

    let version;
    if (decoded.version === 0) {
      if (decoded.program.length !== 32 && decoded.program.length !== 20) {
        throw new Error(`Wrong length ${decoded.program.length} for version 0`);
      }
      version = 0x0;
    } else if (decoded.version === 1) {
      if (decoded.program.length !== 32) {
        throw new Error(`Wrong length ${decoded.program.length} for version 1`);
      }
      version = 0x51;
    } else {
      throw new Error(`Unknown version ${decoded.version}`);
    }
    const buf = /** @type {import("../protocol/messages.types").PkScript} */ (
      new Uint8Array([version, decoded.program.length, ...decoded.program])
        .buffer
    );
    return buf;
  } else if (addr.startsWith("1") || addr.startsWith("3")) {
    const buf = base58decode(addr);
    const withNetId = buf.slice(0, buf.byteLength - 4);
    const checksum = buf.slice(buf.byteLength - 4);
    const hash = sha256(sha256(withNetId)).slice(0, 4);
    if (bufToHex(checksum) !== bufToHex(hash)) {
      throw new Error(`Checksum verification failed`);
    }

    const data = withNetId.slice(1);

    if (addr.startsWith("1")) {
      if (new Uint8Array(withNetId)[0] !== 0) {
        throw new Error(`Not a mainnet address!`);
      }

      if (data.byteLength !== 0x14) {
        throw new Error(`Wrong data length`);
      }
      return /** @type {import("../protocol/messages.types").PkScript} */ (
        new Uint8Array([0x76, 0xa9, 0x14, ...new Uint8Array(data), 0x88, 0xac])
          .buffer
      );
    } else {
      if (new Uint8Array(withNetId)[0] !== 5) {
        throw new Error(`Not a mainnet address!`);
      }

      if (data.byteLength !== 0x14) {
        throw new Error(`Wrong data length`);
      }
      return /** @type {import("../protocol/messages.types").PkScript} */ (
        new Uint8Array([0xa9, 0x14, ...new Uint8Array(data), 0x87]).buffer
      );
    }
  }

  throw new Error(`Not implemented yet!`);
}

describe(`addressToPkScript`, () => {
  eq(
    bufToHex(addressToPkScript("bc1qnnadqr2q2ycw5n52f4wnsxju3fry973wvewf6q")),
    "00149cfad00d405130ea4e8a4d5d381a5c8a4642fa2e",
    "P2WPKH"
  );
  eq(
    bufToHex(
      addressToPkScript(
        "bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak"
      )
    ),
    "0020cdbf909e935c855d3e8d1b61aeb9c5e3c03ae8021b286839b1a72f2e48fdba70",
    "P2WSH"
  );
  eq(
    bufToHex(addressToPkScript("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")),
    "76a91477bff20c60e522dfaa3350c39b030a5d004e839a88ac",
    "P2PKH"
  );

  eq(
    bufToHex(addressToPkScript("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")),
    "a914b472a266d0bd89c13706a4132ccfb16f7c3b9fcb87",
    "P2SH"
  );

  eq(
    bufToHex(
      addressToPkScript(
        "bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297"
      )
    ),
    "5120a37c3903c8d0db6512e2b40b0dffa05e5a3ab73603ce8c9c4b7771e5412328f9",
    "P2TR"
  );
});
