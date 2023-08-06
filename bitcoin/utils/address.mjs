import { double_sha256 } from "../my-hashes/sha256.mjs";
import { base58encode } from "./base58.mjs";
import { joinBuffers } from "./joinBuffers.mjs";

/**
 *
 * @param {ArrayBuffer} data
 * @param { 0 | 5} networkType
 */
export function bitcoinAddressFromData(data, networkType) {
  const withNetworkId = joinBuffers(
    new Uint8Array([networkType]),
    new Uint8Array(data)
  );
  const hash = double_sha256(withNetworkId);

  const base256 = joinBuffers(withNetworkId, new Uint8Array(hash.slice(0, 4)));
  return base58encode(base256);
}
