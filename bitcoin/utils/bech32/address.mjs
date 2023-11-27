import { ripemd160 } from "../../my-hashes/ripemd160.mjs";
import { sha256 } from "../../my-hashes/sha256.mjs";
import { describe, eq } from "../../tests.mjs";
import { parseHexToBuf } from "../arraybuffer-hex.mjs";
import { checkPublicKey } from "../checkPublicKey.mjs";
import { parsePrefixedWif } from "../wif.mjs";
import { encode } from "./segwit_addr.mjs";

/**
 * @param {ArrayBuffer} pubKey
 * @param {ReturnType<typeof parsePrefixedWif>['type']} type
 */
export function get_bitcoin_address(pubKey, type) {
  checkPublicKey(pubKey);
  if (type === "p2wpkh") {
    const hash = ripemd160(sha256(pubKey));
    return encode("bc", 0, [...new Uint8Array(hash)]);
  } else if (type === "p2tr") {
    if (pubKey.byteLength === 33) {
      return encode("bc", 1, [...new Uint8Array(pubKey.slice(1))]);
    } else if (pubKey.byteLength === 65) {
      return encode("bc", 1, [...new Uint8Array(pubKey.slice(1, 33))]);
    } else {
      throw new Error(`Wrong public key`);
    }
  } else {
    throw new Error(`Unknown type "${type}"`);
  }
}

describe("get_bitcoin_address", () => {
  eq(
    get_bitcoin_address(
      parseHexToBuf(
        "02a37c3903c8d0db6512e2b40b0dffa05e5a3ab73603ce8c9c4b7771e5412328f9"
      ),
      "p2tr"
    ),
    "bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297"
  );
});

/**
 *
 * @param {import("../../protocol/messages.types").PkScript} pkscript
 */
export function bitcoin_address_P2WSH_from_pk_script(pkscript) {
  const scriptHash = sha256(pkscript);
  return encode("bc", 0, [...new Uint8Array(scriptHash)]);
}

/**
 * This is what you should store in the outpoint
 * @param {import("../../protocol/messages.types").PkScript} pkscript
 * @returns {import("../../protocol/messages.types").PkScript}
 *
 */
export function get_P2WSH_pk_script_from_real_pk_script(pkscript) {
  const scriptHash = sha256(pkscript);
  return /** @type {import("../../protocol/messages.types").PkScript} */ (
    new Uint8Array([0x00, 0x20, ...new Uint8Array(scriptHash)]).buffer
  );
}

/**
 * This is what you should store in the outpoint/
 * If you want to use P2SH + P2WPKH then do not forget that script code
 *   must be in sigScript stack, not sigScript itself. Just prepend it with 0x16 (check BIP-0141)
 *
 * @param {ArrayBuffer} publicKey
 * @returns {import("../../protocol/messages.types").PkScript}
 *
 */
export function get_P2WPKH_pk_script_from_public_key(publicKey) {
  const hash = ripemd160(sha256(publicKey));
  return /** @type {import("../../protocol/messages.types").PkScript} */ (
    new Uint8Array([0x00, 0x14, ...new Uint8Array(hash)]).buffer
  );
}

/** Creates a script with this public key
 *
 * @param {ArrayBuffer} pubKey
 */
export function bitcoin_address_P2WSH_from_public_key(pubKey) {
  checkPublicKey(pubKey);
  const script = new Uint8Array([
    pubKey.byteLength, // Push script to stack
    ...new Uint8Array(pubKey),
    0xac, // OP_CHECKSIG
  ]);
  return bitcoin_address_P2WSH_from_pk_script(
    /** @type {import("../../protocol/messages.types").PkScript} */ (
      script.buffer
    )
  );
}
