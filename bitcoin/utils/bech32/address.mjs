import { ripemd160 } from "../../my-hashes/ripemd160.mjs";
import { sha256 } from "../../my-hashes/sha256.mjs";
import { checkPublicKey } from "../checkPublicKey.mjs";
import { encode } from "./segwit_addr.mjs";

/**
 * @todo Import type!
 * @typedef {ArrayBuffer} PkScript
 */

/**
 * @param {ArrayBuffer} pubKey
 */
export function bitcoin_address_P2WPKH_from_public_key(pubKey) {
  checkPublicKey(pubKey);
  const hash = ripemd160(sha256(pubKey));
  return encode("bc", 0, [...new Uint8Array(hash)]);
}

/**
 * 
 * @param {PkScript} pkscript 
 
 */
export function bitcoin_address_P2WSH_from_pk_script(pkscript) {
  const scriptHash = sha256(pkscript);
  return encode("bc", 0, [...new Uint8Array(scriptHash)]);
}

/**
 * This is what you should store in the outpoint
 * @param {PkScript} pkscript
 * @returns {PkScript}
 *
 */
export function get_P2WSH_pk_script_from_real_pk_script(pkscript) {
  const scriptHash = sha256(pkscript);
  return new Uint8Array([0x00, 0x20, ...new Uint8Array(scriptHash)]).buffer;
}

/**
 * This is what you should store in the outpoint/
 * If you want to use P2SH + P2WPKH then do not forget that script code
 *   must be in sigScript stack, not sigScript itself. Just prepend it with 0x16 (check BIP-0141)
 *
 * @param {ArrayBuffer} publicKey
 * @returns {PkScript}
 *
 */
export function get_P2WPKH_pk_script_from_public_key(publicKey) {
  const hash = ripemd160(sha256(publicKey));
  return new Uint8Array([0x00, 0x14, ...new Uint8Array(hash)]).buffer;
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
  return bitcoin_address_P2WSH_from_pk_script(script);
}
